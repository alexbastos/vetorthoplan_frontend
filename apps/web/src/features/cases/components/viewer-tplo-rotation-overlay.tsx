import { useFormatter } from "next-intl"

import { formatAngleDegrees } from "../lib/angle-format"
import type { TploGeometry } from "../lib/tplo-geometry"
import { tploRotationHandle } from "../lib/tplo-rotation"

function ViewerTploRotationOverlay({ geometry, degrees, scale, mirrored, preview }: {
  geometry: TploGeometry; degrees: number; scale: number; mirrored: boolean; preview: boolean
}) {
  const format = useFormatter(), handle = tploRotationHandle(geometry, degrees, scale)
  if (!handle) return null
  const pixel = 1 / scale
  return <g data-tplo-rotation-handle fill="none" stroke="var(--radiograph-tplo-cut)">
    <path d={`M ${geometry.center.x} ${geometry.center.y} L ${handle.x} ${handle.y}`} strokeDasharray="2 4" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
    <circle cx={handle.x} cy={handle.y} r={7 * pixel} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    <g transform={`translate(${handle.x} ${handle.y - 17 * pixel}) scale(${mirrored ? -1 : 1} 1)`}>
      <text className="font-data" fontSize={11 * pixel} textAnchor="middle" fill="var(--radiograph-tplo-cut)" stroke="none">
        {preview ? "≈ " : ""}{formatAngleDegrees(degrees, format.number)}
      </text>
    </g>
  </g>
}

export { ViewerTploRotationOverlay }
