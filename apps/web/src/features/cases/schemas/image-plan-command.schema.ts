import { z } from "zod"
import { angleHasValidArms } from "../lib/angle-geometry"
import { circleHasValidRadius } from "../lib/circle-geometry"

import { PlanAngleInputSchema, PlanCircleInputSchema, PlanDocumentSchema, PlanLineInputSchema, SaveCalibrationSchema, TploLandmarksInputSchema,
  calibrationMatches, landmarksMatches, type ImagePlan } from "./image-plan.schema"

// Commands grow with each feature. Never accept a full document or server-owned
// measurements, eligibility decisions, review identity or audit from the browser.
const SaveRadiographicQualitySchema = z.object({
  kind: z.literal("radiographic-quality"),
  baseRevision: SaveCalibrationSchema.shape.baseRevision,
  quality: PlanDocumentSchema.shape.radiographic_quality.unwrap().unwrap().extend({ notes: z.string().max(2000).nullable().default(null) }),
}).strict()
const baseRevision = SaveCalibrationSchema.shape.baseRevision
const distanceId = PlanLineInputSchema.shape.id.transform(id => id.toLowerCase())
const distanceGeometry = { start: PlanLineInputSchema.shape.start, end: PlanLineInputSchema.shape.end }
const distinctEndpoints = ({ start, end }: Pick<z.infer<typeof PlanLineInputSchema>, "start" | "end">) => start.x !== end.x || start.y !== end.y
const nonzeroLine = { message: "A distance line must have distinct endpoints", path: ["end"] }
const CreateDistanceSchema = z.object({
  kind: z.literal("distance-create"), baseRevision, id: distanceId, ...distanceGeometry,
  label: PlanLineInputSchema.shape.label.default(null),
}).strict().refine(distinctEndpoints, nonzeroLine)
const UpdateDistanceSchema = z.object({
  kind: z.literal("distance-update"), baseRevision, id: distanceId, ...distanceGeometry,
}).strict().refine(distinctEndpoints, nonzeroLine)
const DeleteDistanceSchema = z.object({ kind: z.literal("distance-delete"), baseRevision, id: distanceId }).strict()
const SaveDistanceSchema = z.discriminatedUnion("kind", [CreateDistanceSchema, UpdateDistanceSchema, DeleteDistanceSchema])
const angleId = PlanAngleInputSchema.shape.id.transform(id => id.toLowerCase())
const angleGeometry = { start: PlanAngleInputSchema.shape.start, vertex: PlanAngleInputSchema.shape.vertex, end: PlanAngleInputSchema.shape.end }
const nonzeroArms = { message: "Both angle arms must have distinct endpoints", path: ["vertex"] }
const CreateAngleSchema = z.object({
  kind: z.literal("angle-create"), baseRevision, id: angleId, ...angleGeometry,
  label: PlanAngleInputSchema.shape.label.default(null),
}).strict().refine(angleHasValidArms, nonzeroArms)
const UpdateAngleSchema = z.object({
  kind: z.literal("angle-update"), baseRevision, id: angleId, ...angleGeometry,
}).strict().refine(angleHasValidArms, nonzeroArms)
const DeleteAngleSchema = z.object({ kind: z.literal("angle-delete"), baseRevision, id: angleId }).strict()
const SaveAngleSchema = z.discriminatedUnion("kind", [CreateAngleSchema, UpdateAngleSchema, DeleteAngleSchema])
const circleId = PlanCircleInputSchema.shape.id.transform(id => id.toLowerCase())
const circleGeometry = { center: PlanCircleInputSchema.shape.center, edge: PlanCircleInputSchema.shape.edge }
const nonzeroRadius = { message: "A circle must have a nonzero radius", path: ["edge"] }
const CreateCircleSchema = z.object({
  kind: z.literal("circle-create"), baseRevision, id: circleId, ...circleGeometry,
  label: PlanCircleInputSchema.shape.label.default(null),
}).strict().refine(circleHasValidRadius, nonzeroRadius)
const UpdateCircleSchema = z.object({
  kind: z.literal("circle-update"), baseRevision, id: circleId, ...circleGeometry,
}).strict().refine(circleHasValidRadius, nonzeroRadius)
const DeleteCircleSchema = z.object({ kind: z.literal("circle-delete"), baseRevision, id: circleId }).strict()
const SaveCircleSchema = z.discriminatedUnion("kind", [CreateCircleSchema, UpdateCircleSchema, DeleteCircleSchema])
const SetLandmarksSchema = z.object({ kind: z.literal("landmarks-set"), baseRevision, landmarks: TploLandmarksInputSchema }).strict()
const ClearLandmarksSchema = z.object({ kind: z.literal("landmarks-clear"), baseRevision }).strict()
const SaveLandmarksSchema = z.discriminatedUnion("kind", [SetLandmarksSchema, ClearLandmarksSchema])
// The same strict command contract validates browser transport and BFF input.
const SavePlanEditSchema = z.discriminatedUnion("kind", [SaveRadiographicQualitySchema,
  ...SaveDistanceSchema.options, ...SaveAngleSchema.options, ...SaveCircleSchema.options, ...SaveLandmarksSchema.options])
