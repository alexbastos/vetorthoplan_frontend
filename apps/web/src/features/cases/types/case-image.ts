import type { GetImageResponse } from "@vetorthoplan/api-client/clinical-contract"

type CaseImage = Readonly<{
  id: string
  uploadId: string
  jobId: GetImageResponse["job_id"]
  caseId: string
  originalFilename: string
  displayName: string | null
  kind: "DICOM" | "PNG" | "JPEG"
  mediaType: string
  detectedMediaType: string | null
  sizeBytes: number
  status: GetImageResponse["status"]
  widthPx: number | null
  heightPx: number | null
  rejectionCode: string | null
  createdAt: string
  completedAt: string | null
  processedAt: string | null
  previewAvailable: boolean
  previewWidthPx: number | null
  previewHeightPx: number | null
  /** Original DICOM spacing [rows, columns], in millimetres; never inferred from the preview. */
  pixelSpacingMm: Readonly<NonNullable<GetImageResponse["pixel_spacing_mm"]>> | null
  imagerPixelSpacingMm: Readonly<NonNullable<GetImageResponse["imager_pixel_spacing_mm"]>> | null
  imageOrientationPatient: Readonly<NonNullable<GetImageResponse["image_orientation_patient"]>> | null
}>

export type { CaseImage }
