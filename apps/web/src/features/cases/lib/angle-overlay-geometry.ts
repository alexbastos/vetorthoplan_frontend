import { normalizedAngleRotation, type AngleGeometry } from "./angle-geometry"
import { imagePointToPixels, type ImageDimensions } from "./image-point-space"

function angleOverlayGeometry(geometry: AngleGeometry, view: ImageDimensions & { scale: number }, labelWidth = 80) {
  const vertex = imagePointToPixels(geometry.vertex, view)
  const pixel = 1 / view.scale
  const clampLabel = (x: number, y: number) => {
    const marginX = Math.min((labelWidth / 2 + 4) * pixel, view.widthPx / 2)
    const marginY = Math.min(12 * pixel, view.heightPx / 2)
    return { x: Math.max(marginX, Math.min(view.widthPx - marginX, x)), y: Math.max(marginY, Math.min(view.heightPx - marginY, y)) }
  }
  const delta = normalizedAngleRotation(geometry)
  if (delta === null) return { path: null, label: clampLabel(vertex.x, vertex.y - 14 * pixel) }
  const a = { x: geometry.start.x - geometry.vertex.x, y: geometry.start.y - geometry.vertex.y }
  const b = { x: geometry.end.x - geometry.vertex.x, y: geometry.end.y - geometry.vertex.y }
  const start = Math.atan2(a.y, a.x)
  // Use the backend's normalized convention for the arc, then map each axis
  // to pixels. On rectangular images it is an ellipse, not a pixel-angle claim.
  const radius = Math.min(22 * pixel / Math.max(view.widthPx, view.heightPx), Math.min(Math.hypot(a.x, a.y), Math.hypot(b.x, b.y)) * 0.35)
  const rx = radius * view.widthPx, ry = radius * view.heightPx
  const at = (radians: number) => ({ x: vertex.x + rx * Math.cos(radians), y: vertex.y + ry * Math.sin(radians) })
  const first = at(start), last = at(start + delta), middle = at(start + delta / 2)
  const dx = Math.cos(start + delta / 2) * view.widthPx, dy = Math.sin(start + delta / 2) * view.heightPx
  const length = Math.hypot(dx, dy)
  return {
    path: radius > 0 && Math.abs(delta) > 1e-12 ? `M ${first.x} ${first.y} A ${rx} ${ry} 0 0 ${delta >= 0 ? 1 : 0} ${last.x} ${last.y}` : null,
    label: clampLabel(middle.x + dx / length * 14 * pixel, middle.y + dy / length * 14 * pixel),
  }
}

export { angleOverlayGeometry }
