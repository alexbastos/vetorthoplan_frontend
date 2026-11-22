// Coordinates belong to public/images/cases/tibia-tpa-card.svg (160 0 412 992).
// Widen the sketch 65% around its proximal reference to separate the bone
// contours from the blue axis. Anatomy and landmarks share this placement.
const tibiaPlacement = { x: 73.376, y: 41.5, scaleX: .132, scaleY: .08 } as const
const projectTibiaPoint = (x: number, y: number) => ({
  x: Number((tibiaPlacement.x + x * tibiaPlacement.scaleX).toFixed(3)),
  y: Number((tibiaPlacement.y + y * tibiaPlacement.scaleY).toFixed(3)),
})

// Illustrative landmarks on the source art, not coordinates from a patient exam.
const tibiaLandmarks = {
  plateauCranial: projectTibiaPoint(244, 132),
  plateauCaudal: projectTibiaPoint(318, 169),
  intercondylarMidpoint: projectTibiaPoint(262, 163),
  talusCenter: projectTibiaPoint(222, 942),
} as const

const joint = tibiaLandmarks.intercondylarMidpoint
const distal = tibiaLandmarks.talusCenter
const labelY = 99
const labelX = joint.x + (distal.x - joint.x) * (labelY - joint.y) / (distal.y - joint.y)

const tibialAxisGeometry = {
  joint, distal,
  proximalRingRadius: 70 * tibiaPlacement.scaleY,
  distalRingRadius: 40 * tibiaPlacement.scaleY,
  axis: `M${joint.x} ${joint.y}L${distal.x} ${distal.y}`,
  labelConnection: `M${Number(labelX.toFixed(3))} ${labelY}H139.5`,
} as const

export { tibiaPlacement, tibiaLandmarks, tibialAxisGeometry, projectTibiaPoint }
