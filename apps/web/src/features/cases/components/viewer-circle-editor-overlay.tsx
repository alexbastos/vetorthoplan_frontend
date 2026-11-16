import type { CircleGeometry } from "../lib/circle-geometry"
import type { CircleAdjustmentTarget, CircleHit } from "../lib/circle-interaction"

function ViewerCircleEditorOverlay({ geometry, editable, handleRadius, hoveredPart, focusedPart }: {
  geometry: CircleGeometry | null; editable: boolean; handleRadius: number; hoveredPart: CircleHit; focusedPart?: CircleAdjustmentTarget
}) {
  if (!geometry) return null
  const radius = Math.hypot(geometry.edge.x - geometry.center.x, geometry.edge.y - geometry.center.y)
  if (!Number.isFinite(radius) || radius <= 0) return null
  const activeHandle = hoveredPart === "center" || hoveredPart === "edge" ? hoveredPart : focusedPart === "body" ? "center" : focusedPart

  return <g data-circle-draft fill="none" stroke="var(--radiograph-mark-interest)" strokeWidth={handleRadius / 2}>
    <circle cx={geometry.center.x} cy={geometry.center.y} r={radius} data-circle-outline
      strokeWidth="var(--radiograph-circle-stroke-width)" vectorEffect="non-scaling-stroke"
      strokeDasharray={editable ? `${handleRadius * 1.5} ${handleRadius}` : undefined} />
    {editable ? (["center", "edge"] as const).map(key => <circle key={key} cx={geometry[key].x} cy={geometry[key].y}
      className="transition-[r] duration-100 motion-reduce:transition-none" data-viewer-handle={key} data-circle-handle={key}
      fill="var(--radiograph-mark-interest)" r={handleRadius * (activeHandle === key ? 1.75 : 1)} />) : null}
  </g>
}

export { ViewerCircleEditorOverlay }
