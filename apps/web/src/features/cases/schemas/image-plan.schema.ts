import type { GetImagePlanResponse } from "@vetorthoplan/api-client/clinical-contract"
import { z } from "zod"

const number = z.number().finite()
const positive = number.positive()
const hash = z.string().regex(/^[0-9a-f]{64}$/)
const point = z.object({ x: number.min(0).max(1), y: number.min(0).max(1) }).strict()
const samePoint = (a: z.infer<typeof point>, b: z.infer<typeof point>) => a.x === b.x && a.y === b.y
const lineInput = z.object({ kind: z.literal("REFERENCE_LINE"), start: point, end: point,
  known_length_mm: positive.max(10000) }).strict()
const circleInput = z.object({ kind: z.literal("REFERENCE_CIRCLE"), center: point, edge: point,
  known_diameter_mm: positive.max(10000) }).strict()
const referenceValid = (value: z.infer<typeof lineInput> | z.infer<typeof circleInput>) => value.kind === "REFERENCE_LINE"
  ? !samePoint(value.start, value.end) : !samePoint(value.center, value.edge)

const CalibrationInputSchema = z.discriminatedUnion("kind", [lineInput, circleInput]).refine(referenceValid)
const calibrationResult = z.object({ calibration_id: hash, reference_length_px: positive, mm_per_pixel: positive }).strict()
const calibration = z.discriminatedUnion("kind", [
  lineInput.extend({ result: calibrationResult.nullable().optional() }),
  circleInput.extend({ result: calibrationResult.nullable().optional() }),
]).refine(referenceValid)
const derived = z.object({ status: z.enum(["CALCULATED", "CALIBRATION_REQUIRED", "IMAGE_DIMENSIONS_REQUIRED"]),
  calibration_id: hash.nullable().optional(), values: z.record(z.string(), number).optional(),
  units: z.record(z.string(), z.enum(["mm", "degrees"])).optional() }).strict()
const common = { id: z.string().uuid(), label: z.string().max(120).nullable().optional(), measurement: derived.nullable().optional() }
const simulation = z.object({ status: z.enum(["SIMULATED", "CALIBRATION_REQUIRED", "IMAGE_DIMENSIONS_REQUIRED", "FRAGMENT_REQUIRED"]),
  calibration_id: hash.nullable().optional(), center_px: z.record(z.string(), number).optional(),
  radius_mm: positive.nullable().optional(), rotation_degrees: number.min(-180).max(180).nullable().optional(),
  affine_matrix: z.array(z.array(number)).optional() }).strict()
const objects = z.discriminatedUnion("type", [
  z.object({ ...common, type: z.literal("LINE"), start: point, end: point }).strict(),
  z.object({ ...common, type: z.literal("ANGLE"), start: point, vertex: point, end: point }).strict(),
  z.object({ ...common, type: z.literal("CIRCLE"), center: point, edge: point }).strict(),
  z.object({ ...common, type: z.literal("TPLO"), center: point, edge: point, rotation_degrees: number.min(-180).max(180),
    fragment: z.object({ points: z.array(point).min(3).max(500), label: z.string().max(120).nullable().optional() }).strict().nullable().optional(),
    simulation: simulation.nullable().optional() }).strict(),
])
const method = z.enum(["MEDIAL_CONDYLE_CRANIAL_CRUCIATE_FULL_AXIS_V1", "CONVENTIONAL_FULL_MECHANICAL_AXIS_V1"])
const slope = number.min(0).max(90).nullable().optional()
const note = z.string().max(2000).nullable().optional()
// Strict nested objects fail closed on an unknown future field instead of silently
// stripping it and overwriting the stored document during a calibration-only save.
const PlanDocumentSchema = z.object({
  schema_version: z.literal(1), calibration: calibration.nullable(), objects: z.array(objects).max(500),
  tplo: z.object({ laterality: z.enum(["LEFT", "RIGHT"]),
    projection: z.enum(["MEDIOLATERAL", "CRANIOCAUDAL", "UNKNOWN"]).default("UNKNOWN"),
    image_quality: z.enum(["ACCEPTABLE", "LIMITED", "REJECTED"]).default("LIMITED"),
    eligibility: z.enum(["PENDING", "ELIGIBLE", "INELIGIBLE"]).default("PENDING"),
    eligibility_reasons: z.array(z.string()).max(10).optional(), current_slope_degrees: slope, target_slope_degrees: slope, notes: note,
  }).strict().nullable().optional(),
  tplo_landmarks: z.object({ method: method.default("MEDIAL_CONDYLE_CRANIAL_CRUCIATE_FULL_AXIS_V1"), plateau_cranial: point, plateau_caudal: point,
    intercondylar_midpoint: point, talus_center: point }).strict().nullable().optional(),
  tplo_measurement: z.object({ method, status: z.enum(["CALCULATED", "LANDMARKS_REQUIRED", "IMAGE_DIMENSIONS_REQUIRED"]),
    tpa_degrees: slope, plateau_length_mm: positive.nullable().optional(), tibial_axis_length_mm: positive.nullable().optional(),
    calibration_id: hash.nullable().optional(), clinically_validated: z.literal(false).default(false),
  }).strict().nullable().optional(),
  clinical_validation: z.object({ status: z.enum(["DRAFT", "READY_FOR_REVIEW", "APPROVED", "REJECTED"]).default("DRAFT"),
    orientation_confirmed: z.boolean().default(false), image_quality_confirmed: z.boolean().default(false),
    calibration_confirmed: z.boolean().default(false), anatomical_references_confirmed: z.boolean().default(false),
    required_measurements: z.array(z.enum(["TPA", "PLATEAU_AXIS", "TIBIAL_AXIS"])).max(10).optional(),
    reviewer_notes: note, rejection_reason: note,
  }).strict().nullable().optional(),
}).strict()

const revision = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const timestamp = z.iso.datetime({ offset: true }).nullable()
const UpstreamImagePlanSchema = z.object({ image_id: z.string().uuid(), revision, document: PlanDocumentSchema, updated_at: timestamp }) satisfies z.ZodType<GetImagePlanResponse>
const ImagePlanSchema = z.object({ imageId: z.string().uuid(), revision, document: PlanDocumentSchema, updatedAt: timestamp }).strict()
  .refine(plan => plan.revision > 0 ? plan.updatedAt !== null : plan.updatedAt === null && Object.entries(plan.document).every(([key, value]) =>
    key === "schema_version" || key === "objects" && Array.isArray(value) && value.length === 0 || value === null || value === undefined))
const SaveCalibrationSchema = z.object({ baseRevision: revision.max(Number.MAX_SAFE_INTEGER - 1), calibration: CalibrationInputSchema.nullable() }).strict()

type ImagePlan = z.infer<typeof ImagePlanSchema>
type CalibrationInput = z.infer<typeof CalibrationInputSchema>
type SaveCalibrationInput = z.infer<typeof SaveCalibrationSchema>

function calibrationInputOf(value: ImagePlan["document"]["calibration"]): CalibrationInput | null {
  if (value === null) return null
  const { result: _result, ...input } = value
  return CalibrationInputSchema.parse(input)
}

function calibrationMatches(value: ImagePlan["document"]["calibration"], input: CalibrationInput | null): boolean {
  return JSON.stringify(calibrationInputOf(value)) === JSON.stringify(input)
}

export { CalibrationInputSchema, ImagePlanSchema, PlanDocumentSchema, SaveCalibrationSchema, UpstreamImagePlanSchema,
  calibrationInputOf, calibrationMatches }
export type { CalibrationInput, ImagePlan, SaveCalibrationInput }
