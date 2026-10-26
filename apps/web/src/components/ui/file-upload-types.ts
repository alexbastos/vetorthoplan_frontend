type UploadCardFile = {
  file: File
  id: string
  status: FileUploadStatus
}

type FileUploadStatus = {
  label: string
  state: "waiting" | "uploading" | "processing" | "success" | "error"
  progress?: number
  /** Actual bytes sent, separate from overall progress through upload stages. */
  transferProgress?: number
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
  finishing: string
  deleteUnavailable: string
  cancelFile: (fileName: string) => string
  removeFile: (fileName: string) => string
  retryFile: (fileName: string) => string
  transferSize: (uploaded: string, total: string) => string
}

export type { FileUploadCardLabels, FileUploadStatus, UploadCardFile }
