import type { TploPlacement } from "../lib/tplo-placement"
import type { ImagePoint } from "../types/case-workspace"

function ViewerTploPlacementOverlay({ placement, cursor, handleRadius }: {
  placement: TploPlacement; cursor: ImagePoint | null; handleRadius: number
}) {
  const center = placement.step === "edge" ? placement.center : null
  const radius = center && cursor ? Math.hypot(cursor.x - center.x, cursor.y - center.y) : 0
  return <g data-tplo-placement={placement.step} fill="none" stroke="var(--radiograph-tplo-cut)">
    {center && radius > 0 && Number.isFinite(radius) ? <>
      <circle cx={center.x} cy={center.y} r={radius} strokeDasharray="5 4" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
      <path d={`M ${center.x} ${center.y} L ${cursor!.x} ${cursor!.y}`} strokeDasharray="2 4" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
    </> : null}
    {center ? <circle cx={center.x} cy={center.y} r={handleRadius} fill="var(--radiograph-tplo-cut)" stroke="none" /> : null}
    {cursor ? <circle cx={cursor.x} cy={cursor.y} r={handleRadius * 1.5} opacity={0.7} strokeWidth={1.25} vectorEffect="non-scaling-stroke" /> : null}
  </g>
}

export { ViewerTploPlacementOverlay }
