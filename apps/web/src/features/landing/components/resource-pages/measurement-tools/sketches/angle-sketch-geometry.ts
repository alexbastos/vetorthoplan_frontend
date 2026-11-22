// One source for the displayed value, connected segments, handles and angle arc.
const degrees = 45
const vertex = { x: 81.5, y: 106.5 }
const rayLength = 84
const arcRadius = 22
const radians = degrees * Math.PI / 180
const round = (value: number) => Number(value.toFixed(3))
const first = { x: vertex.x + rayLength, y: vertex.y }
const last = {
  x: round(vertex.x + rayLength * Math.cos(radians)),
  y: round(vertex.y - rayLength * Math.sin(radians)),
}
const arcEnd = {
  x: round(vertex.x + arcRadius * Math.cos(radians)),
  y: round(vertex.y - arcRadius * Math.sin(radians)),
}

const angleSketchGeometry = {
  degrees, vertex, first, last,
  measurement: `M${first.x} ${first.y}L${vertex.x} ${vertex.y}L${last.x} ${last.y}`,
  arc: `M${vertex.x + arcRadius} ${vertex.y}A${arcRadius} ${arcRadius} 0 0 0 ${arcEnd.x} ${arcEnd.y}`,
} as const

export { angleSketchGeometry }
