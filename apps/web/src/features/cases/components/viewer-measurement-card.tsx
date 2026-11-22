"use client"

import { Eye, EyeOff, Trash2 } from "lucide-react"
import { useId, type ComponentProps, type ReactNode } from "react"

import { TooltipHint } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { ViewerButton } from "./viewer-toolbar"
import { ViewerToolAction, viewerTooltipProps } from "./viewer-tool-action"

type MeasurementDeletion = ({ id: string; kind: "distance" | "angle" | "circle" } | { kind: "landmarks" })
  & { label: string; enabled: boolean; onRequest: () => void }

function ViewerMeasurementCard({ title, name, valueLabel, values, valueLegendAction, headerAction, boundary, deletion, children, ...attributes }: {
  title: string; name: string; valueLabel: string; values: ReactNode; boundary: HTMLElement | null
  deletion?: MeasurementDeletion | null; children: ReactNode
  valueLegendAction?: ReactNode; headerAction?: ReactNode
  "data-distance-controls"?: boolean; "data-angle-controls"?: boolean; "data-circle-controls"?: boolean
  "data-landmarks-controls"?: boolean
  "data-tplo-cut-controls"?: boolean
  "data-tplo-fragment-drawing"?: boolean
}) {
  const id = useId()
  return <section aria-labelledby={id} className="max-h-full w-56 max-w-full overflow-y-auto overscroll-contain rounded-[var(--radius-token-md)] border border-white/10 bg-[var(--color-obsidian)] text-white shadow-sm" {...attributes}>
    <header className="flex min-h-10 items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
      <h3 className="min-w-0 truncate text-xs font-medium" id={id} title={name}>{title}</h3>
      {deletion ? <ViewerToolAction boundary={boundary} size="compact" tone="cancel" label={deletion.label}
        disabled={!deletion.enabled} onClick={deletion.onRequest}
        data-distance-delete={deletion.kind === "distance" ? deletion.id : undefined}
        data-angle-delete={deletion.kind === "angle" ? deletion.id : undefined}
        data-circle-delete={deletion.kind === "circle" ? deletion.id : undefined}
        data-landmarks-delete={deletion.kind === "landmarks" ? true : undefined}><Trash2 aria-hidden="true" /></ViewerToolAction> : headerAction}
    </header>
    <ViewerMeasurementSection label={valueLabel} legendAction={valueLegendAction}>{values}</ViewerMeasurementSection>
    {children}
  </section>
}

function ViewerMeasurementSection({ label, legendAction, children }: { label: string; legendAction?: ReactNode; children: ReactNode }) {
  return <fieldset className="m-0 min-w-0 space-y-2 border-0 border-b border-solid border-white/10 px-3 py-2.5 last:border-b-0">
    <legend className="float-left mb-2 w-full font-data text-[10px] font-medium leading-4 text-white/60">
      {legendAction ? <span className="inline-flex items-center gap-1.5">{label}{legendAction}</span> : label}
    </legend>
    <div className="clear-both">{children}</div>
  </fieldset>
}

function ViewerMeasurementAction({ boundary, label, description, icon, active, className, ...props }: Omit<ComponentProps<typeof ViewerButton>, "children"> & {
  boundary: HTMLElement | null; description?: string; icon?: ReactNode
}) {
  const id = useId()
  return <>
    <TooltipHint {...viewerTooltipProps(boundary)} content={description ?? label}>
      <span className="block min-w-0">
        <ViewerButton {...props} label={label} active={active} aria-describedby={description ? id : undefined}
          data-viewer-adjustment={props.onKeyDown ? true : undefined} title=""
          className={cn("h-auto min-h-8 w-full justify-start gap-1.5 rounded-[var(--radius-token-sm)] px-2 py-1.5 text-left text-[11px] leading-4 [&_svg]:size-3.5 [&_svg]:shrink-0", className)}>
          {icon}<span>{label}</span>
        </ViewerButton>
      </span>
    </TooltipHint>
    {description ? <span className="sr-only" id={id}>{description}</span> : null}
  </>
}

function ViewerMeasurementVisibility({ boundary, label, actionLabel, visible, disabled, onToggle }: {
  boundary: HTMLElement | null; label: string; actionLabel: string; visible: boolean; disabled?: boolean; onToggle: () => void
}) {
  return <div className="flex min-h-8 items-center justify-between gap-2 px-2 text-[11px] leading-4">
    <span>{label}</span>
    <TooltipHint {...viewerTooltipProps(boundary)} content={actionLabel}>
      <span className="inline-flex">
        <ViewerButton label={actionLabel} aria-pressed={visible} disabled={disabled} onClick={onToggle} title=""
          className="size-7 [&_svg]:size-3.5">
          {visible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
        </ViewerButton>
      </span>
    </TooltipHint>
  </div>
}

export { ViewerMeasurementCard, ViewerMeasurementSection, ViewerMeasurementAction, ViewerMeasurementVisibility }
