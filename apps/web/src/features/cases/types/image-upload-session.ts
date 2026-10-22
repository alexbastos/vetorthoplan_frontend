type ImageUploadSession = Readonly<{
  uploadId: string
  imageId: string
  caseId: string
  kind: "DICOM" | "PNG" | "JPEG"
  mediaType: "application/dicom" | "image/dicom" | "image/png" | "image/jpeg"
  sizeBytes: number
  sha256: string
  status: "PENDING_UPLOAD"
  upload: Readonly<{
    method: "POST"
    url: string
    fields: Record<string, string>
    expiresAt: string
  }>
}>

type ImageUploadIdentity = Pick<ImageUploadSession,
  "uploadId" | "imageId" | "caseId" | "kind" | "mediaType" | "sizeBytes" | "sha256">

export type { ImageUploadIdentity, ImageUploadSession }
