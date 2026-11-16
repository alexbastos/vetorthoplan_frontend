"use client"

import { useFormatter, useTranslations } from "next-intl"

import { formatAngleDegrees } from "../lib/angle-format"
import { formatDistanceLength } from "../lib/distance-format"
import { placeOverlayLabel, type LabelBox, type LabelObstacle } from "../lib/distance-overlay-labels"
import type { DistanceIntersection } from "../lib/distance-placement"
import type { SavedDistance } from "../lib/distance-result"
import { imagePointToPixels } from "../lib/image-point-space"
import type { ViewerOverlayView } from "../lib/viewer-editor"
import type { DistancePreview } from "../lib/distance-preview"
import { segmentCircleInPixels, segmentMeasureFor, type SegmentMeasure } from "../lib/segment-measure"
import type { ImagePoint } from "../types/case-workspace"

function comparisonMarker(arc: DistanceIntersection, pixel: number) {
  // Allow floating-point noise from converting normalized points to image pixels.
  const rightAngle = Math.abs(Math.abs(arc.sweep) - Math.PI / 2) < 1e-10
  const radius = Math.min((rightAngle ? 16 : 22) * pixel, arc.room)
  if (radius < 4 * pixel) return null
  const at = (angle: number) => pointAt(arc.center, angle, radius)
  const start = at(arc.start), end = at(arc.start + arc.sweep)
  const corner = { x: start.x + end.x - arc.center.x, y: start.y + end.y - arc.center.y }
  const steps = Math.ceil(Math.abs(arc.sweep) / (Math.PI / 12))
  const points = rightAngle ? [start, corner, end]
    : Array.from({ length: steps + 1 }, (_, index) => at(arc.start + arc.sweep * index / steps))
  return {
    edge: rightAngle ? Math.SQRT2 * radius : radius,
    obstacles: points.slice(1).map((end, index) => ({ start: points[index], end, padding: 2 * pixel })),
    path: rightAngle ? `M ${start.x} ${start.y} L ${corner.x} ${corner.y} L ${end.x} ${end.y}`
      : `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 ${arc.sweep > 0 ? 1 : 0} ${end.x} ${end.y}`,
  }
}

function pointAt(origin: ImagePoint, angle: number, distance: number): ImagePoint {
  return { x: origin.x + Math.cos(angle) * distance, y: origin.y + Math.sin(angle) * distance }
}

function comparisonAngleLabel(arc: DistanceIntersection, edge: number, value: string, view: ViewerOverlayView,
  occupied: readonly LabelBox[], obstacles: readonly LabelObstacle[]) {
  const pixel = 1 / view.scale
  for (const offset of [12, 20, 28, 36]) {
    for (const fraction of [0.5, 0.32, 0.68, 0.2, 0.8]) {
      const point = pointAt(arc.center, arc.start + arc.sweep * fraction, edge + offset * pixel)
      const label = placeOverlayLabel(point, value, 0, pixel, view, occupied, obstacles)
      if (label) return label
    }
  }
  return null
}

function lengthLabel(start: ImagePoint, end: ImagePoint, crossing: ImagePoint | undefined, value: string,
  view: ViewerOverlayView, occupied: readonly LabelBox[], obstacles: readonly LabelObstacle[]) {
  const pixel = 1 / view.scale
  const dx = end.x - start.x, dy = end.y - start.y
  const length = Math.hypot(dx, dy)
  if (!length) return null
  const angle = Math.atan2(dy, dx)
  const crossT = crossing ? ((crossing.x - start.x) * dx + (crossing.y - start.y) * dy) / (length * length) : null
  const fractions = crossT === null ? [0.5, 0.6, 0.4, 0.7, 0.3, 0.8, 0.2, 0.9, 0.1]
    : [0.78, 0.68, 0.88, 0.58, 0.5, 0.22, 0.32, 0.12, 0.42].map(t => crossT <= 0.5 ? t : 1 - t)
  // Search along the segment on both sides before allowing a wider gap.
  for (const gap of [12, 16]) {
    for (const t of fractions) {
      for (const offset of [-gap, gap]) {
        const point = { x: start.x + t * dx - offset * pixel * dy / length, y: start.y + t * dy + offset * pixel * dx / length }
        const label = placeOverlayLabel(point, value, angle, pixel, view, occupied, obstacles)
        if (label) return label
      }
    }
  }
  return null
}