const PlanSaveCommandSchema = z.union([SaveCalibrationSchema, SavePlanEditSchema])

type SaveRadiographicQualityInput = z.infer<typeof SaveRadiographicQualitySchema>
type SaveDistanceInput = z.infer<typeof SaveDistanceSchema>
type SaveAngleInput = z.infer<typeof SaveAngleSchema>
type SaveCircleInput = z.infer<typeof SaveCircleSchema>
type SaveLandmarksInput = z.infer<typeof SaveLandmarksSchema>
type SavePlanEditInput = z.infer<typeof SavePlanEditSchema>
type PlanSaveCommand = z.infer<typeof PlanSaveCommandSchema>
type PlanCommandOwner = "calibration" | "radiographic-quality" | "distance" | "angle" | "circle" | "landmarks"

function isDistanceCommand(command: PlanSaveCommand | undefined): command is SaveDistanceInput {
  return Boolean(command && "kind" in command && (command.kind === "distance-create" || command.kind === "distance-update" || command.kind === "distance-delete"))
}

function isAngleCommand(command: PlanSaveCommand | undefined): command is SaveAngleInput {
  return Boolean(command && "kind" in command && (command.kind === "angle-create" || command.kind === "angle-update" || command.kind === "angle-delete"))
}

function isCircleCommand(command: PlanSaveCommand | undefined): command is SaveCircleInput {
  return Boolean(command && "kind" in command && (command.kind === "circle-create" || command.kind === "circle-update" || command.kind === "circle-delete"))
}

function isLandmarksCommand(command: PlanSaveCommand | undefined): command is SaveLandmarksInput {
  return Boolean(command && "kind" in command && (command.kind === "landmarks-set" || command.kind === "landmarks-clear"))
}

function planCommandOwner(command: PlanSaveCommand): PlanCommandOwner {
  if (!("kind" in command)) return "calibration"
  switch (command.kind) {
    case "radiographic-quality": return "radiographic-quality"
    case "distance-create": case "distance-update": case "distance-delete": return "distance"
    case "angle-create": case "angle-update": case "angle-delete": return "angle"
    case "circle-create": case "circle-update": case "circle-delete": return "circle"
    case "landmarks-set": case "landmarks-clear": return "landmarks"
  }
}

const sameId = (left: string, right: string) => left.toLowerCase() === right.toLowerCase()
const hasUniquePlanObjectIds = (document: ImagePlan["document"]) =>
  new Set(document.objects.map(object => object.id.toLowerCase())).size === document.objects.length

function planCommandMatches(plan: ImagePlan, command: PlanSaveCommand): boolean {
  const parsed = PlanSaveCommandSchema.safeParse(command)
  if (!parsed.success) return false
  const input = parsed.data
  if (!("kind" in input)) {
    return calibrationMatches(plan.document.calibration, input.calibration)
      && (input.calibration === null || Boolean(plan.document.calibration?.result))
  }
  if (input.kind === "radiographic-quality") {
    const quality = SaveRadiographicQualitySchema.shape.quality.safeParse(plan.document.radiographic_quality)
    return quality.success && JSON.stringify(quality.data) === JSON.stringify(input.quality)
  }
  if (isLandmarksCommand(input)) {
    return plan.revision > input.baseRevision
      && landmarksMatches(plan.document.tplo_landmarks, input.kind === "landmarks-clear" ? null : input.landmarks)
  }
  if (!hasUniquePlanObjectIds(plan.document)) return false
  const target = plan.document.objects.find(object => sameId(object.id, input.id))
  if (isCircleCommand(input)) {
    if (plan.revision <= input.baseRevision) return false
    if (input.kind === "circle-delete") return target === undefined
    return target?.type === "CIRCLE" && target.center.x === input.center.x && target.center.y === input.center.y
      && target.edge.x === input.edge.x && target.edge.y === input.edge.y
      && (input.kind !== "circle-create" || (target.label ?? null) === input.label)
  }
  if (isAngleCommand(input)) {
    if (plan.revision <= input.baseRevision) return false
    if (input.kind === "angle-delete") return target === undefined
    return target?.type === "ANGLE" && target.start.x === input.start.x && target.start.y === input.start.y
      && target.vertex.x === input.vertex.x && target.vertex.y === input.vertex.y
      && target.end.x === input.end.x && target.end.y === input.end.y
      && (input.kind !== "angle-create" || (target.label ?? null) === input.label)
  }
  if (input.kind === "distance-delete") return target === undefined
  // Saving geometry and having a calculated result are different states.
  // Missing measurements must not cause an acknowledged write to be replayed.
  return target?.type === "LINE" && target.start.x === input.start.x && target.start.y === input.start.y
    && target.end.x === input.end.x && target.end.y === input.end.y
    && (input.kind !== "distance-create" || (target.label ?? null) === input.label)
}

