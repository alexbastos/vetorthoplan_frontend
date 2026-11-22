"use client"

import { LoaderCircle } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

const VIEWER_TOOLBAR_CLASS_NAME = "flex max-w-full items-center gap-1 rounded-[var(--radius-token-md)] bg-[var(--color-obsidian)] p-1 text-white shadow-sm"
type ViewerContextControls = {
  anchor: { x: number; y: number } | null
  avoidPoints?: readonly { x: number; y: number }[]
  content: ReactNode
}

function ViewerButton({ active, children, disabled, loading, label, className, title, ...props }: ComponentProps<"button"> & {
  active?: boolean; label: string; loading?: boolean
}) {
  return <button aria-label={label} aria-pressed={active} aria-busy={loading || undefined} data-loading={loading || undefined}
    className={cn("flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-token-md)] text-white outline-none transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-4", active && "bg-white/20", className)}
    disabled={disabled || loading} title={title ?? label} type="button" {...props}>
    {loading ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : children}
  </button>
}

function ViewerEditorControls({ children }: { children: ReactNode }) {
  return <div className="pointer-events-none absolute inset-y-3 right-3 left-3 z-20 flex items-center">
    <div className="pointer-events-auto max-h-full max-w-full overflow-y-auto overscroll-contain">{children}</div>
  </div>
}

export { VIEWER_TOOLBAR_CLASS_NAME, ViewerButton, ViewerEditorControls }
export type { ViewerContextControls }
