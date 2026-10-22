type IngestionJobStatus = "QUEUED" | "PROCESSING" | "SUCCEEDED" | "REJECTED" | "FAILED"

type CompletedImageUpload = Readonly<{
  uploadId: string
  imageId: string
  caseId: string
  kind: "DICOM" | "PNG" | "JPEG"
  mediaType: "application/dicom" | "image/dicom" | "image/png" | "image/jpeg"
  sizeBytes: number
  sha256: string
  status: "QUARANTINED"
  completedAt: string
  jobId: string
  jobStatus: IngestionJobStatus
}>

export type { CompletedImageUpload, IngestionJobStatus }
