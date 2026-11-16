"use client"

import { useFormatter, useTranslations } from "next-intl"

import { formatAngleDegrees } from "../lib/angle-format"
import { angleOverlayGeometry } from "../lib/angle-overlay-geometry"
import { isAngleDegrees, type AngleResult, type SavedAngle } from "../lib/angle-result"
import type { AnglePreview } from "../lib/angle-preview"
import type { AngleGeometry } from "../lib/angle-geometry"
import { angleInPixels } from "../lib/angle-interaction"
import type { ViewerOverlayView } from "../lib/viewer-editor"

function AngleOverlay({ angles, selectedId, view, labelOnlyId, preview, hiddenValueIds }: {
  angles: readonly SavedAngle[]; selectedId: string | null; view: ViewerOverlayView; labelOnlyId?: string; preview?: AnglePreview | null; hiddenValueIds?: readonly string[]
}) {
  const t = useTranslations("cases.workspace.angle"), format = useFormatter()
  if (!Number.isFinite(view.scale) || view.scale <= 0 || !Number.isFinite(view.widthPx) || !Number.isFinite(view.heightPx) || view.widthPx <= 0 || view.heightPx <= 0) return null
  const pixel = 1 / view.scale
  const previewId = preview?.id.toLowerCase(), selectedKey = selectedId?.toLowerCase(), labelOnlyKey = labelOnlyId?.toLowerCase()
  const hiddenValues = new Set(hiddenValueIds?.map(id => id.toLowerCase()))
  const items: { id: string; geometry: AngleGeometry; result: AngleResult; preview: boolean }[] = angles
    .filter(item => item.angle.id.toLowerCase() !== previewId).map(({ angle, result }) => ({ id: angle.id.toLowerCase(), geometry: angle, result, preview: false }))
  if (preview) items.push({ id: preview.id.toLowerCase(), geometry: preview.geometry, preview: true,
    result: isAngleDegrees(preview.degrees) ? { status: "available", degrees: preview.degrees } : { status: "unavailable", reason: "missing" } })
  const ordered = [...items.filter(item => item.id !== selectedKey), ...items.filter(item => item.id === selectedKey)]

  return <g data-angle-overlay>{ordered.map((item, index) => {
    const { id, geometry, result } = item
    const selected = id === selectedKey, points = angleInPixels(geometry, view)
    const formatted = result.status === "available" ? formatAngleDegrees(result.degrees, format.number) : null
    const value = formatted !== null ? item.preview ? t("previewDegrees", { value: formatted }) : formatted : t(item.preview ? "previewPending" : "unavailable")
    const decoration = angleOverlayGeometry(geometry, view, value.length * 7)
    const source = item.preview ? "preview" : result.status === "available" ? "official" : "unavailable"
    const hideOldValue = view.activeGesture && id === labelOnlyKey && !item.preview
    return <g data-angle-id={id} data-angle-selected={selected} data-angle-value-source={source} key={`${id}:${index}`}>
      {id !== labelOnlyKey ? <>
        <polyline fill="none" points={`${points.start.x},${points.start.y} ${points.vertex.x},${points.vertex.y} ${points.end.x},${points.end.y}`}
          stroke="var(--radiograph-mark-measurement)" strokeWidth={2 * pixel} />
        {(["start", "vertex", "end"] as const).map(point => <circle key={point} cx={points[point].x} cy={points[point].y}
          r={(selected ? 4 : 3) * pixel} fill="var(--radiograph-mark-measurement)" />)}
      </> : null}
      {!hideOldValue ? <>
        {decoration.path ? <path d={decoration.path} data-angle-arc fill="none" stroke="var(--radiograph-mark-measurement)" strokeWidth={1.5 * pixel} /> : null}
        {!hiddenValues.has(id) ? <g transform={`translate(${decoration.label.x} ${decoration.label.y}) scale(${view.mirrored ? -1 : 1} 1)`}>
          <text className="font-data" fill="var(--radiograph-mark-measurement)" stroke="none" fontSize={11 * pixel}
            textAnchor="middle" dominantBaseline="central">{value}</text>
        </g> : null}
      </> : null}
    </g>
  })}</g>
}

export { AngleOverlay }
