import { tploRadiusPx, type TploGeometry } from "../lib/tplo-geometry"
import type { TploAdjustmentTarget, TploHit } from "../lib/tplo-interaction"

function ViewerTploEditorOverlay({ geometry, editable, handleRadius, hoveredPart, focusedPart }: {
  geometry: TploGeometry | null; editable: boolean; handleRadius: number; hoveredPart: TploHit; focusedPart?: TploAdjustmentTarget
}) {
  if (!geometry || !Number.isFinite(tploRadiusPx(geometry)) || tploRadiusPx(geometry) <= 0) return null
  const active = hoveredPart ?? focusedPart
  return <g data-tplo-draft fill="none" strokeWidth={1.25} vectorEffect="non-scaling-stroke">
    {geometry.fragment?.length ? <polyline points={geometry.fragment.map(point => `${point.x},${point.y}`).join(" ")
      + (geometry.fragmentClosed !== false && geometry.fragment.length >= 3 ? ` ${geometry.fragment[0].x},${geometry.fragment[0].y}` : "")}
      stroke="var(--radiograph-tplo-origin)" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" /> : null}
    <circle cx={geometry.center.x} cy={geometry.center.y} r={tploRadiusPx(geometry)} stroke="var(--radiograph-tplo-cut)" vectorEffect="non-scaling-stroke" />
    <path d={`M ${geometry.center.x} ${geometry.center.y} L ${geometry.edge.x} ${geometry.edge.y}`} stroke="var(--radiograph-tplo-cut)"
      strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
    {editable ? <>
      {(["center", "edge"] as const).map(key => <circle key={key} data-tplo-handle={key} cx={geometry[key].x} cy={geometry[key].y}
        r={handleRadius * (active === key ? 1.75 : 1)} fill="var(--radiograph-tplo-cut)" stroke="none" />)}
      {geometry.fragment?.map((point, index) => <circle key={index} data-tplo-vertex={index} cx={point.x} cy={point.y}
        r={handleRadius * (typeof active === "object" && active?.vertex === index ? 1.75 : 1)} fill="var(--radiograph-tplo-origin)" stroke="none" />)}
    </> : null}
  </g>
}

export { ViewerTploEditorOverlay }
