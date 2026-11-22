import { hasUniquePlanObjectIds } from "../schemas/image-plan-command.schema"
import { PlanTploInputSchema, type ImagePlan } from "../schemas/image-plan.schema"
import type { ImagePoint } from "../types/case-workspace"
import type { ImageDimensions } from "./image-point-space"
import type { TploGeometry } from "./tplo-geometry"

type TploObject = Extract<ImagePlan["document"]["objects"][number], { type: "TPLO" }>
type TploUnavailableReason = "missing" | "calibration" | "dimensions" | "anisotropy" | "fragment" | "outdated" | "invalid" | "unverified" | "ambiguous"
type TploMeasurementResult = { status: "available"; radiusMm: number; rotationDegrees: number }
  | { status: "unavailable"; reason: TploUnavailableReason }
type TploMatrix = readonly [readonly [number, number, number], readonly [number, number, number]]
type TploSimulationResult = { status: "available"; matrix: TploMatrix; pointsPx: readonly ImagePoint[]; pointSource: "server" | "matrix" }
  | { status: "unavailable"; reason: TploUnavailableReason }
type SavedTplo = { object: TploObject; origin: TploGeometry | null; measurement: TploMeasurementResult;
  simulation: TploSimulationResult; ambiguous: boolean; revision: number }
type TploReadContext = { dimensions: ImageDimensions | null; expectedImageId?: string; readError?: boolean;
  geometryIssue?: "dimensions" | "anisotropy" | null }
type Calibration = ImagePlan["document"]["calibration"]

const unavailable = (reason: TploUnavailableReason) => ({ status: "unavailable" as const, reason })
// Numerical coherence only, unrelated to the clinical protocol's tolerance.
const near = (a: number, b: number) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
const degrees = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180
const positive = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0
const validDimensions = (value: ImageDimensions | null): value is ImageDimensions => Boolean(value
  && positive(value.widthPx) && positive(value.heightPx))

function finitePoint(value: unknown): value is ImagePoint {
  if (!value || typeof value !== "object") return false
  const point = value as Partial<ImagePoint>
  return typeof point.x === "number" && Number.isFinite(point.x) && typeof point.y === "number" && Number.isFinite(point.y)
}

function savedTploOrigin(object: TploObject): TploGeometry | null {
  const parsed = PlanTploInputSchema.safeParse({ id: object.id, type: object.type, center: object.center, edge: object.edge,
    rotation_degrees: object.rotation_degrees, fragment: object.fragment, label: object.label })
  return parsed.success ? { center: parsed.data.center, edge: parsed.data.edge, fragment: parsed.data.fragment?.points ?? null, fragmentClosed: true } : null
}

function expectedRadius(object: TploObject, dimensions: ImageDimensions, calibration: NonNullable<Calibration>["result"]) {
  return calibration ? Math.hypot((object.edge.x - object.center.x) * dimensions.widthPx,
    (object.edge.y - object.center.y) * dimensions.heightPx) * calibration.mm_per_pixel : NaN
}

function confirmedTploMeasurement(object: TploObject, calibration: Calibration, dimensions: ImageDimensions): TploMeasurementResult {
  const measurement = object.measurement
  if (!measurement) return unavailable("missing")
  if (measurement.status === "CALIBRATION_REQUIRED") return unavailable("calibration")
  if (measurement.status === "IMAGE_DIMENSIONS_REQUIRED") return unavailable("dimensions")
  if (measurement.status !== "CALCULATED") return unavailable("invalid")
  if (!calibration?.result) return unavailable("calibration")
  if (!measurement.calibration_id || measurement.calibration_id !== calibration.result.calibration_id) return unavailable("outdated")
  const radius = measurement.values?.radius, rotation = measurement.values?.rotation
  if (radius == null || rotation == null || !measurement.units?.radius || !measurement.units?.rotation) return unavailable("missing")
  if (!positive(radius) || !degrees(rotation) || measurement.units.radius !== "mm" || measurement.units.rotation !== "degrees") return unavailable("invalid")
  if (!near(radius, expectedRadius(object, dimensions, calibration.result)) || !near(rotation, object.rotation_degrees)) return unavailable("outdated")
  // Return only server values; local calculations above only verify coherence.
  return { status: "available", radiusMm: radius, rotationDegrees: rotation }
}

function readTploMatrix(value: unknown): TploMatrix | null {
  return Array.isArray(value) && value.length === 2 && value.every(row => Array.isArray(row) && row.length === 3
    && row.every(number => typeof number === "number" && Number.isFinite(number)))
    ? [[value[0][0], value[0][1], value[0][2]], [value[1][0], value[1][1], value[1][2]]] : null
}

function matrixIsRotation(matrix: TploMatrix) {
  const [[a, b], [c, d]] = matrix
  return near(a * a + c * c, 1) && near(b * b + d * d, 1) && near(a * b + c * d, 0) && near(a * d - b * c, 1)
}

function matrixMatchesOrigin(matrix: TploMatrix, object: TploObject, dimensions: ImageDimensions) {
  const angle = object.rotation_degrees * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle)
  const x = object.center.x * dimensions.widthPx, y = object.center.y * dimensions.heightPx
  const expected = [[c, -s, x - c * x + s * y], [s, c, y - s * x - c * y]]
  return matrix.every((row, index) => row.every((value, column) => near(value, expected[index][column])))
}

