import { circleDiameter, type CircleHit } from "../lib/circle-marker-interaction"
import type { LineHit } from "../lib/line-marker-interaction"
import type { CalibrationMarker, ImagePoint } from "../types/case-workspace"

function ViewerEditorOverlay({ mode, editable, handleRadius, hoveredPart, focusedPart, marker }: { mode: "calibration" | "distance"; editable: boolean; handleRadius: number; hoveredPart: LineHit | CircleHit; focusedPart?: LineHit; marker: CalibrationMarker | null }) {
  if (!marker) return null
  if (marker.kind === "line") return (
    <g data-distance-draft={mode === "distance" ? "" : undefined} fill="none" stroke="var(--radiograph-mark-measurement)" strokeWidth={mode === "distance" ? handleRadius / 2 : 2}>
      <line vectorEffect={mode === "calibration" ? "non-scaling-stroke" : undefined} x1={marker.start.x} x2={marker.end.x} y1={marker.start.y} y2={marker.end.y} />
      {editable ? <MarkerHandles mode={mode} start={marker.start} end={marker.end} handleRadius={handleRadius} hoveredPart={hoveredPart === "start" || hoveredPart === "end" ? hoveredPart : focusedPart ?? hoveredPart} /> : null}
    </g>
  )
  const diameter = circleDiameter(marker)
  return <>
    <circle cx={marker.center.x} cy={marker.center.y} data-calibration-circle fill="none" r={marker.radiusPx} stroke="var(--radiograph-mark-interest)" strokeWidth="var(--radiograph-circle-stroke-width)" vectorEffect="non-scaling-stroke" />
    <g fill="none" stroke="var(--radiograph-mark-measurement)" strokeWidth="2">
      <line data-calibration-diameter vectorEffect="non-scaling-stroke" x1={diameter.start.x} x2={diameter.end.x} y1={diameter.start.y} y2={diameter.end.y} />
      {editable ? <MarkerHandles mode={mode} {...diameter} handleRadius={handleRadius} hoveredPart={hoveredPart} /> : null}
    </g>
  </>
}

function MarkerHandles({ mode, start, end, handleRadius, hoveredPart }: { mode: "calibration" | "distance"; start: ImagePoint; end: ImagePoint; handleRadius: number; hoveredPart: LineHit | CircleHit }) {
  return <>{(["start", "end"] as const).map(endpoint => {
    const point = endpoint === "start" ? start : end
    return <circle className="transition-[r] duration-100 motion-reduce:transition-none" cx={point.x} cy={point.y} data-calibration-handle={mode === "calibration" ? endpoint : undefined} data-viewer-handle={endpoint}
      fill="var(--radiograph-mark-measurement)" key={endpoint} r={handleRadius * (hoveredPart === endpoint ? 1.75 : 1)} vectorEffect={mode === "calibration" ? "non-scaling-stroke" : undefined} />
  })}</>
}

export { ViewerEditorOverlay }
