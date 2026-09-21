import { cn } from "@/lib/utils"

type LandingSectionFrameProps = {
  className?: string
  fade?: boolean
}

function LandingSectionFrame({ className, fade = true }: LandingSectionFrameProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-y-0 left-1/2 z-0 w-[calc(100%-2px)] max-w-[var(--layout-landing-max-width)] -translate-x-1/2 border-x border-[var(--landing-grid-border)]",
        fade && "[mask-image:linear-gradient(transparent,black)]",
        className,
      )}
    />
  )
}

export { LandingSectionFrame }
export type { LandingSectionFrameProps }
