type UploadCardFile = {
  file: File
  id: string
  status: FileUploadStatus
}

type FileUploadStatus = {
  label: string
  state: "waiting" | "uploading" | "processing" | "success" | "error"
  progress?: number
  detail?: string
  canRemove: boolean
  canRetry: boolean
  retryLabel?: string
  removeLabel?: string
  removeKind?: "delete" | "cancel"
}

type FileUploadCardLabels = {
  browse: string
  close: string
  description: string
  dropTitle: string
  formats: string
  title: string
  deleteUnavailable: string
  cancelFile: (fileName: string) => string
  removeFile: (fileName: string) => string
  retryFile: (fileName: string) => string
  transferSize: (uploaded: string, total: string) => string
}

export type { FileUploadCardLabels, FileUploadStatus, UploadCardFile }
