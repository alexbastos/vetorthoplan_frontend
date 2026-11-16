"use client"

import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

function CasePanelChoice({ active = false, label, children, className, ...props }: Omit<ComponentProps<"button">, "children"> & {
  active?: boolean; label: string; children: ReactNode
}) {
  return <button aria-pressed={active} type="button"
    className={cn("flex h-10 min-w-0 items-center justify-center gap-2 rounded-[var(--radius-token-md)] border px-2 py-1 text-[12px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-3.5 [&_svg]:shrink-0",
      active ? "border-[var(--case-progress-label-active)] bg-[var(--color-surface-selected)] text-foreground" : "border-border bg-background text-content-secondary hover:bg-muted",
      className)} {...props}>
    {children}<span className="min-w-0 text-center leading-4">{label}</span>
  </button>
}

export { CasePanelChoice }
