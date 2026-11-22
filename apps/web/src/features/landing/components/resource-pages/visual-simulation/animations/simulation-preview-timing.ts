// Seconds and curves supplied in the reference breakdown. The original shadow
// keyframe's intermediate values were not supplied; only opacity is interpolated.
const simulationPreviewTiming = {
  editHold: 2.11,
  saveDuration: .24,
  savedHold: 1.1, // From the save-state change; includes the .24s badge transition.
  rowDuration: .48,
  rowFadeDuration: .384,
  paperOffset: 181.587,
  paperDuration: .65,
  paperDelay: .16,
  paperHideDelay: .87,
  paperShadowDuration: .755,
  lensCurve: ".23,1,.32,1",
  rowCurve: ".77,0,.175,1",
} as const

export { simulationPreviewTiming }
