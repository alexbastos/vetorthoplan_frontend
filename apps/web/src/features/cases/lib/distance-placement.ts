import type { ImagePoint } from "../types/case-workspace"
import type { DistanceGeometry } from "./distance-editor"
import { imagePointToNormalized, imagePointToPixels, type ImageDimensions } from "./image-point-space"

type SegmentInPixels = DistanceGeometry & ImagePoint & { length: number }
const defaultLineHeightFraction = 0.4

function rotate(direction: ImagePoint, degrees: number): ImagePoint {
  const radians = degrees * Math.PI / 180
  const cos = Math.cos(radians), sin = Math.sin(radians)
  return { x: direction.x * cos - direction.y * sin, y: direction.x * sin + direction.y * cos }
}

function lineInPixels(line: DistanceGeometry, dimensions: ImageDimensions) {
  const start = imagePointToPixels(line.start, dimensions)
  const end = imagePointToPixels(line.end, dimensions)
  const dx = end.x - start.x, dy = end.y - start.y
  const length = Math.hypot(dx, dy)
  return length > 0 && Number.isFinite(length) ? { start, end, length, x: dx / length, y: dy / length } : null
}

function roomToImageEdge(point: ImagePoint, direction: ImagePoint, { widthPx, heightPx }: ImageDimensions): number {
  const { x, y } = direction
  return Math.min(
    x > 0 ? (widthPx - point.x) / x : x < 0 ? point.x / -x : Infinity,
    y > 0 ? (heightPx - point.y) / y : y < 0 ? point.y / -y : Infinity,
  )
}

function fitSegment(center: ImagePoint, direction: ImagePoint, lengthPx: number, dimensions: ImageDimensions): SegmentInPixels {
  const { widthPx, heightPx } = dimensions
  const before = roomToImageEdge(center, { x: -direction.x, y: -direction.y }, dimensions)
  const after = roomToImageEdge(center, direction, dimensions)
  // Keep the direction at the borders. Slide first, then shorten if necessary.
  const length = Math.min(lengthPx, before + after)
  const offset = Math.min(before, Math.max(length / 2, length - after))
  const at = (distance: number) => ({
    x: Math.max(0, Math.min(widthPx, center.x + distance * direction.x)),
    y: Math.max(0, Math.min(heightPx, center.y + distance * direction.y)),
  })
  return { ...direction, length, start: at(-offset), end: at(length - offset) }
}

function placementConflicts(candidate: SegmentInPixels, existing: SegmentInPixels, gap: number, overlapWeight: number): number {
  const close = (a: ImagePoint, b: ImagePoint) => Math.hypot(a.x - b.x, a.y - b.y) < gap
  const closeHandles = Number(close(candidate.start, existing.start) || close(candidate.start, existing.end))
    + Number(close(candidate.end, existing.start) || close(candidate.end, existing.end))
  const cross = candidate.x * existing.y - candidate.y * existing.x
  if (Math.abs(cross) > Math.sin(Math.PI / 36)) return closeHandles

  // Only near-parallel segments can obscure each other along their length.
  // Check the part of the existing line that projects onto the new segment.
  const project = (point: ImagePoint) => {
    const x = point.x - candidate.start.x, y = point.y - candidate.start.y
    return { along: x * candidate.x + y * candidate.y, across: y * candidate.x - x * candidate.y }
  }
  const a = project(existing.start), b = project(existing.end)
  const first = Math.max(0, Math.min(a.along, b.along))
  const last = Math.min(candidate.length, Math.max(a.along, b.along))
  if (first >= last) return closeHandles
  const acrossAt = (along: number) => a.across + (along - a.along) / (b.along - a.along) * (b.across - a.across)
  const firstDistance = acrossAt(first), lastDistance = acrossAt(last)
  const overlaps = firstDistance * lastDistance <= 0 || Math.min(Math.abs(firstDistance), Math.abs(lastDistance)) < gap
  return closeHandles + (overlaps ? overlapWeight : 0)
}

