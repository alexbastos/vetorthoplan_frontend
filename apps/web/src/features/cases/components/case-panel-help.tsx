"use client"

import { CircleHelp } from "lucide-react"
import { useState, type ReactNode } from "react"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { viewerTooltipProps } from "./viewer-tool-action"

function CasePanelHelp({ label, children, className, portalContainer }: {
  label: string; children: ReactNode; className?: string; portalContainer?: HTMLElement | null
}) {
  const [open, setOpen] = useState(false)
  const { delayDuration, ...viewerProps } = viewerTooltipProps(portalContainer ?? null)

  return <TooltipProvider delayDuration={portalContainer ? delayDuration : 200} skipDelayDuration={0}>
    <Tooltip onOpenChange={setOpen} open={open}>
      <TooltipTrigger asChild>
        <button aria-label={label}
          className={cn("inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-token-md)] text-description outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring", className)}
          onClick={event => { event.preventDefault(); setOpen(current => !current) }} type="button">
          <CircleHelp aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
        </button>
      </TooltipTrigger>
      <TooltipContent {...(portalContainer ? viewerProps : { side: "right" })}
        className={cn(portalContainer && viewerProps.className, "max-w-[min(18rem,calc(100vw-2rem))]")}>
        <div className="min-w-0 space-y-1">{children}</div>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
}

export { CasePanelHelp }
