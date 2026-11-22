"use client"

import { useFormatter, useTranslations } from "next-intl"

import { formatAngleDegrees } from "../lib/angle-format"
import { formatDistanceLength } from "../lib/distance-format"
import { tploInPixels, tploRadiusPx } from "../lib/tplo-geometry"
import type { SavedTplo } from "../lib/tplo-result"
import type { ViewerOverlayView } from "../lib/viewer-editor"

function TploOverlay({ objects, selectedId, view, labelOnlyId, dirtyId, showResult = false }: {
  objects: readonly SavedTplo[]; selectedId: string | null; view: ViewerOverlayView;
  labelOnlyId?: string | null; dirtyId?: string | null; showResult?: boolean
}) {
  const t = useTranslations("cases.workspace.tplo"), format = useFormatter()
  if (![view.scale, view.widthPx, view.heightPx].every(value => Number.isFinite(value) && value > 0)) return null
  const selectedKey = selectedId?.toLowerCase(), labelOnlyKey = labelOnlyId?.toLowerCase(), dirtyKey = dirtyId?.toLowerCase()
  const visible = objects.filter(item => item.object.visible !== false)
  const ordered = [...visible.filter(item => item.object.id.toLowerCase() !== selectedKey), ...visible.filter(item => item.object.id.toLowerCase() === selectedKey)]
  const pixel = 1 / view.scale
  return <g data-tplo-overlay role="img" aria-label={t("read.legend")}>{ordered.map((item, index) => {
    const { object, origin, measurement, simulation, ambiguous } = item
    if (!origin) return null
    const id = object.id.toLowerCase(), selected = !ambiguous && id === selectedKey
    const editing = id === labelOnlyKey, local = id === dirtyKey || selected && Boolean(view.activeGesture)
    const pixels = tploInPixels(origin, view), radius = tploRadiusPx(pixels)
    if (!Number.isFinite(radius) || radius <= 0) return null
    const contour = pixels.fragment?.map(point => `${point.x},${point.y}`).join(" ")
    const result = selected && showResult && !local && simulation.status === "available" ? simulation : null
    const value = measurement.status === "available" && !local
      ? t("read.values", { radius: formatDistanceLength(measurement.radiusMm, format.number), rotation: formatAngleDegrees(measurement.rotationDegrees, format.number) })
      : t(local ? "read.draft" : "read.unavailable")
    const margin = Math.min((value.length * 3.5 + 4) * pixel, view.widthPx / 2)
    const label = { x: Math.max(margin, Math.min(view.widthPx - margin, pixels.center.x)),
      y: Math.max(12 * pixel, Math.min(view.heightPx - 12 * pixel, pixels.center.y - radius - 12 * pixel)) }
    return <g key={`${id}:${index}`} data-tplo-id={id} data-tplo-selected={selected} data-tplo-locked={object.locked}
      data-tplo-value-source={local ? "draft" : measurement.status === "available" ? "official" : "unavailable"}>
      <title>{object.label?.trim() || t("read.defaultName", { index: visible.indexOf(item) + 1 })}: {value}</title>
      {!editing ? <>
        {contour ? <polygon points={contour} fill="none" stroke="var(--radiograph-tplo-origin)" strokeDasharray="5 4" strokeWidth={1.25} vectorEffect="non-scaling-stroke" /> : null}
        <circle cx={pixels.center.x} cy={pixels.center.y} r={radius} fill="none" stroke="var(--radiograph-tplo-cut)" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
        {[pixels.center, pixels.edge].map((point, handle) => <circle key={handle} cx={point.x} cy={point.y} r={(selected ? 4 : 3) * pixel} fill="var(--radiograph-tplo-cut)" />)}
      </> : null}
      {result ? <polygon points={result.pointsPx.map(point => `${point.x},${point.y}`).join(" ")} fill="none"
        stroke="var(--radiograph-tplo-result)" strokeWidth={2} vectorEffect="non-scaling-stroke" data-tplo-official-result data-tplo-point-source={result.pointSource} /> : null}
      {selected && !view.activeGesture ? <g transform={`translate(${label.x} ${label.y}) scale(${view.mirrored ? -1 : 1} 1)`}>
        <text className="font-data" fill="var(--radiograph-tplo-cut)" stroke="none" fontSize={11 * pixel} textAnchor="middle" dominantBaseline="central">{value}</text>
      </g> : null}
    </g>
  })}</g>
}

export { TploOverlay }
