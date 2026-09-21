import type { ComponentPropsWithoutRef } from "react"

import { cn } from "@/lib/utils"

type ArchitecturalStackBracketFrameProps = ComponentPropsWithoutRef<"div">

function ArchitecturalStackCornerBrackets({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("pointer-events-none absolute inset-0", className)}>
      <span className="absolute -top-px -left-px size-2 border-t border-l border-current" />
      <span className="absolute -top-px -right-px size-2 border-t border-r border-current" />
      <span className="absolute -bottom-px -left-px size-2 border-b border-l border-current" />
      <span className="absolute -right-px -bottom-px size-2 border-r border-b border-current" />
    </span>
  )
}

function ArchitecturalStackBracketFrame({
  className,
  children,
  ...props
}: ArchitecturalStackBracketFrameProps) {
  return (
    <div
      className={cn("relative border border-dashed border-border text-foreground", className)}
      {...props}
    >
      <ArchitecturalStackCornerBrackets />
      {children}
    </div>
  )
}

export { ArchitecturalStackBracketFrame }
