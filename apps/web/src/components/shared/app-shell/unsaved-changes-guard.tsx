"use client"

import { AlignLeft, ArrowRight, Building2, CalendarDays, FilePenLine, Globe2, Map, MapPin, MapPinned, Phone, UserRound, X, type LucideIcon } from "lucide-react"
import { AlertDialog } from "radix-ui"
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"

type UnsavedChangesHandler = {
  discardChanges: () => void
  getUnsavedChanges: () => UnsavedChange[]
  hasUnsavedChanges: () => boolean
}

type UnsavedChange = {
  field: string
  label: string
  previousValue: string
  value: string
}

type UnsavedChangesContextValue = {
  registerUnsavedChangesHandler: (handler: UnsavedChangesHandler) => () => void
  requestNavigation: (navigate: () => void) => boolean
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null)
const MAX_VISIBLE_CHANGES = 3

const unsavedChangeIcons: Record<string, LucideIcon> = {
  bio: AlignLeft,
  birthDate: CalendarDays,
  city: Building2,
  country: Globe2,
  locale: Globe2,
  name: UserRound,
  phone: Phone,
  state: Map,
  street: MapPinned,
  timezone: MapPin,
  zipCode: MapPin,
}

function UnsavedChangesGuard({ children }: { children: ReactNode }) {
  const t = useTranslations("common.unsavedChanges")
  const tStatus = useTranslations("common.status")
  const handlersRef = useRef(new Set<UnsavedChangesHandler>())
  const pendingHandlerRef = useRef<UnsavedChangesHandler | null>(null)
  const pendingNavigationRef = useRef<(() => void) | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isChangesExpanded, setIsChangesExpanded] = useState(false)

  const registerUnsavedChangesHandler = useCallback((handler: UnsavedChangesHandler) => {
    handlersRef.current.add(handler)

    return () => {
      handlersRef.current.delete(handler)
    }
  }, [])

  const requestNavigation = useCallback((navigate: () => void) => {
    const handler = Array.from(handlersRef.current).find((registeredHandler) => registeredHandler.hasUnsavedChanges())

    if (handler) {
      pendingHandlerRef.current = handler
      pendingNavigationRef.current = navigate
      setIsChangesExpanded(false)
      setIsDialogOpen(true)
      return false
    }

    navigate()
    return true
  }, [])

  function cancelNavigation() {
    pendingHandlerRef.current = null
    pendingNavigationRef.current = null
    setIsDialogOpen(false)
  }

  function discardChangesAndNavigate() {
    const navigate = pendingNavigationRef.current

    pendingHandlerRef.current?.discardChanges()
    pendingHandlerRef.current = null
    pendingNavigationRef.current = null
    setIsDialogOpen(false)
    navigate?.()
  }

  const changes = pendingHandlerRef.current?.getUnsavedChanges() ?? []
  const hiddenChangesCount = Math.max(changes.length - MAX_VISIBLE_CHANGES, 0)
  const visibleChanges = isChangesExpanded ? changes : changes.slice(0, MAX_VISIBLE_CHANGES)

  return (
    <UnsavedChangesContext.Provider value={{ registerUnsavedChangesHandler, requestNavigation }}>
      {children}

      <AlertDialog.Root onOpenChange={(open) => !open && cancelNavigation()} open={isDialogOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/20 motion-safe:animate-in motion-safe:fade-in-0" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[var(--card-composite-radius)] border border-[var(--card-composite-border)] bg-[var(--card-composite-surface)] shadow-[var(--card-composite-shadow-footer)] outline-none motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95">
            <header className="flex min-h-[var(--card-header-min-height)] items-center justify-between gap-4 bg-[var(--color-surface-raised)] px-[var(--card-composite-padding-inline)] py-[var(--card-header-padding-block)]">
              <div>
                <AlertDialog.Title className="font-semibold text-ui text-capta-text-primary">{t("title")}</AlertDialog.Title>
                <AlertDialog.Description className="mt-1 text-ui text-capta-text-secondary">{t("description")}</AlertDialog.Description>
              </div>
              <AlertDialog.Cancel asChild>
                <button aria-label={t("continueEditing")} className="motion-interactive -mr-2 flex size-9 cursor-pointer items-center justify-center rounded-[var(--radius-token-md)] text-capta-text-secondary outline-none hover:bg-capta-surface-subtle hover:text-capta-text-primary focus-visible:ring-2 focus-visible:ring-capta-border-focus" onClick={cancelNavigation} type="button">
                  <X aria-hidden="true" className="size-4" />
                </button>
              </AlertDialog.Cancel>
            </header>

            <div className="relative z-10 -my-px overflow-hidden rounded-[var(--card-composite-radius)] border border-[var(--card-composite-border)] bg-[var(--color-surface-card)]">
              <div className="px-5 py-6 sm:px-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-caption font-medium tracking-[0.08em] text-capta-text-muted uppercase">{t("preview")}</p>
                  {hiddenChangesCount > 0 ? (
                    <button
                      aria-expanded={isChangesExpanded}
                      className="motion-interactive cursor-pointer rounded-[var(--radius-token-sm)] px-1.5 py-1 text-caption font-medium text-capta-text-secondary outline-none hover:bg-capta-surface-subtle hover:text-capta-text-primary focus-visible:ring-2 focus-visible:ring-capta-border-focus"
                      onClick={() => setIsChangesExpanded((expanded) => !expanded)}
                      type="button"
                    >
                      {isChangesExpanded
                        ? t("showLess")
                        : t("showMore", { count: hiddenChangesCount })}
                    </button>
                  ) : null}
                </div>
                <p className="mt-1 text-ui text-capta-text-secondary">{t("restoreDescription")}</p>

                <dl className="relative mt-4 space-y-4 before:absolute before:top-4 before:bottom-4 before:left-4 before:w-px before:bg-[var(--card-composite-border)]">
                  {visibleChanges.map((change) => (
                    <div className="relative flex items-center gap-3" key={change.label}>
                      <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-capta-border-default bg-capta-surface-card text-capta-text-secondary">
                        <UnsavedChangeIcon field={change.field} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <dt className="text-caption text-capta-text-muted">{change.label}</dt>
                        <dd className="mt-1.5 flex flex-wrap items-center gap-2 text-ui" title={t("changeTitle", { previousValue: change.previousValue, value: change.value })}>
                          <span className="text-capta-text-muted">{change.previousValue || tStatus("noInformation")}</span>
                          <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-capta-text-muted" />
                          <span className="font-semibold text-capta-text-primary">{change.value || tStatus("noInformation")}</span>
                        </dd>
                      </div>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            <footer className="flex min-h-[var(--card-footer-min-height)] flex-col-reverse gap-3 bg-[var(--color-surface-raised)] px-[var(--card-composite-padding-inline)] py-[var(--card-footer-padding-block)] sm:flex-row sm:items-center sm:justify-end">
              <AlertDialog.Cancel asChild>
                <Button onClick={cancelNavigation} size="sm" type="button" variant="secondary">
                  {t("continueEditing")}
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button onClick={discardChangesAndNavigate} size="sm" type="button" variant="danger">
                  {t("discard")}
                </Button>
              </AlertDialog.Action>
            </footer>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </UnsavedChangesContext.Provider>
  )
}

function UnsavedChangeIcon({ field }: { field: string }) {
  const Icon = unsavedChangeIcons[field] ?? FilePenLine

  return <Icon aria-hidden="true" className="size-4" />
}

function useUnsavedChangesGuard() {
  const context = useContext(UnsavedChangesContext)

  if (!context) {
    throw new Error("useUnsavedChangesGuard deve ser usado dentro de UnsavedChangesGuard.")
  }

  return context
}

export { UnsavedChangesGuard, useUnsavedChangesGuard }
export type { UnsavedChange }
