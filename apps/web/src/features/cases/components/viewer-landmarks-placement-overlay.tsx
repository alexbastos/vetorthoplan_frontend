import type { ImagePoint } from "../types/case-workspace"
import { LANDMARK_POINT_NAMES, type LandmarksPointName } from "../lib/landmarks-editor"
import type { LandmarksPlacementState } from "../lib/landmarks-placement"

const LANDMARK_SEGMENTS = [
  ["plateau_cranial", "plateau_caudal", "plateau"] as const,
  ["intercondylar_midpoint", "talus_center", "mechanical-axis"] as const,
]

function isFinitePoint(point: ImagePoint | undefined): point is ImagePoint {
  return Boolean(point) && Number.isFinite(point?.x) && Number.isFinite(point?.y)
}

function ViewerLandmarksPlacementOverlay({ placement, cursor, handleRadius, mirrored = false }: {
  placement: LandmarksPlacementState
  cursor: ImagePoint | null
  handleRadius: number
  mirrored?: boolean
}) {
  if (!Number.isFinite(handleRadius) || handleRadius <= 0) return null

  const points = new Map<LandmarksPointName, ImagePoint>()
  for (const name of LANDMARK_POINT_NAMES) {
    const point = placement.landmarks[name]
    if (isFinitePoint(point)) points.set(name, point)
  }
  const provisional = cursor && isFinitePoint(cursor) ? cursor : null
  if (points.size === 0 && !provisional) return null

  const previewPair = LANDMARK_SEGMENTS.find(([start, end]) => placement.activePoint === start || placement.activePoint === end)
  const counterpartName = previewPair
    ? placement.activePoint === previewPair[0] ? previewPair[1] : previewPair[0]
    : null
  const counterpart = counterpartName ? points.get(counterpartName) : undefined
  const strokeWidth = handleRadius / 2

  function numberLabel(point: ImagePoint, pointName: LandmarksPointName) {
    const index = LANDMARK_POINT_NAMES.indexOf(pointName)
    const direction = mirrored ? -1 : 1
    const offsetX = (index < 2 ? 2.5 : -2.5) * handleRadius * direction
    const offsetY = (index === 0 || index === 3 ? 2.5 : -2.5) * handleRadius
    return <g transform={`translate(${point.x + offsetX} ${point.y + offsetY}) scale(${direction} 1)`}>
      <text className="font-data" fill="var(--radiograph-mark-anatomy)" fontSize={handleRadius * 3.3}
        textAnchor="middle" dominantBaseline="central">{index + 1}</text>
    </g>
  }

  return <g data-landmarks-placement-overlay>
    <g fill="none" stroke="var(--radiograph-mark-anatomy)" strokeWidth={strokeWidth} strokeLinecap="round">
      {LANDMARK_SEGMENTS.map(([start, end, segment]) => {
        const first = points.get(start), second = points.get(end)
        return first && second ? <line key={segment} data-landmarks-segment={segment}
          x1={first.x} y1={first.y} x2={second.x} y2={second.y} /> : null
      })}
      {provisional && counterpart ? <line data-landmarks-placement-preview-segment="true"
        x1={provisional.x} y1={provisional.y} x2={counterpart.x} y2={counterpart.y}
        strokeDasharray={`${handleRadius * 1.5} ${handleRadius}`} /> : null}
    </g>
    {LANDMARK_POINT_NAMES.map(name => {
      const point = points.get(name)
      if (!point) return null
      const labelPoint = provisional && name === placement.activePoint ? provisional : point
      return <g key={name} data-landmarks-point={name}>
        <circle cx={point.x} cy={point.y} r={handleRadius} fill="var(--radiograph-mark-anatomy)" />
        {numberLabel(labelPoint, name)}
      </g>
    })}
    {provisional ? <g data-landmarks-placement-cursor={placement.activePoint}>
      <circle cx={provisional.x} cy={provisional.y} r={handleRadius * 1.5} fill="none"
        stroke="var(--radiograph-mark-anatomy)" strokeWidth={strokeWidth} opacity={0.65} />
      {!points.has(placement.activePoint) ? numberLabel(provisional, placement.activePoint) : null}
    </g> : null}
  </g>
}

export { ViewerLandmarksPlacementOverlay }
