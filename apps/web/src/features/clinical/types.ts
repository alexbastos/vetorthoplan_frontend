type CaseStatus = "ARCHIVED" | "DRAFT" | "IN_PLANNING" | "READY"
type ImageStatus = "PENDING_UPLOAD" | "PROCESSING" | "QUARANTINED" | "READY" | "REJECTED"
type CaseStatusCounts = Record<CaseStatus, number>

type CaseListPage = {
  items: ClinicalCase[]
  next_cursor: string | null
  status_counts: CaseStatusCounts
}

type CreateCasePayload = {
  title: string
  animal_name: string
  species: string
  breed?: string | null
  sex?: "FEMALE" | "MALE" | "UNKNOWN" | null
  birth_date?: string | null
  approximate_age_months?: number | null
  weight_kg?: number | null
  clinical_notes?: string | null
}

type ImageUploadSession = {
  upload_id: string
  image_id: string
  case_id: string
  status: "PENDING_UPLOAD"
  upload: {
    method: "POST"
    url: string
    fields: Record<string, string>
    expires_at: string
  }
}

type CompletedImageUpload = {
  upload_id: string
  image_id: string
  case_id: string
  status: "QUARANTINED"
  job_id: string
  job_status: "QUEUED"
}

type IngestionJob = {
  id: string
  image_id: string
  status: "QUEUED" | "PROCESSING" | "SUCCEEDED" | "REJECTED" | "FAILED"
  error_code: string | null
}

type ClinicalCase = {
  id: string
  title: string
  animal_name: string
  species: string
  breed: string | null
  status: CaseStatus
  sex?: "FEMALE" | "MALE" | "UNKNOWN" | null
  birth_date?: string | null
  approximate_age_months?: number | null
  weight_kg?: string | number | null
  clinical_notes?: string | null
  created_at: string
  updated_at: string
}

type ClinicalImage = {
  id: string
  upload_id: string
  case_id: string
  original_filename: string
  kind: "DICOM" | "JPEG" | "PNG"
  status: ImageStatus
  width_px: number | null
  height_px: number | null
  rejection_code: string | null
  metadata: Record<string, string>
  preview_available: boolean
  preview_width_px: number | null
  preview_height_px: number | null
}

type PlanPoint = { x: number; y: number }
type PlanCalibration = {
  kind: "REFERENCE_LINE"
  start: PlanPoint
  end: PlanPoint
  known_length_mm: number
}
type PlanLine = {
  id: string
  type: "LINE"
  start: PlanPoint
  end: PlanPoint
  label?: string | null
}
type PlanAngle = {
  id: string
  type: "ANGLE"
  start: PlanPoint
  vertex: PlanPoint
  end: PlanPoint
  label?: string | null
}
type PlanCircle = {
  id: string
  type: "CIRCLE"
  center: PlanPoint
  edge: PlanPoint
  label?: string | null
}
type PlanTplo = {
  id: string
  type: "TPLO"
  center: PlanPoint
  edge: PlanPoint
  rotation_degrees: number
  label?: string | null
}
type PlanObject = PlanAngle | PlanCircle | PlanLine | PlanTplo
type PlanDocument = {
  schema_version: 1
  calibration: PlanCalibration | null
  objects: PlanObject[]
}
type ImagePlan = {
  image_id: string
  revision: number
  document: PlanDocument
  updated_at: string | null
}

export type {
  CompletedImageUpload,
  CaseListPage,
  CaseStatus,
  CaseStatusCounts,
  CreateCasePayload,
  ImageUploadSession,
  IngestionJob,
  ClinicalCase,
  ClinicalImage,
  ImagePlan,
  ImageStatus,
  PlanAngle,
  PlanCalibration,
  PlanCircle,
  PlanDocument,
  PlanLine,
  PlanObject,
  PlanPoint,
  PlanTplo,
}
