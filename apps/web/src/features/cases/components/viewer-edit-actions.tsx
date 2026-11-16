"use client"

import { Check, RefreshCw, X } from "lucide-react"
import type { ComponentPropsWithoutRef } from "react"

import { cn } from "@/lib/utils"
import { VIEWER_TOOLBAR_CLASS_NAME } from "./viewer-toolbar"
import { useViewerBoundary, ViewerToolAction } from "./viewer-tool-action"

type EditAction = {
  label: string
  description?: string
  disabled: boolean
  onClick: () => void
}

type ViewerEditActionsProps = Omit<ComponentPropsWithoutRef<"section">, "className" | "aria-label" | "aria-busy"> & {
  label: string
  pending: boolean
  cancel: EditAction | null
  confirm: EditAction & {
    icon: "check" | "refresh"
    ariaDisabled?: boolean
    tone?: "save" | "cancel"
  }
}

function ViewerEditActions({ label, pending, cancel, confirm, children, ...props }: ViewerEditActionsProps) {
  const { boundary, ref } = useViewerBoundary()

  return <section {...props} aria-label={label} aria-busy={pending}
    className={cn(VIEWER_TOOLBAR_CLASS_NAME, "gap-0.5 p-0.5")} ref={ref}>
    {children}
    {cancel ? <ViewerToolAction boundary={boundary} size="compact" tone="cancel" {...cancel}>
      <X aria-hidden="true" />
    </ViewerToolAction> : null}
    <ViewerToolAction boundary={boundary} size="compact" tone={confirm.tone ?? "save"}
      label={confirm.label} description={confirm.description} disabled={confirm.disabled} ariaDisabled={confirm.ariaDisabled}
      loading={pending} onClick={confirm.onClick}>
      {confirm.icon === "refresh" ? <RefreshCw aria-hidden="true" /> : <Check aria-hidden="true" />}
    </ViewerToolAction>
    <span aria-live="polite" className="sr-only">{pending ? confirm.label : null}</span>
  </section>
}

export { ViewerEditActions }
