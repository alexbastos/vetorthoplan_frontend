import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type AppStageProps = {
  children: ReactNode
  className?: string
}

/** Superfície de conteúdo livre de cada rota autenticada. */
function AppStage({ children, className }: AppStageProps) {
  return (
    <main
      className={cn(
        "mt-[var(--layout-stage-gap-top)] min-h-0 flex-1 rounded-tl-[var(--layout-stage-radius-top-left)] bg-capta-surface-stage shadow-[var(--shadow-stage)]",
        className,
      )}
    >
      {children}
    </main>
  )
}

export { AppStage }
export type { AppStageProps }
