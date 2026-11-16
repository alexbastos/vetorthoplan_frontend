"use client"

import { useFormatter, useTranslations } from "next-intl"

import { circleInPixels } from "../lib/circle-interaction"
import { DEFAULT_CIRCLE_MEASURE, circleMeasureFor, isCircleValues, type CircleMeasure, type CircleResult, type SavedCircle } from "../lib/circle-result"
import type { CircleGeometry } from "../lib/circle-geometry"
import type { CirclePreview } from "../lib/circle-preview"
import { formatDistanceLength as formatCircleLength } from "../lib/distance-format"
import type { ViewerOverlayView } from "../lib/viewer-editor"

function CircleOverlay({ circles, selectedId, view, measure = DEFAULT_CIRCLE_MEASURE, measures, hiddenValueIds, labelOnlyId, preview }: {
  circles: readonly SavedCircle[]; selectedId: string | null; view: ViewerOverlayView; measure?: CircleMeasure; labelOnlyId?: string; preview?: CirclePreview | null
  measures?: Readonly<Record<string, CircleMeasure>>; hiddenValueIds?: readonly string[]
}) {
  const t = useTranslations("cases.workspace.circle"), format = useFormatter()
  if (!Number.isFinite(view.scale) || view.scale <= 0 || !Number.isFinite(view.widthPx) || !Number.isFinite(view.heightPx)
    || view.widthPx <= 0 || view.heightPx <= 0) return null
  const pixel = 1 / view.scale
  const hiddenValues = new Set(hiddenValueIds?.map(id => id.toLowerCase()))
  const activePreview = preview && !circles.some(item => item.ambiguous && item.circle.id.toLowerCase() === preview.id.toLowerCase()) ? preview : null
  const selectedKey = selectedId?.toLowerCase(), previewKey = activePreview?.id.toLowerCase(), labelOnlyKey = labelOnlyId?.toLowerCase()
  const items: { id: string; geometry: CircleGeometry; result: CircleResult; ambiguous: boolean; preview: boolean }[] = circles
    .filter(item => item.circle.id.toLowerCase() !== previewKey).map(({ circle, result, ambiguous }) =>
      ({ id: circle.id.toLowerCase(), geometry: circle, result, ambiguous, preview: false }))
  if (activePreview) items.push({ id: activePreview.id.toLowerCase(), geometry: activePreview.geometry, ambiguous: false, preview: true,
    result: isCircleValues(activePreview.values) ? { status: "available", values: activePreview.values } : { status: "unavailable", reason: "missing" } })
  const ordered = [...items.filter(item => item.id !== selectedKey), ...items.filter(item => item.id === selectedKey)]

  return <g data-circle-overlay>{ordered.map(({ id, geometry, result, ambiguous, preview: isPreview }, index) => {
    const itemMeasure = circleMeasureFor(id, measures, measure)
    const { center, edge } = circleInPixels(geometry, view)
    const radius = Math.hypot(edge.x - center.x, edge.y - center.y)
    const selected = !ambiguous && id === selectedKey
    const formatted = result.status === "available" ? formatCircleLength(result.values[itemMeasure], format.number) : null
    const value = formatted ? `${t(`symbols.${itemMeasure}`)} ${isPreview ? t("previewLength", { value: formatted }) : formatted}` : t(isPreview ? "previewPending" : "unavailable")
    const marginX = Math.min((value.length * 3.5 + 4) * pixel, view.widthPx / 2)
    const marginY = Math.min(12 * pixel, view.heightPx / 2)
    const label = { x: Math.max(marginX, Math.min(view.widthPx - marginX, center.x)),
      y: Math.max(marginY, Math.min(view.heightPx - marginY, center.y - radius - 12 * pixel)) }

    return <g key={`${id}:${index}`} data-circle-id={id} data-circle-selected={selected} data-circle-ambiguous={ambiguous}
      data-circle-measure={itemMeasure} data-circle-value-source={isPreview ? "preview" : result.status === "available" ? "official" : "unavailable"}>
      {id !== labelOnlyKey || ambiguous ? <>
        <circle cx={center.x} cy={center.y} r={radius} fill="none" stroke="var(--radiograph-mark-interest)" strokeWidth="var(--radiograph-circle-stroke-width)" vectorEffect="non-scaling-stroke" />
        {[center, edge].map((point, endpoint) => <circle key={endpoint} cx={point.x} cy={point.y}
          r={(selected ? 4 : 3) * pixel} fill="var(--radiograph-mark-interest)" />)}
      </> : null}
      {!hiddenValues.has(id) ? <g transform={`translate(${label.x} ${label.y}) scale(${view.mirrored ? -1 : 1} 1)`}>
        <text className="font-data" fill="var(--radiograph-mark-interest)" stroke="none" fontSize={11 * pixel}
          textAnchor="middle" dominantBaseline="central">{value}</text>
      </g> : null}
    </g>
  })}</g>
}

export { CircleOverlay }
