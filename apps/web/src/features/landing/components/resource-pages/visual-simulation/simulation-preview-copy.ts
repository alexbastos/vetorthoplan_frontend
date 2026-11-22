type SimulationPreviewCopy = {
  planLabel: string
  planName: string
  caseLabel: string
  caseId: string
  projectionLabel: string
  projection: string
  patientLabel: string
  patientSummary: string
  summaryLabel: string
  summaryTitle: string
  summaryDescription: string
  documentTitle: string
  fragment: string
  note: string
  file: string
  radiusLabel: string
  radiusValue: string
  rotationLabel: string
  rotationValue: string
  editing: string
  saved: string
}

type SimulationPreviewPatient = { name: string; caseId: string; age: number; avatarSrc: string }
type SimulationPreviewCaseView = {
  id: string
  patient: SimulationPreviewPatient
  copy: SimulationPreviewCopy
}
// Two copies of the three-case sequence make a closed queue. One instance can
// enter while the prior occurrence of that same case still exits at the bottom.
type SimulationPreviewSelection = { index: number; step: number; phase: "editing" | "saved" }

export type { SimulationPreviewCopy, SimulationPreviewPatient, SimulationPreviewCaseView, SimulationPreviewSelection }
