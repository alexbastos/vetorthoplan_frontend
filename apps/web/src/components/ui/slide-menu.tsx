"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"

import { cn } from "@/lib/utils"

type SlideMenuItem = {
  children?: SlideMenuItem[]
  className?: string
  disabled?: boolean
  href?: string
  icon?: ReactNode
  id: string
  label: string
  onSelect?: (item: SlideMenuItem) => void
  rel?: string
  separatorBefore?: boolean
  target?: React.HTMLAttributeAnchorTarget
  variant?: "default" | "destructive"
}

type SlideMenuProps = {
  backLabel?: string
  className?: string
  defaultPath?: string[]
  hideScrollbar?: boolean
  itemClassName?: string
  items: SlideMenuItem[]
  maxHeight?: CSSProperties["maxHeight"]
  onItemSelect?: (item: SlideMenuItem) => void
  onPathChange?: (path: string[]) => void
  path?: string[]
  rootLabel?: string
  springBounce?: number
  springDuration?: number
  springEase?: CSSProperties["transitionTimingFunction"]
}

const DEFAULT_EASE = "cubic-bezier(0.23, 1, 0.32, 1)"

function SlideMenu({
  backLabel = "Voltar para",
  className,
  defaultPath = [],
  hideScrollbar = false,
  itemClassName,
  items,
  maxHeight = "min(32rem, calc(100dvh - 2rem))",
  onItemSelect,
  onPathChange,
  path,
  rootLabel = "menu principal",
  springBounce = 0,
  springDuration = 0.28,
  springEase = DEFAULT_EASE,
}: SlideMenuProps) {
  const menuId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const [uncontrolledPath, setUncontrolledPath] = useState(() => normalizePath(defaultPath, items))
  const [direction, setDirection] = useState<"backward" | "forward">("forward")
  const [shouldFocusFirstControl, setShouldFocusFirstControl] = useState(false)
  const activePath = normalizePath(path ?? uncontrolledPath, items)
  const level = useMemo(() => getMenuLevel(items, activePath), [activePath, items])
  const transitionStyle = {
    "--slide-menu-duration": `${springDuration}s`,
    "--slide-menu-ease": springEase,
    "--slide-menu-overshoot": String(Math.max(0, springBounce)),
  } as CSSProperties

  useEffect(() => {
    if (!shouldFocusFirstControl) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("[data-slide-menu-control]:not([disabled])")?.focus()
      setShouldFocusFirstControl(false)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [activePath, shouldFocusFirstControl])

  function updatePath(nextPath: string[], nextDirection: "backward" | "forward", focusFirstControl = false) {
    const normalizedPath = normalizePath(nextPath, items)

    setDirection(nextDirection)
    setShouldFocusFirstControl(focusFirstControl)
    if (path === undefined) {
      setUncontrolledPath(normalizedPath)
    }
    onPathChange?.(normalizedPath)
  }

  function openCategory(item: SlideMenuItem, focusFirstControl = false) {
    if (item.disabled || !item.children?.length) {
      return
    }

    updatePath([...activePath, item.id], "forward", focusFirstControl)
  }

  function returnToPreviousLevel(focusFirstControl = false) {
    if (activePath.length === 0) {
      return
    }

    updatePath(activePath.slice(0, -1), "backward", focusFirstControl)
  }

  function selectLeaf(item: SlideMenuItem) {
    if (item.disabled || item.children?.length) {
      return
    }

    item.onSelect?.(item)
    onItemSelect?.(item)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    const controls = Array.from(panelRef.current?.querySelectorAll<HTMLElement>("[data-slide-menu-control]:not([disabled])") ?? [])
    const currentIndex = controls.indexOf(document.activeElement as HTMLElement)

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (controls.length === 0) {
        return
      }

      event.preventDefault()
      const offset = event.key === "ArrowDown" ? 1 : -1
      controls[(currentIndex + offset + controls.length) % controls.length]?.focus()
      return
    }

    const itemId = (document.activeElement as HTMLElement | null)?.dataset.slideMenuItemId
    const focusedItem = itemId ? level.items.find((item) => item.id === itemId) : undefined

    if (event.key === "ArrowRight" && focusedItem?.children?.length) {
      event.preventDefault()
      openCategory(focusedItem, true)
      return
    }

    if ((event.key === "ArrowLeft" || event.key === "Escape") && activePath.length > 0) {
      event.preventDefault()
      returnToPreviousLevel(true)
    }
  }

  return (
    <nav aria-label={rootLabel} className={cn("overflow-hidden", className)} onKeyDown={handleKeyDown} style={{ maxHeight }}>
      <div
        ref={panelRef}
        className={cn(
          "overflow-x-hidden overflow-y-auto",
          hideScrollbar && "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
        style={{ ...transitionStyle, maxHeight }}
      >
        <div
          key={activePath.join("/") || "root"}
          className={cn(
            "slide-menu-panel px-2.5 py-2.5",
            direction === "forward" ? "slide-menu-panel-forward" : "slide-menu-panel-backward",
          )}
        >
          {level.parent ? (
            <button
              aria-label={`${backLabel} ${level.previousLabel ?? rootLabel}`}
              className="motion-interactive mb-1 flex h-9 w-full cursor-pointer items-center gap-2 rounded-[var(--radius-token-md)] px-2 text-left text-ui-semibold text-capta-text-primary outline-none hover:bg-capta-surface-subtle focus-visible:ring-2 focus-visible:ring-capta-border-focus"
              data-slide-menu-control
              onClick={() => returnToPreviousLevel()}
              type="button"
            >
              <span className="flex size-5 items-center justify-center rounded-[var(--radius-token-sm)] text-capta-text-secondary">
                <ChevronLeft aria-hidden="true" className="size-4" />
              </span>
              {level.parent.icon ? <span className="flex size-5 items-center justify-center">{level.parent.icon}</span> : null}
              <span className="truncate">{level.parent.label}</span>
            </button>
          ) : null}

          <ul aria-label={level.parent?.label ?? rootLabel} className={cn("space-y-1", level.parent ? "pl-3" : undefined)} id={menuId} role="menu">
            {level.items.map((item) => {
              const hasChildren = Boolean(item.children?.length)
              const itemClassNames = cn(
                "group/slide-menu-item motion-interactive flex min-h-10 w-full items-center gap-3 rounded-[var(--radius-token-md)] px-3 text-left text-ui font-medium outline-none transition-colors duration-75",
                item.variant === "destructive"
                  ? "text-capta-feedback-error hover:bg-red-50 focus-visible:bg-red-50"
                  : "text-capta-text-primary hover:bg-capta-surface-subtle focus-visible:bg-capta-surface-subtle",
                item.disabled && "cursor-not-allowed opacity-45",
                !item.disabled && "cursor-pointer",
                itemClassName,
                item.className,
              )

              const content = (
                <>
                  {item.icon ? <span className="flex size-5 shrink-0 items-center justify-center text-capta-text-secondary transition-colors duration-75 group-hover/slide-menu-item:text-capta-text-primary">{item.icon}</span> : <span className="size-5" />}
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {hasChildren ? <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-capta-text-secondary transition-colors duration-75 group-hover/slide-menu-item:text-capta-text-primary" /> : null}
                </>
              )

              if (item.href && !hasChildren) {
                return (
                  <li className={item.separatorBefore ? "mt-3 border-t border-capta-border-default pt-3" : undefined} key={item.id} role="none">
                    <a
                      aria-disabled={item.disabled || undefined}
                      className={itemClassNames}
                      data-slide-menu-control
                      data-slide-menu-item-id={item.id}
                      href={item.disabled ? undefined : item.href}
                      onClick={() => selectLeaf(item)}
                      rel={item.rel}
                      role="menuitem"
                      target={item.target}
                    >
                      {content}
                    </a>
                  </li>
                )
              }

              return (
                <li className={item.separatorBefore ? "mt-3 border-t border-capta-border-default pt-3" : undefined} key={item.id} role="none">
                  <button
                    aria-haspopup={hasChildren ? "menu" : undefined}
                    className={itemClassNames}
                    data-slide-menu-control
                    data-slide-menu-item-id={item.id}
                    disabled={item.disabled}
                    onClick={() => (hasChildren ? openCategory(item) : selectLeaf(item))}
                    role="menuitem"
                    type="button"
                  >
                    {content}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </nav>
  )
}

function getMenuLevel(items: SlideMenuItem[], path: string[]) {
  let currentItems = items
  let parent: SlideMenuItem | undefined
  let previousLabel: string | undefined

  for (const id of path) {
    const nextParent = currentItems.find((item) => item.id === id)
    if (!nextParent?.children?.length) {
      break
    }

    previousLabel = parent?.label
    parent = nextParent
    currentItems = nextParent.children
  }

  return { items: currentItems, parent, previousLabel }
}

function normalizePath(path: string[], items: SlideMenuItem[]): string[] {
  const normalizedPath: string[] = []
  let currentItems = items

  for (const id of path) {
    const item = currentItems.find((candidate) => candidate.id === id)
    if (!item?.children?.length) {
      break
    }

    normalizedPath.push(id)
    currentItems = item.children
  }

  return normalizedPath
}

export { SlideMenu }
export type { SlideMenuItem, SlideMenuProps }
