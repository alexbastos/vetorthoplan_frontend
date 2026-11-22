// Illustrative scale for this decorative diagram, unrelated to patient data.
const radiusMillimeters = 14.2
const svgUnitsPerMillimeter = 2
const radius = radiusMillimeters * svgUnitsPerMillimeter
const center = { x: 98.5, y: 83.5 }
const edge = { x: center.x + radius, y: center.y }

const circleSketchGeometry = {
  radiusMillimeters, radius, center, edge,
  reference: `M${center.x} ${center.y}L${edge.x} ${edge.y}`,
} as const

export { circleSketchGeometry }
