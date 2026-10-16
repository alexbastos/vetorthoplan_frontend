type WorkflowWorkspaceCopy = {
  addSurgeon: string
  calibration: string
  caseId: string
  caseLabel: string
  imageLabel: string
  imageSecondary: string
  imageTab: string
  imageTertiary: string
  images: string
  information: string
  label: string
  measurementAngle: string
  measurementAxis: string
  measurements: string
  professional: string
  reference: string
  sharing: string
  surgical: string
  tools: string
  version: string
}

type WorkflowWorkspaceProps = {
  activeStep?: number
  copy: WorkflowWorkspaceCopy
}

export type { WorkflowWorkspaceCopy, WorkflowWorkspaceProps }