function DistanceOverlay({ distances, selectedId, view, labelOnlyId, preview, activeGeometry, intersections, emphasizeActive, hiddenValueIds, measures }: {
  distances: readonly SavedDistance[]; selectedId: string | null; view: ViewerOverlayView; labelOnlyId?: string
  preview?: DistancePreview | null; activeGeometry?: DistancePreview["geometry"] | null
  intersections: readonly DistanceIntersection[]; emphasizeActive: boolean; hiddenValueIds?: readonly string[]
  measures?: Readonly<Record<string, SegmentMeasure>>
}) {
  const t = useTranslations("cases.workspace.distance")
  const format = useFormatter()
  if ((!distances.length && !preview) || !Number.isFinite(view.scale) || view.scale <= 0) return null
  // All SVG dimensions belong to the original matrix, including stroke widths.
  const pixel = 1 / view.scale
  const hiddenValues = new Set(hiddenValueIds)
  const items: { id: string; geometry: DistancePreview["geometry"]; value: string; preview: boolean }[] = distances.filter(item => item.line.id !== preview?.id).map(({ line, result }) => ({ id: line.id, geometry: line,
    value: result.status === "available" ? formatDistanceLength(result.lengthMm, format.number) : t("unavailable"), preview: false }))
  if (preview) items.push({ id: preview.id, geometry: preview.geometry, value: formatDistanceLength(preview.lengthMm, format.number), preview: true })
  const pixelItems = items.map(item => ({
    ...item, start: imagePointToPixels(item.geometry.start, view), end: imagePointToPixels(item.geometry.end, view),
    circle: segmentCircleInPixels(item.geometry, segmentMeasureFor(item.id, measures), view),
  }))
  const ordered = [...pixelItems.filter(item => item.id !== selectedId), ...pixelItems.filter(item => item.id === selectedId)]
  const useReferenceColors = emphasizeActive && Boolean(selectedId) && items.length > 1
  const occupied: LabelBox[] = []
  const markerCells = new Set<string>()
  const markers: { id: string; path: string; edge: number; intersection: DistanceIntersection; point?: ImagePoint; value: string }[] = []
  const obstacles: LabelObstacle[] = []
  for (const { id, start, end } of pixelItems) {
    const hasHandles = id === selectedId || !useReferenceColors
    obstacles.push({ start, end, padding: 2 * pixel })
    if (hasHandles) {
      const padding = (id === labelOnlyId ? 8 : 6) * pixel
      obstacles.push({ start, end: start, padding }, { start: end, end, padding })
    }
  }
  if (activeGeometry && !items.some(item => item.id === labelOnlyId)) {
    const start = imagePointToPixels(activeGeometry.start, view), end = imagePointToPixels(activeGeometry.end, view)
    obstacles.push({ start, end, padding: 2 * pixel },
      { start, end: start, padding: 8 * pixel }, { start: end, end, padding: 8 * pixel })
  }
  const crossingsByLine = new Map<string, ImagePoint>()
  for (const { circle } of pixelItems) {
    if (circle) obstacles.push({ center: circle.center, radius: circle.radiusPx, padding: 2 * pixel })
  }
  for (const intersection of intersections) {
    const { firstId, secondId, center } = intersection
    if (!crossingsByLine.has(firstId)) crossingsByLine.set(firstId, center)
    if (!crossingsByLine.has(secondId)) crossingsByLine.set(secondId, center)
    // At the current zoom, several crossings can occupy the same few screen pixels.
    // The panel retains every pair. On the image, the active pairs arrive first.
    const cell = `${Math.floor(center.x * view.scale / 12)}:${Math.floor(center.y * view.scale / 12)}`
    if (markerCells.has(cell)) continue
    const value = formatAngleDegrees(intersection.degrees, format.number)
    const marker = comparisonMarker(intersection, pixel)
    if (!marker) continue
    markerCells.add(cell)
    obstacles.push(...marker.obstacles)
    markers.push({ id: `${firstId}:${secondId}`, path: marker.path, edge: marker.edge, intersection, value })
  }
  for (const marker of markers) {
    const label = comparisonAngleLabel(marker.intersection, marker.edge, marker.value, view, occupied, obstacles)
    if (!label) continue
    marker.point = label.point
    occupied.push(label.box)
  }
  const lengthLabels = new Map<string, ImagePoint>()
  // Place the active length first. Remaining values stay accessible in the panel.
  for (const item of [...pixelItems.filter(item => item.id === selectedId), ...pixelItems.filter(item => item.id !== selectedId)]) {
    if (hiddenValues.has(item.id)) continue
    const label = lengthLabel(item.start, item.end, crossingsByLine.get(item.id), item.value, view, occupied, obstacles)
    if (!label) continue
    lengthLabels.set(item.id, label.point)
    occupied.push(label.box)
  }

  return <g data-distance-overlay>{ordered.map(({ id, circle, start, end, value, preview: isPreview }) => {
    const selected = id === selectedId
    const measure = segmentMeasureFor(id, measures)
    // Orient in display space, then undo the parent's reflection so the glyphs
    // stay readable. Endpoint order must not turn the label upside down.
    let angle = Math.atan2(end.y - start.y, (view.mirrored ? -1 : 1) * (end.x - start.x)) * 180 / Math.PI
    if (angle >= 90) angle -= 180
    if (angle < -90) angle += 180
    const endpoints = { x1: start.x, y1: start.y, x2: end.x, y2: end.y }
    const reference = useReferenceColors && !selected
    const color = reference ? "var(--radiograph-mark-anatomy)" : "var(--radiograph-mark-measurement)"
    const label = lengthLabels.get(id)
    return <g data-distance-id={id} data-distance-selected={selected} data-distance-preview={isPreview || undefined}
      data-distance-reference={reference || undefined} color={color} key={id}>
      {circle ? <circle data-segment-circle={measure} cx={circle.center.x} cy={circle.center.y} r={circle.radiusPx}
        fill="none" stroke="var(--radiograph-mark-interest)" strokeWidth="var(--radiograph-circle-stroke-width)" vectorEffect="non-scaling-stroke" /> : null}
      {id !== labelOnlyId ? <>
        <line {...endpoints} stroke="currentColor" strokeWidth={(reference ? 1.5 : 2) * pixel} />
        {!reference && [start, end].map((point, endpoint) => selected
          ? <rect key={endpoint} x={point.x - 4 * pixel} y={point.y - 4 * pixel} width={8 * pixel} height={8 * pixel}
              fill="currentColor" />
          : <circle key={endpoint} cx={point.x} cy={point.y} r={3 * pixel}
              fill="currentColor" />)}
      </> : null}
      {label ? <g transform={`translate(${label.x} ${label.y}) scale(${view.mirrored ? -1 : 1} 1) rotate(${angle})`}>
        <text className="font-data" fill="currentColor" stroke="none"
          fontSize={11 * pixel} dominantBaseline="middle" textAnchor="middle">
          {value}
        </text>
      </g> : null}
    </g>
  })}{markers.map(marker => <g key={marker.id} data-distance-comparison color="var(--radiograph-mark-comparison)">
    <path d={marker.path} fill="none" stroke="currentColor" strokeOpacity={0.72} strokeWidth={1.5 * pixel} />
    {marker.point ? <text transform={`translate(${marker.point.x} ${marker.point.y}) scale(${view.mirrored ? -1 : 1} 1)`} fill="currentColor" stroke="none"
      className="font-data" fontSize={11 * pixel} dominantBaseline="middle" textAnchor="middle">
      {marker.value}
    </text> : null}
  </g>)}</g>
}

export { DistanceOverlay }
