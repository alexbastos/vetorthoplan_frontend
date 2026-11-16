import type { PendingCirclePlacement } from "../lib/circle-placement"
import type { ImagePoint } from "../types/case-workspace"

function ViewerCirclePlacementOverlay({ placement, cursor, handleRadius }: {
  placement: PendingCirclePlacement; cursor: ImagePoint | null; handleRadius: number
}) {
  const center = placement.step === "edge" ? placement.center : null
  const radius = center && cursor ? Math.hypot(cursor.x - center.x, cursor.y - center.y) : 0

  return <g data-circle-placement={placement.step} fill="none" stroke="var(--radiograph-mark-interest)" strokeWidth={handleRadius / 2}>
    {center && radius > 0 ? <circle cx={center.x} cy={center.y} r={radius} strokeWidth="var(--radiograph-circle-stroke-width)" vectorEffect="non-scaling-stroke" strokeDasharray={`${handleRadius * 1.5} ${handleRadius}`} /> : null}
    {center ? <circle cx={center.x} cy={center.y} r={handleRadius} fill="var(--radiograph-mark-interest)" /> : null}
    {cursor ? <circle cx={cursor.x} cy={cursor.y} r={handleRadius * 1.5} opacity={0.65} /> : null}
  </g>
}

export { ViewerCirclePlacementOverlay }
