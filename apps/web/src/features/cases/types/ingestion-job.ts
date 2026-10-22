type IngestionJob = Readonly<{
  id: string
  caseId: string
  imageId: string
  uploadId: string
  status: "QUEUED" | "PROCESSING" | "SUCCEEDED" | "REJECTED" | "FAILED"
  attempts: number
  errorCode: string | null
  createdAt: string
  updatedAt: string
  startedAt: string | null
  finishedAt: string | null
}>

export type { IngestionJob }
