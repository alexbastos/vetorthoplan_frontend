import { z } from "zod"

import type { CaseImageCalibration, CaseWorkspace } from "../types/case-workspace"
import { CaseSummarySchema } from "./cases.schema"

const PointSchema = z.object({ x: z.number().finite(), y: z.number().finite() })
const MarkerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("line"), start: PointSchema, end: PointSchema }),
  z.object({ kind: z.literal("circle"), center: PointSchema, radiusPx: z.number().finite().positive() }),
])
const PixelSpacingSchema = z.object({
  rowMm: z.number().finite().positive(),
  columnMm: z.number().finite().positive(),
})
const CalibrationSchema: z.ZodType<CaseImageCalibration> = z.object({
  imageId: z.string().min(1),
  marker: MarkerSchema,
  referenceSizeMm: z.number().finite().positive(),
  pixelSpacing: PixelSpacingSchema,
  revision: z.number().int().positive(),
  createdAt: z.string().datetime({ offset: true }),
  createdBy: z.string().min(1),
  updatedAt: z.string().datetime({ offset: true }),
  updatedBy: z.string().min(1),
})
const FileSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  size: z.number().int().positive(),
  type: z.string().min(1),
  uploadedAt: z.string().datetime({ offset: true }).optional(),
})
const RenderingSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("processing") }),
  z.object({
    status: z.literal("ready"),
    url: z.string().min(1),
    widthPx: z.number().int().positive(),
    heightPx: z.number().int().positive(),
    pixelAspectRatio: z.number().finite().positive(),
  }),
  z.object({ status: z.literal("unavailable"), reason: z.enum(["invalid-image", "renderer-unavailable"]) }),
])
const DicomScaleEvidenceSchema = z.object({
  pixelSpacing: PixelSpacingSchema.nullable(),
  imagerPixelSpacing: PixelSpacingSchema.nullable(),
  calibrationType: z.enum(["fiducial", "geometry"]).nullable(),
})
const WorkspaceFileSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("image"),
    file: FileSummarySchema,
    format: z.enum(["dicom", "jpeg", "png"]),
    originalUrl: z.string().min(1).nullable(),
    rendering: RenderingSchema,
    laterality: z.enum(["left", "right"]).nullable(),
    radiographicView: z.enum(["craniocaudal", "mediolateral", "other"]).nullable(),
    dicomScaleEvidence: DicomScaleEvidenceSchema.nullable(),
    calibration: CalibrationSchema.nullable(),
  }),
  z.object({
    kind: z.literal("attachment"),
    file: FileSummarySchema,
    format: z.enum(["pdf", "mp4"]),
  }),
])
const WorkspaceResponseSchema: z.ZodType<CaseWorkspace> = z.object({
  case: CaseSummarySchema,
  files: z.array(WorkspaceFileSchema),
})

function parseCaseWorkspaceResponse(value: unknown): CaseWorkspace | undefined {
  const result = WorkspaceResponseSchema.safeParse(value)
  if (!result.success) return undefined
  if (result.data.files.some((file) => file.kind === "image"
    && file.calibration && file.calibration.imageId !== file.file.id)) return undefined
  return result.data
}

function parseImageCalibrationResponse(value: unknown): CaseImageCalibration | undefined {
  const result = CalibrationSchema.safeParse(value)
  return result.success ? result.data : undefined
}

export { parseCaseWorkspaceResponse, parseImageCalibrationResponse }
