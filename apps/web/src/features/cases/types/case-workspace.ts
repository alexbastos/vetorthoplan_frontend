import type { CaseFileSummary, CaseSummary } from "./cases"

type ImagePoint = Readonly<{ x: number; y: number }>

type CalibrationMarker =
  | Readonly<{ kind: "line"; start: ImagePoint; end: ImagePoint }>
  | Readonly<{ kind: "circle"; center: ImagePoint; radiusPx: number;
      /** Remote plans retain the source-pixel edge, including partially visible circles. */
      edge?: ImagePoint }>

type PixelSpacing = Readonly<{ rowMm: number; columnMm: number }>

type DicomScaleEvidence = Readonly<{
  pixelSpacing: PixelSpacing | null
  imagerPixelSpacing: PixelSpacing | null
  calibrationType: "fiducial" | "geometry" | null
}>

type ImageOrientation = Readonly<{
  laterality: "left" | "right" | null
  radiographicView: "craniocaudal" | "mediolateral" | "other" | null
}>

type ImageRendering =
  | Readonly<{ status: "processing" }>
  | Readonly<{
      status: "ready"
      url: string
      widthPx: number
      heightPx: number
      /** Razão entre a altura e a largura física de um pixel. */
      pixelAspectRatio: number
    }>
  | Readonly<{ status: "unavailable"; reason: "invalid-image" | "renderer-unavailable" }>

type CaseImageCalibration = Readonly<{
  imageId: string
  marker: CalibrationMarker
  referenceSizeMm: number
  pixelSpacing: PixelSpacing
  revision: number
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
}>

type CaseWorkspaceImage = Readonly<{
  kind: "image"
  file: CaseFileSummary
  format: "dicom" | "jpeg" | "png"
  originalUrl: string | null
  rendering: ImageRendering
  laterality: ImageOrientation["laterality"]
  radiographicView: ImageOrientation["radiographicView"]
  /** Evidência do arquivo; não equivale à calibração validada pelo usuário. */
  dicomScaleEvidence: DicomScaleEvidence | null
  calibration: CaseImageCalibration | null
}>

type CaseWorkspaceAttachment = Readonly<{
  kind: "attachment"
  file: CaseFileSummary
  format: "pdf" | "mp4"
}>

type CaseWorkspaceFile = CaseWorkspaceImage | CaseWorkspaceAttachment

type CaseWorkspace = Readonly<{
  case: CaseSummary
  files: readonly CaseWorkspaceFile[]
}>

type SaveImageCalibrationInput = Readonly<{
  caseId: string
  imageId: string
  marker: CalibrationMarker
  referenceSizeMm: number
  /** null ao criar; revisão atual ao substituir. */
  expectedRevision: number | null
}>

type UpdateImageOrientationInput = Readonly<{
  caseId: string
  imageId: string
  orientation: ImageOrientation
}>

export type {
  CalibrationMarker,
  CaseImageCalibration,
  CaseWorkspace,
  CaseWorkspaceFile,
  CaseWorkspaceImage,
  DicomScaleEvidence,
  ImageOrientation,
  ImagePoint,
  ImageRendering,
  PixelSpacing,
  SaveImageCalibrationInput,
  UpdateImageOrientationInput,
}
