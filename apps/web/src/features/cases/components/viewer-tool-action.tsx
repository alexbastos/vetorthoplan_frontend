"use client"

import { useCallback, useId, useState, type ComponentProps, type KeyboardEvent, type ReactNode } from "react"

import { TooltipHint } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { ViewerButton } from "./viewer-toolbar"

type ViewerTooltipSide = ComponentProps<typeof TooltipHint>["side"]

function useViewerBoundary() {
  const [boundary, setBoundary] = useState<HTMLElement | null>(null)
  const ref = useCallback((node: HTMLElement | null) => {
    if (node) setBoundary(node.closest<HTMLElement>("[data-image-viewer]"))
  }, [])
  return { boundary, ref }
}

function viewerTooltipProps(boundary: HTMLElement | null, side: ViewerTooltipSide = "right") {
  return {
    className: "px-2 py-1 text-xs/4 shadow-sm ring-1 ring-black/15",
    collisionBoundary: boundary,
    collisionPadding: 12,
    delayDuration: 450,
    portalContainer: boundary,
    side,
    theme: "dark" as const,
  }
}

function ViewerToolAction({ boundary, label, tip = label, tipSide, description, active, disabled, ariaDisabled, loading, tone, size = "default", onClick, onFocus, onKeyDown, children, "data-distance-delete": deleteId, "data-angle-delete": angleDeleteId, "data-circle-delete": circleDeleteId, "data-landmarks-delete": landmarksDelete, "data-tplo-delete": tploDeleteId }: {
  boundary: HTMLElement | null; label: string; tip?: string; description?: string; active?: boolean; disabled?: boolean; ariaDisabled?: boolean
  loading?: boolean; tone?: "save" | "cancel"; size?: "default" | "compact"; onClick: () => void; onFocus?: () => void; onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void; children: ReactNode
  "data-distance-delete"?: string
  "data-angle-delete"?: string
  "data-circle-delete"?: string
  "data-landmarks-delete"?: boolean
  "data-tplo-delete"?: string
  tipSide?: ViewerTooltipSide
}) {
  const id = useId()
  return <>
    <TooltipHint {...viewerTooltipProps(boundary, tipSide)} content={tip}><span className="inline-flex">
      <ViewerButton label={label} aria-describedby={description ? id : undefined} active={active} aria-disabled={ariaDisabled} data-distance-delete={deleteId} data-angle-delete={angleDeleteId} data-circle-delete={circleDeleteId} data-landmarks-delete={landmarksDelete} data-tplo-delete={tploDeleteId}
        data-viewer-adjustment={onKeyDown ? true : undefined}
        className={cn(size === "compact" && "size-7 [&_svg]:size-3.5", tone === "save" ? "text-[var(--color-sage-500)]" : tone === "cancel" ? "text-[var(--color-coral-500)]" : undefined)}
        disabled={disabled} loading={loading} onClick={onClick} onFocus={onFocus} onKeyDown={onKeyDown} title="">{children}</ViewerButton>
    </span></TooltipHint>
    {description ? <span className="sr-only" id={id}>{description}</span> : null}
  </>
}

export { useViewerBoundary, ViewerToolAction, viewerTooltipProps }
