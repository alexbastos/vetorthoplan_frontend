type Point = { x: number; y: number }
const clamp = (value: number) => Math.min(1, Math.max(0, value))
const easeOut = (value: number) => 1 - (1 - value) ** 3
const mix = (start: number, end: number, amount: number) => start + (end - start) * amount
const mixPoint = (start: Point, end: Point, amount: number): Point => ({ x: mix(start.x, end.x, amount), y: mix(start.y, end.y, amount) })

// The supplied reference samples an eased quadratic Bézier at 29 positions.
function heroBezierPoint(start: Point, control: Point, end: Point, amount: number): Point {
  const position = clamp(amount) * 28
  const sample = (index: number) => {
    const t = easeOut(index / 28), r = 1 - t
    return { x: r * r * start.x + 2 * r * t * control.x + t * t * end.x,
      y: r * r * start.y + 2 * r * t * control.y + t * t * end.y }
  }
  return mixPoint(sample(Math.floor(position)), sample(Math.min(28, Math.ceil(position))), position % 1)
}

export { heroBezierPoint }
export type { Point }