function applyPlanCommand(document: ImagePlan["document"], command: PlanSaveCommand): ImagePlan["document"] {
  const input = PlanSaveCommandSchema.parse(command)
  if (!("kind" in input)) return { ...document, calibration: input.calibration }
  if (input.kind === "radiographic-quality") return { ...document, radiographic_quality: input.quality }
  if (isLandmarksCommand(input)) {
    // Both results depend on these references. The backend recomputes them;
    // every other clinical field and object is preserved, including audit.
    const { tplo_measurement: _measurement, tplo_correction: _correction, ...retained } = document
    return { ...retained, tplo_landmarks: input.kind === "landmarks-clear" ? null : input.landmarks }
  }
  if (!hasUniquePlanObjectIds(document)) return invalidMutation("Plan object IDs must be unique")
  const target = document.objects.find(object => sameId(object.id, input.id))
  if (isCircleCommand(input)) {
    if (input.kind === "circle-create") {
      if (target) return invalidMutation("The circle ID already belongs to a plan object")
      if (document.objects.length >= 500) return invalidMutation("The plan already contains 500 objects")
      return { ...document, objects: [...document.objects,
        { id: input.id, type: "CIRCLE", center: input.center, edge: input.edge, label: input.label, visible: true, locked: false }] }
    }
    if (target?.type !== "CIRCLE") return invalidMutation("The circle target must be an existing CIRCLE")
    if (target.locked) return invalidMutation("The circle target is locked")
    if (input.kind === "circle-delete") return { ...document, objects: document.objects.filter(object => object !== target) }
    const { measurement: _measurement, ...circle } = target
    return { ...document, objects: document.objects.map(object => object === target
      ? { ...circle, center: input.center, edge: input.edge } : object) }
  }
  if (isAngleCommand(input)) {
    if (input.kind === "angle-create") {
      if (target) return invalidMutation("The angle ID already belongs to a plan object")
      if (document.objects.length >= 500) return invalidMutation("The plan already contains 500 objects")
      return { ...document, objects: [...document.objects,
        { id: input.id, type: "ANGLE", start: input.start, vertex: input.vertex, end: input.end, label: input.label, visible: true, locked: false }] }
    }
    if (target?.type !== "ANGLE") return invalidMutation("The angle target must be an existing ANGLE")
    if (target.locked) return invalidMutation("The angle target is locked")
    if (input.kind === "angle-delete") return { ...document, objects: document.objects.filter(object => object !== target) }
    const { measurement: _measurement, ...angle } = target
    return { ...document, objects: document.objects.map(object => object === target
      ? { ...angle, start: input.start, vertex: input.vertex, end: input.end } : object) }
  }
  if (input.kind === "distance-create") {
    if (target) return invalidMutation("The distance ID already belongs to a plan object")
    if (document.objects.length >= 500) return invalidMutation("The plan already contains 500 objects")
    return { ...document, objects: [...document.objects,
      { id: input.id, type: "LINE", start: input.start, end: input.end, label: input.label, visible: true, locked: false }] }
  }
  if (target?.type !== "LINE") return invalidMutation("The distance target must be an existing LINE")
  if (target.locked) return invalidMutation("The distance target is locked")
  if (input.kind === "distance-delete") return { ...document, objects: document.objects.filter(object => object !== target) }
  // Discard only the edited line's stale derived result. Other objects and
  // clinical fields survive unchanged; the backend recomputes measurements.
  const { measurement: _measurement, ...line } = target
  return { ...document, objects: document.objects.map(object => object === target
    ? { ...line, start: input.start, end: input.end } : object) }
}

function invalidMutation(message: string): never {
  throw new z.ZodError([{ code: "custom", path: ["objects"], message }])
}

export { CreateDistanceSchema, UpdateDistanceSchema, DeleteDistanceSchema, SaveDistanceSchema,
  CreateAngleSchema, UpdateAngleSchema, DeleteAngleSchema, SaveAngleSchema,
  CreateCircleSchema, UpdateCircleSchema, DeleteCircleSchema, SaveCircleSchema,
  SetLandmarksSchema, ClearLandmarksSchema, SaveLandmarksSchema,
  PlanSaveCommandSchema, SavePlanEditSchema, SaveRadiographicQualitySchema, applyPlanCommand, planCommandMatches, hasUniquePlanObjectIds,
  isDistanceCommand, isAngleCommand, isCircleCommand, isLandmarksCommand, planCommandOwner }
export type { PlanSaveCommand, PlanCommandOwner, SavePlanEditInput, SaveDistanceInput, SaveAngleInput, SaveCircleInput, SaveLandmarksInput, SaveRadiographicQualityInput }
