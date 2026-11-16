"use client"

import { useFormatter, useTranslations } from "next-intl"

import { formatAngleDegrees } from "../lib/angle-format"
import { LANDMARK_POINT_NAMES } from "../lib/landmarks-editor"
import { landmarksGeometryIsValid, landmarksInPixels } from "../lib/landmarks-geometry"
import type { SavedLandmarks } from "../lib/landmarks-result"
import type { LandmarksPreview } from "../lib/landmarks-preview"
import type { ViewerOverlayView } from "../lib/viewer-editor"

// The preview has explicit ownership in the workspace and never becomes an
// official result. The active editor draws its own transient geometry.
function LandmarksOverlay({ saved, view, valueVisible = true, preview, labelOnly = false }: {
  saved: SavedLandmarks | null; view: ViewerOverlayView; valueVisible?: boolean; preview?: LandmarksPreview | null; labelOnly?: boolean
}) {
  const t = useTranslations("cases.workspace.landmarks"), format = useFormatter()
  const geometry = preview?.geometry ?? saved?.landmarks
  if (!geometry || !Number.isFinite(view.scale) || view.scale <= 0) return null
  const points = landmarksInPixels(geometry, view)
  if (!landmarksGeometryIsValid(points, view)) return null
  const pixel = 1 / view.scale
  const tpa = saved?.result.tpa
  const value = preview ? preview.values ? t("previewTpa", { value: formatAngleDegrees(preview.values.tpaDegrees, format.number) }) : t("previewPendingLabel")
    : tpa?.status === "available" ? t("tpaValue", { value: formatAngleDegrees(tpa.degrees, format.number) }) : t("unavailable")
  const marginX = Math.min((value.length * 3.5 + 4) * pixel, view.widthPx / 2)
  const marginY = Math.min(12 * pixel, view.heightPx / 2)
  const pointMarginX = Math.min(8 * pixel, view.widthPx / 2), pointMarginY = Math.min(8 * pixel, view.heightPx / 2)
  const label = {
    x: Math.max(marginX, Math.min(view.widthPx - marginX, (points.plateau_cranial.x + points.plateau_caudal.x) / 2)),
    y: Math.max(marginY, Math.min(view.heightPx - marginY, (points.plateau_cranial.y + points.plateau_caudal.y) / 2 - 18 * pixel)),
  }

  return <g data-landmarks-overlay data-landmarks-revision={!preview ? saved?.revision : undefined}
    data-landmarks-method={!preview ? saved?.landmarks.method : undefined} data-landmarks-value-source={preview ? "preview" : tpa?.status === "available" ? "official" : "unavailable"}>
    {!labelOnly ? <><g fill="none" stroke="var(--radiograph-mark-anatomy)" strokeWidth={2 * pixel}>
      <line data-landmarks-segment="plateau" x1={points.plateau_cranial.x} y1={points.plateau_cranial.y}
        x2={points.plateau_caudal.x} y2={points.plateau_caudal.y} />
      <line data-landmarks-segment="mechanical-axis" x1={points.intercondylar_midpoint.x} y1={points.intercondylar_midpoint.y}
        x2={points.talus_center.x} y2={points.talus_center.y} />
    </g>
    {LANDMARK_POINT_NAMES.map((key, index) => {
      const point = points[key]
      const offsetX = (index < 2 ? 10 : -10) * (view.mirrored ? -1 : 1) * pixel
      const offsetY = (index === 0 || index === 3 ? 10 : -10) * pixel
      const numberX = Math.max(pointMarginX, Math.min(view.widthPx - pointMarginX, point.x + offsetX))
      const numberY = Math.max(pointMarginY, Math.min(view.heightPx - pointMarginY, point.y + offsetY))
      return <g key={key} data-landmarks-point={key}>
        <circle cx={point.x} cy={point.y} r={3 * pixel} fill="var(--radiograph-mark-anatomy)" />
        <g transform={`translate(${numberX} ${numberY}) scale(${view.mirrored ? -1 : 1} 1)`}>
          <text className="font-data" fill="var(--radiograph-mark-anatomy)" fontSize={10 * pixel}
            textAnchor="middle" dominantBaseline="central">{index + 1}</text>
        </g>
      </g>
    })}</> : null}
    {valueVisible && (!view.activeGesture || preview) ? <g transform={`translate(${label.x} ${label.y}) scale(${view.mirrored ? -1 : 1} 1)`}>
      <text className="font-data" fill="var(--radiograph-mark-anatomy)" fontSize={11 * pixel}
        textAnchor="middle" dominantBaseline="central">{value}</text>
    </g> : null}
  </g>
}

export { LandmarksOverlay }
