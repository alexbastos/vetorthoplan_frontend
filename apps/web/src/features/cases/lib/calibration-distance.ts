import type { CalibrationInput, ImagePlan } from "../schemas/image-plan.schema"

function calibrationDistanceGeometry(reference: CalibrationInput | null) {
  if (!reference) return null
  if (reference.kind === "REFERENCE_LINE") return { start: reference.start, end: reference.end }
  const start = { x: 2 * reference.center.x - reference.edge.x, y: 2 * reference.center.y - reference.edge.y }
  // A legacy circle may cross the image boundary. Do not clamp its diameter:
  // that would silently turn it into a different measurement.
  return start.x >= 0 && start.y >= 0 && start.x <= 1 && start.y <= 1 ? { start, end: reference.edge } : null
}

// The backend has no calibration-to-object foreign key. Recover only an
// unambiguous existing line; never overwrite an arbitrary legacy measurement.
function calibrationDistanceLine(plan: ImagePlan, selectedId?: string | null) {
  const lines = plan.document.objects.filter(object => object.type === "LINE").filter(line => line.visible !== false)
  const selected = selectedId && lines.find(line => line.id === selectedId)
  if (selected) return selected
  const reference = calibrationDistanceGeometry(plan.document.calibration)
  if (reference) {
    const matches = lines.filter(line =>
      line.start.x === reference.start.x && line.start.y === reference.start.y && line.end.x === reference.end.x && line.end.y === reference.end.y
      || line.end.x === reference.start.x && line.end.y === reference.start.y && line.start.x === reference.end.x && line.start.y === reference.end.y)
    if (matches.length === 1) return matches[0]
  }
  return lines.length === 1 ? lines[0] : null
}

export { calibrationDistanceGeometry, calibrationDistanceLine }
