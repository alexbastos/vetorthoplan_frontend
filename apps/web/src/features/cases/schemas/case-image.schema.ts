import { z } from "zod"

const ImageStatusSchema = z.enum([
  "PENDING_UPLOAD", "QUARANTINED", "PROCESSING", "READY", "REJECTED", "FAILED", "CANCELLED",
])
const PixelSpacingMmSchema = z.tuple([z.number(), z.number()]).nullable()
const ImageOrientationPatientSchema = z.tuple([
  z.number(), z.number(), z.number(), z.number(), z.number(), z.number(),
]).nullable()

export { ImageOrientationPatientSchema, ImageStatusSchema, PixelSpacingMmSchema }
