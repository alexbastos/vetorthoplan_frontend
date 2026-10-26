"use client"

import { CircleHelp } from "lucide-react"
import { Tooltip } from "radix-ui"
import { useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

function CasePanelHelp({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false)

  return <Tooltip.Provider delayDuration={200}>
    <Tooltip.Root onOpenChange={setOpen} open={open}>
      <Tooltip.Trigger asChild>
        <button aria-label={label}
          className={cn("inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-token-md)] text-description outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring", className)}
          onClick={event => { event.preventDefault(); setOpen(current => !current) }} type="button">
          <CircleHelp aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="z-50 max-w-[min(18rem,calc(100vw-2rem))] space-y-2 rounded-[var(--radius-token-md)] border border-border bg-card px-3 py-2 text-xs leading-relaxed font-normal text-foreground shadow-[var(--shadow-elevated)]"
          collisionPadding={16} side="right" sideOffset={6}>
          {children}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  </Tooltip.Provider>
}

export { CasePanelHelp }
