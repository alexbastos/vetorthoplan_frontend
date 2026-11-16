import type { ImagePoint } from "../types/case-workspace"
import type { ImageDimensions } from "./image-point-space"

type LabelBox = { left: number; top: number; right: number; bottom: number }
type LabelObstacle = ({ start: ImagePoint; end: ImagePoint } | { center: ImagePoint; radius: number }) & { padding: number }

function overlaps(a: LabelBox, b: LabelBox) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

function crossesLabel(start: ImagePoint, end: ImagePoint, halfWidth: number, halfHeight: number) {
  // Clip the segment to the rectangle in the label's own coordinate system.
  let first = 0, last = 1
  for (const [from, to, half] of [[start.x, end.x, halfWidth], [start.y, end.y, halfHeight]]) {
    const delta = to - from
    if (delta === 0) {
      if (Math.abs(from) > half) return false
      continue
    }
    const enter = (-half - from) / delta, exit = (half - from) / delta
    first = Math.max(first, Math.min(enter, exit))
    last = Math.min(last, Math.max(enter, exit))
    if (first > last) return false
  }
  return true
}

function placeOverlayLabel(point: ImagePoint, value: string, angle: number, pixel: number, view: ImageDimensions,
  occupied: readonly LabelBox[], obstacles: readonly LabelObstacle[]) {
  const width = (value.length * 7 + 6) * pixel, height = 18 * pixel
  const cos = Math.cos(angle), sin = Math.sin(angle)
  const halfWidth = (width * Math.abs(cos) + height * Math.abs(sin)) / 2
  const halfHeight = (width * Math.abs(sin) + height * Math.abs(cos)) / 2
  const box = { left: point.x - halfWidth, right: point.x + halfWidth, top: point.y - halfHeight, bottom: point.y + halfHeight }
  if (box.left < 0 || box.top < 0 || box.right > view.widthPx || box.bottom > view.heightPx
    || occupied.some(other => overlaps(box, other))) return null

  const local = (p: ImagePoint) => {
    const x = p.x - point.x, y = p.y - point.y
    return { x: x * cos + y * sin, y: y * cos - x * sin }
  }
  for (const obstacle of obstacles) {
    const { padding } = obstacle
    if ("radius" in obstacle) {
      const center = local(obstacle.center)
      const x = Math.abs(center.x), y = Math.abs(center.y)
      const near = Math.hypot(Math.max(0, x - width / 2), Math.max(0, y - height / 2))
      const far = Math.hypot(x + width / 2, y + height / 2)
      if (near <= obstacle.radius + padding && far >= Math.max(0, obstacle.radius - padding)) return null
      continue
    }
    const { start, end } = obstacle
    if (Math.min(start.x, end.x) > box.right + padding || Math.max(start.x, end.x) < box.left - padding
      || Math.min(start.y, end.y) > box.bottom + padding || Math.max(start.y, end.y) < box.top - padding) continue
    if (crossesLabel(local(start), local(end), width / 2 + padding, height / 2 + padding)) return null
  }
  return { point, box }
}

export { placeOverlayLabel }
export type { LabelBox, LabelObstacle }
