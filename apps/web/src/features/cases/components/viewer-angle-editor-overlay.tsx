import type { AngleGeometry } from "../lib/angle-geometry"
import type { AngleAdjustmentTarget, AngleHit } from "../lib/angle-interaction"

// Only the active draft. Saved angles, their values and the auxiliary arc are
// rendered by the dedicated measurement layer.
function ViewerAngleEditorOverlay({ geometry, editable, handleRadius, hoveredPart, focusedPart }: {
  geometry: AngleGeometry | null; editable: boolean; handleRadius: number; hoveredPart: AngleHit; focusedPart?: AngleAdjustmentTarget
}) {
  if (!geometry) return null
  return <g data-angle-draft fill="none" stroke="var(--radiograph-mark-measurement)" strokeWidth={handleRadius / 2}>
    <polyline points={`${geometry.start.x},${geometry.start.y} ${geometry.vertex.x},${geometry.vertex.y} ${geometry.end.x},${geometry.end.y}`}
      strokeDasharray={`${handleRadius * 1.5} ${handleRadius}`} />
    {editable ? (["start", "vertex", "end"] as const).map(key => <circle key={key} cx={geometry[key].x} cy={geometry[key].y}
      className="transition-[r] duration-100 motion-reduce:transition-none" data-viewer-handle={key} data-angle-handle={key}
      fill="var(--radiograph-mark-measurement)" r={handleRadius * ((hoveredPart && hoveredPart !== "body" ? hoveredPart : focusedPart) === key ? 1.75 : 1)} />) : null}
  </g>
}

export { ViewerAngleEditorOverlay }
