import { LANDMARK_POINT_NAMES } from "../lib/landmarks-editor"
import type { LandmarksGeometry } from "../lib/landmarks-geometry"
import type { LandmarksAdjustmentTarget, LandmarksHit } from "../lib/landmarks-interaction"
import type { ImageDimensions } from "../lib/image-point-space"

// Only the active draft. Saved result values and other measurements belong to
// their dedicated layers.
function ViewerLandmarksEditorOverlay({ geometry, editable, handleRadius, hoveredPart, focusedPart, mirrored = false, dimensions }: {
  geometry: LandmarksGeometry | null
  editable: boolean
  handleRadius: number
  hoveredPart: LandmarksHit
  focusedPart?: LandmarksAdjustmentTarget
  mirrored?: boolean
  dimensions?: ImageDimensions
}) {
  if (!geometry) return null

  const activePoint = editable
    ? hoveredPart && hoveredPart !== "body" ? hoveredPart : focusedPart
    : undefined
  return <g data-landmarks-draft fill="none">
    <g stroke="var(--radiograph-mark-anatomy)" strokeWidth={handleRadius / 2} strokeLinecap="round">
      <line data-landmarks-segment="plateau" x1={geometry.plateau_cranial.x} y1={geometry.plateau_cranial.y}
        x2={geometry.plateau_caudal.x} y2={geometry.plateau_caudal.y} />
      <line data-landmarks-segment="mechanical-axis" x1={geometry.intercondylar_midpoint.x} y1={geometry.intercondylar_midpoint.y}
        x2={geometry.talus_center.x} y2={geometry.talus_center.y} />
    </g>
    {LANDMARK_POINT_NAMES.map((key, index) => {
      const point = geometry[key]
      const offsetX = (index < 2 ? 2.5 : -2.5) * handleRadius * (mirrored ? -1 : 1)
      const offsetY = (index === 0 || index === 3 ? 2.5 : -2.5) * handleRadius
      const marginX = dimensions ? Math.min(2 * handleRadius, dimensions.widthPx / 2) : 0
      const marginY = dimensions ? Math.min(2 * handleRadius, dimensions.heightPx / 2) : 0
      const labelX = dimensions ? Math.max(marginX, Math.min(dimensions.widthPx - marginX, point.x + offsetX)) : point.x + offsetX
      const labelY = dimensions ? Math.max(marginY, Math.min(dimensions.heightPx - marginY, point.y + offsetY)) : point.y + offsetY
      return <g key={key}>
        <circle cx={point.x} cy={point.y}
          className={editable ? "transition-[r] duration-100 motion-reduce:transition-none" : undefined}
          data-landmarks-point={key} data-viewer-handle={editable ? key : undefined}
          data-landmarks-handle={editable ? key : undefined} fill="var(--radiograph-mark-anatomy)"
          r={handleRadius * (activePoint === key ? 1.75 : 1)} />
        <g transform={`translate(${labelX} ${labelY}) scale(${mirrored ? -1 : 1} 1)`}>
          <text className="font-data" fill="var(--radiograph-mark-anatomy)" fontSize={handleRadius * 2.5}
            textAnchor="middle" dominantBaseline="central">{index + 1}</text>
        </g>
      </g>
    })}
  </g>
}

export { ViewerLandmarksEditorOverlay }