function placeDistanceAtReference(reference: DistanceGeometry | null, dimensions: ImageDimensions,
  occupied: readonly DistanceGeometry[]): DistanceGeometry {
  const { widthPx, heightPx } = dimensions
  const line = reference && lineInPixels(reference, dimensions)
  const direction = line ? rotate(line, 95) : { x: 0, y: 1 }
  const center = { x: widthPx / 2, y: heightPx / 2 }
  const lengthPx = heightPx * defaultLineHeightFraction
  const initial = fitSegment(center, direction, lengthPx, dimensions)
  const normalized = (segment: SegmentInPixels) => ({
    start: imagePointToNormalized(segment.start, dimensions),
    end: imagePointToNormalized(segment.end, dimensions),
  })
  const segments = occupied.map(segment => lineInPixels(segment, dimensions)).filter(segment => segment !== null)
  const gap = Math.max(2, Math.min(widthPx, heightPx) * 0.025)
  // When every candidate conflicts, prefer a visible segment over separated handles.
  const overlapWeight = 2 * segments.length + 1
  const conflicts = (candidate: SegmentInPixels) =>
    segments.reduce((total, segment) => total + placementConflicts(candidate, segment, gap, overlapWeight), 0)
  let best = initial, bestConflicts = conflicts(initial)
  if (!bestConflicts) return normalized(initial)

  const lateral = { x: direction.y, y: -direction.x }
  const offsets = new Set([0])
  for (const sign of [1, -1]) {
    const limit = roomToImageEdge(center, { x: lateral.x * sign, y: lateral.y * sign }, dimensions)
    const nearby = gap * 1.25
    const step = Math.max(nearby, limit / 12)
    if (nearby < limit) offsets.add(sign * nearby)
    for (let distance = step; distance < limit; distance += step) offsets.add(sign * distance)
    if (limit > 0) offsets.add(sign * limit)
  }
  const nearestOffsets = [...offsets].sort((a, b) => Math.abs(a) - Math.abs(b))

  // Resolve collisions by changing direction at the image center first.
  const directions = [0, 10, -10, 20, -20, 30, -30, 45, -45, 60, -60, 75, -75, 90]
  for (const offset of nearestOffsets) {
    const anchor = { x: center.x + offset * lateral.x, y: center.y + offset * lateral.y }
    for (const degrees of directions) {
      if (!degrees && !offset) continue
      const candidate = fitSegment(anchor, rotate(direction, degrees), lengthPx, dimensions)
      if (candidate.length < Math.min(initial.length, 2)) continue
      const count = conflicts(candidate)
      if (!count && candidate.length >= initial.length - 1e-7) return normalized(candidate)
      if (count < bestConflicts || count === bestConflicts && candidate.length > best.length + 1e-7) {
        best = candidate
        bestConflicts = count
      }
    }
  }
  return normalized(best)
}

type DistanceSegment = DistanceGeometry & { id: string }
type PixelSegment = NonNullable<ReturnType<typeof lineInPixels>> & { id: string }
type DistanceIntersection = {
  firstId: string; secondId: string; degrees: number
  center: ImagePoint; start: number; sweep: number; room: number
}

function intersectSegments(a: PixelSegment, b: PixelSegment): DistanceIntersection | null {
  const cross = a.x * b.y - a.y * b.x
  if (Math.abs(cross) < 1e-10) return null

  const dx = b.start.x - a.start.x, dy = b.start.y - a.start.y
  const alongA = (dx * b.y - dy * b.x) / cross
  const alongB = (dx * a.y - dy * a.x) / cross
  // Include shared endpoints despite rounding from normalized coordinates.
  const epsilon = 1e-7
  if (alongA < -epsilon || alongA > a.length + epsilon || alongB < -epsilon || alongB > b.length + epsilon) return null

  // Keep the end-to-end quadrant where possible. At an end, use the arm that exists.
  const forwardA = a.length - alongA > epsilon, forwardB = b.length - alongB > epsilon
  const signA = forwardA ? 1 : -1, signB = forwardB ? 1 : -1
  const dot = a.x * b.x + a.y * b.y
  const sweep = Math.atan2(cross * signA * signB, dot * signA * signB)
  const at = Math.max(0, Math.min(a.length, alongA))
  return {
    firstId: a.id, secondId: b.id, degrees: Math.abs(sweep) * 180 / Math.PI,
    center: { x: a.start.x + at * a.x, y: a.start.y + at * a.y },
    start: Math.atan2(a.y * signA, a.x * signA), sweep,
    room: Math.min(forwardA ? a.length - alongA : alongA, forwardB ? b.length - alongB : alongB),
  }
}

function distanceIntersections(lines: readonly DistanceSegment[], dimensions: ImageDimensions, draft?: DistanceSegment): DistanceIntersection[] {
  const inPixels = (line: DistanceSegment) => {
    const pixels = lineInPixels(line, dimensions)
    return pixels ? { ...pixels, id: line.id } : null
  }
  const segments = lines.map(inPixels).filter(segment => segment !== null)
  const intersections: DistanceIntersection[] = []
  if (draft) {
    const active = inPixels(draft)
    if (!active) return intersections
    for (const segment of segments) {
      if (segment.id === active.id) continue
      const intersection = intersectSegments(segment, active)
      if (intersection) intersections.push(intersection)
    }
    return intersections
  }
  for (const [index, a] of segments.entries()) {
    for (let next = index + 1; next < segments.length; next += 1) {
      const intersection = intersectSegments(a, segments[next])
      if (intersection) intersections.push(intersection)
    }
  }
  return intersections
}

export { distanceIntersections, placeDistanceAtReference }
export type { DistanceIntersection }
