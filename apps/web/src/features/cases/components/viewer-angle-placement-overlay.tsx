import type { ImagePoint } from "../types/case-workspace"
import type { PendingAnglePlacement } from "../lib/angle-placement"

function ViewerAnglePlacementOverlay({ placement, cursor, handleRadius }: {
  placement: PendingAnglePlacement; cursor: ImagePoint | null; handleRadius: number
}) {
  const fixed = placement.step === "start" ? [] : placement.step === "vertex" ? [placement.start] : [placement.start, placement.vertex]
  const points = cursor ? [...fixed, cursor] : fixed
  return <g data-angle-placement={placement.step} fill="none" stroke="var(--radiograph-mark-measurement)" strokeWidth={handleRadius / 2}>
    {points.length > 1 ? <polyline points={points.map(point => `${point.x},${point.y}`).join(" ")}
      strokeDasharray={`${handleRadius * 1.5} ${handleRadius}`} /> : null}
    {fixed.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={handleRadius} fill="var(--radiograph-mark-measurement)" />)}
    {cursor ? <circle cx={cursor.x} cy={cursor.y} r={handleRadius * 1.5} opacity={0.65} /> : null}
  </g>
}

export { ViewerAnglePlacementOverlay }