function applyOfficialMatrix(matrix: TploMatrix, point: ImagePoint, dimensions: ImageDimensions): ImagePoint | null {
  const x = point.x * dimensions.widthPx, y = point.y * dimensions.heightPx
  const result = { x: matrix[0][0] * x + matrix[0][1] * y + matrix[0][2], y: matrix[1][0] * x + matrix[1][1] * y + matrix[1][2] }
  return finitePoint(result) ? result : null
}

function confirmedTploSimulation(object: TploObject, calibration: Calibration, dimensions: ImageDimensions): TploSimulationResult {
  const simulation = object.simulation
  if (!simulation) return unavailable("missing")
  if (simulation.status === "CALIBRATION_REQUIRED") return unavailable("calibration")
  if (simulation.status === "IMAGE_DIMENSIONS_REQUIRED") return unavailable("dimensions")
  if (simulation.status === "FRAGMENT_REQUIRED") return unavailable("fragment")
  if (simulation.status !== "SIMULATED") return unavailable("invalid")
  if (!calibration?.result) return unavailable("calibration")
  if (!simulation.calibration_id || simulation.calibration_id !== calibration.result.calibration_id) return unavailable("outdated")
  if (!object.fragment || object.fragment.points.length < 3) return unavailable("outdated")
  const rawMatrix = simulation.affine_matrix
  if (!rawMatrix || rawMatrix.length === 0) return unavailable("missing")
  const matrix = readTploMatrix(rawMatrix)
  if (!matrix || !matrixIsRotation(matrix)) return unavailable("invalid")
  if (!matrixMatchesOrigin(matrix, object, dimensions)) return unavailable("outdated")
  const center = simulation.center_px
  if (center && Object.keys(center).length) {
    if (!finitePoint(center)) return unavailable("invalid")
    if (!near(center.x, object.center.x * dimensions.widthPx) || !near(center.y, object.center.y * dimensions.heightPx)) return unavailable("outdated")
  }
  if (simulation.radius_mm != null) {
    if (!positive(simulation.radius_mm)) return unavailable("invalid")
    if (!near(simulation.radius_mm, expectedRadius(object, dimensions, calibration.result))) return unavailable("outdated")
  }
  if (simulation.rotation_degrees != null) {
    if (!degrees(simulation.rotation_degrees)) return unavailable("invalid")
    if (!near(simulation.rotation_degrees, object.rotation_degrees)) return unavailable("outdated")
  }
  const transformed = object.fragment.points.map(point => applyOfficialMatrix(matrix, point, dimensions))
  if (transformed.some(point => point === null)) return unavailable("invalid")
  const official = simulation.transformed_fragment_points_px
  if (official !== undefined) {
    if (!Array.isArray(official) || official.length !== object.fragment.points.length || !official.every(finitePoint)) return unavailable("invalid")
    if (!official.every((point, index) => near(point.x, transformed[index]!.x) && near(point.y, transformed[index]!.y))) return unavailable("outdated")
    return { status: "available", matrix, pointsPx: official.map(point => ({ x: point.x, y: point.y })), pointSource: "server" }
  }
  // Legacy compatibility uses the official matrix, never a locally generated
  // matrix or repeated rotation of already-transformed points. No output clamp.
  return { status: "available", matrix, pointsPx: transformed as ImagePoint[], pointSource: "matrix" }
}

function selectSavedTplo(plan: ImagePlan | undefined, context: TploReadContext = { dimensions: null }): SavedTplo[] {
  if (!plan || context.expectedImageId !== undefined && context.expectedImageId.toLowerCase() !== plan.imageId.toLowerCase()) return []
  const uniqueIds = hasUniquePlanObjectIds(plan.document)
  const counts = new Map<string, number>()
  for (const object of plan.document.objects) counts.set(object.id.toLowerCase(), (counts.get(object.id.toLowerCase()) ?? 0) + 1)
  const reason: TploUnavailableReason | null = context.readError ? "unverified" : !uniqueIds ? "ambiguous"
    : !validDimensions(context.dimensions) || context.geometryIssue === "dimensions" ? "dimensions"
      : context.geometryIssue === "anisotropy" ? "anisotropy" : null
  return plan.document.objects.filter((object): object is TploObject => object.type === "TPLO").map(object => {
    const origin = savedTploOrigin(object), unavailableReason = reason ?? (!origin ? "invalid" : null)
    const dimensions = context.dimensions
    return { object, origin, ambiguous: (counts.get(object.id.toLowerCase()) ?? 0) > 1, revision: plan.revision,
      measurement: unavailableReason ? unavailable(unavailableReason) : confirmedTploMeasurement(object, plan.document.calibration, dimensions!),
      simulation: unavailableReason ? unavailable(unavailableReason) : confirmedTploSimulation(object, plan.document.calibration, dimensions!) }
  })
}

export { selectSavedTplo, savedTploOrigin, readTploMatrix }
export type { TploObject, TploUnavailableReason, TploMeasurementResult, TploSimulationResult, TploMatrix, SavedTplo, TploReadContext }
