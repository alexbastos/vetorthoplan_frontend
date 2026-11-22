import { simulationSketchGeometry } from "./simulation-sketch-geometry"

const thumbnailScale = .8
const thumbnailFocus = { x: 71, y: 71 }
const { center } = simulationSketchGeometry.cut
const thumbnail = { x: 36.5, y: 48.5, width: 81, height: 69, rx: 4 }
const save = { x: 130.5, y: 103.5, width: 68, height: 16, rx: 8 }
const saveCenter = { x: save.x + save.width / 2, y: save.y + save.height / 2 }
const pointerStart = .78
const pointerDuration = .3
const clickAt = pointerStart + pointerDuration + .02
const savedAt = clickAt + .08

// Uniformly frame the same fragment and result; review does not calculate a new
// rotation or resize the selected region independently of the anatomy.
const reviewSketchGeometry = {
  thumbnail,
  thumbnailTransform: `translate(${thumbnailFocus.x - center.x * thumbnailScale} ${thumbnailFocus.y - center.y * thumbnailScale}) scale(${thumbnailScale})`,
  save,
  saveCenter,
  pointerPath: `M112 91C126 86 145 94 ${saveCenter.x} ${saveCenter.y}`,
  pointerStart, pointerDuration, clickAt, savedAt,
} as const

export { reviewSketchGeometry }
