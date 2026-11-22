import type { ImagePoint } from "../types/case-workspace"

function ViewerTploFragmentPlacementOverlay({ points, cursor, handleRadius }: {
  points: readonly ImagePoint[]; cursor: ImagePoint | null; handleRadius: number
}) {
  const last = points.at(-1)
  return <g data-tplo-fragment-placement fill="none" stroke="var(--radiograph-tplo-origin)" strokeWidth={1.25} vectorEffect="non-scaling-stroke">
    {last && cursor ? <path d={`M ${last.x} ${last.y} L ${cursor.x} ${cursor.y}`} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" /> : null}
    {cursor ? <circle data-tplo-fragment-cursor cx={cursor.x} cy={cursor.y} r={handleRadius * 1.5} opacity={0.7} vectorEffect="non-scaling-stroke" /> : null}
  </g>
}

export { ViewerTploFragmentPlacementOverlay }
