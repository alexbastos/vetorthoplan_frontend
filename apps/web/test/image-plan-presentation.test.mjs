import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import { readFileSync } from "node:fs"
import test from "node:test"
import { imagePlanFixture, publishedPopulatedDocument } from "./fixtures/image-plan.mjs"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript," }
  if (specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier)) return nextResolve(`${specifier}.ts`, context)
  return nextResolve(specifier, context)
} })
const { ImagePlanSchema, PlanDocumentSchema } = await import("../src/features/cases/schemas/image-plan.schema.ts")
const { SaveDistanceSchema, applyPlanCommand } = await import("../src/features/cases/schemas/image-plan-command.schema.ts")
const { getImagePlanForBff, saveImageCalibrationForBff, saveImagePlanEditForBff } = await import("../src/lib/server/image-plan-bff.ts")
const { fetchImagePlan } = await import("../src/features/cases/services/image-plan-api.ts")
const { selectSavedDistances } = await import("../src/features/cases/lib/distance-result.ts")
const { distanceLine, nextDistanceLabel } = await import("../src/features/cases/lib/distance-editor.ts")
const contract = JSON.parse(readFileSync(new URL("../../../docs/openapi/clinical-api.openapi.json", import.meta.url), "utf8"))
const previousContract = JSON.parse(readFileSync(new URL("../../../docs/openapi/clinical-api.published-2026-10-28.openapi.json", import.meta.url), "utf8"))
const f = imagePlanFixture(), { caseId, identity: { imageId } } = f
const read = data => async () => ({ status: 200, data })
const forbidden = () => assert.fail("must not write")
const emptyPresentation = {
  viewport: { zoom: 1, pan_x: 0, pan_y: 0 },
  image_transform: { crop: null, rotation_degrees: 0, result: { status: "CALCULATED", crop_box_px: [0, 0, 2000, 1000],
    output_size_px: [2000, 1000], affine_matrix: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] } },
}

// Synthetic response examples following the published 29/10 schema, not backend calculation evidence.
function presentationDocument() {
  const document = publishedPopulatedDocument(f)
  document.viewport = { zoom: 1.75, pan_x: 0.125, pan_y: -0.25 }
  document.image_transform = { crop: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }, rotation_degrees: 23,
    result: { status: "CALCULATED", crop_box_px: [200, 100, 1800, 900], output_size_px: [1800, 900],
      affine_matrix: [[0.9, -0.4, 200], [0.4, 0.9, 100], [0, 0, 1]] } }
  document.objects[0].visible = false
  document.objects[1].locked = true
  document.objects[1].simulation = { status: "SIMULATED", transformed_fragment_points_px: [{ x: 200, y: 100 }, { x: 800, y: 500 }] }
  document.objects.push(
    { id: "00000000-0000-4000-8000-000000000950", type: "ANGLE", visible: true, locked: true,
      start: { x: 0, y: 0 }, vertex: { x: 0.5, y: 0.5 }, end: { x: 1, y: 0 } },
    { id: "00000000-0000-4000-8000-000000000951", type: "CIRCLE", visible: false, locked: false, center: { x: 0.5, y: 0.5 }, edge: { x: 0.7, y: 0.5 } },
    { id: "00000000-0000-4000-8000-000000000952", type: "IMPLANT", visible: false, locked: true,
      catalog_item_id: "00000000-0000-4000-8000-000000000953", position: { x: 0.5, y: 0.5 }, rotation_degrees: 10, scale: 1.25, opacity: 0.75 },
  )
  return document
}
const stored = document => ({ ...f.initial, revision: 5, updated_at: "2026-10-29T12:00:00Z", document })

test("published plan presentation fields are accepted exactly by BFF and browser instead of INVALID_RESPONSE", async () => {
  for (const name of ["PlanViewport", "PlanImageRegion", "PlanImageTransform", "PlanImageTransformResult"]) assert.ok(contract.components.schemas[name])
  assert.equal(previousContract.components.schemas.PlanDocument.properties.viewport, undefined)
  for (const name of ["PlanLine", "PlanAngle", "PlanCircle", "PlanTplo", "PlanImplant"]) {
    assert.equal(contract.components.schemas[name].properties.visible.default, true)
    assert.equal(contract.components.schemas[name].properties.locked.default, false)
    assert.equal(previousContract.components.schemas[name].properties.visible, undefined)
  }
  const current = stored(presentationDocument()), before = structuredClone(current)
  assert.deepEqual(PlanDocumentSchema.parse(current.document), current.document)
  const response = await getImagePlanForBff(caseId, imageId, read(f.readyImage), read(current))
  assert.equal(response.status, 200)
  const result = await fetchImagePlan(caseId, imageId, { fetchImpl: async () => Response.json(response.body) })
  assert.deepEqual(result, f.publicPlan(current))
  assert.deepEqual(current, before)
})

test("revision zero permits identity presentation with a derived result, but rejects nonempty presentation", async () => {
  const current = { ...f.initial, document: { ...f.initial.document, ...structuredClone(emptyPresentation) } }
  const response = await getImagePlanForBff(caseId, imageId, read(f.readyImage), read(current))
  assert.equal(response.status, 200)
  assert.deepEqual(response.body, f.publicPlan(current))
  const saved = await saveImageCalibrationForBff(caseId, imageId, { baseRevision: 0, calibration: f.line }, read(f.readyImage), read(current), async (_path, payload) => {
    assert.deepEqual(payload.document.viewport, emptyPresentation.viewport)
    assert.deepEqual(payload.document.image_transform, emptyPresentation.image_transform)
    return { status: 200, data: f.persist(payload) }
  })
  assert.equal(saved.status, 200)
  assert.equal(saved.body.revision, 1)
  for (const mutate of [d => { d.viewport.zoom = 2 }, d => { d.image_transform.rotation_degrees = 10 },
    d => { d.image_transform.crop = { x: 0, y: 0, width: 0.5, height: 1 } }]) {
    const body = structuredClone(response.body); mutate(body.document)
    assert.equal(ImagePlanSchema.safeParse(body).success, false)
  }
})

test("legacy plans get only published presentation defaults, without inventing viewport or image transforms", () => {
  const document = publishedPopulatedDocument(f)
  for (const object of document.objects) { delete object.visible; delete object.locked }
  const parsed = PlanDocumentSchema.parse(document)
  assert.equal(Object.hasOwn(parsed, "viewport"), false)
  assert.equal(Object.hasOwn(parsed, "image_transform"), false)
  for (const object of parsed.objects) { assert.equal(object.visible, true); assert.equal(object.locked, false) }
  const defaults = PlanDocumentSchema.parse({ ...document, viewport: {}, image_transform: {} })
  assert.deepEqual(defaults.viewport, { zoom: 1, pan_x: 0, pan_y: 0 })
  assert.deepEqual(defaults.image_transform, { rotation_degrees: 0 })
})

test("calibration writes preserve viewport, crop, rotation, transforms, contours and every object flag", async () => {
  const current = stored(presentationDocument()), before = structuredClone(current)
  let writes = 0
  const result = await saveImageCalibrationForBff(caseId, imageId, { baseRevision: current.revision, calibration: f.circle }, read(f.readyImage), read(current), async (_path, payload) => {
    writes++
    assert.deepEqual(payload.document, { ...current.document, calibration: f.circle })
    return { status: 200, data: f.persist(payload) }
  })
  assert.equal(result.status, 200)
  assert.equal(writes, 1)
  for (const field of ["viewport", "image_transform", "objects"]) assert.deepEqual(result.body.document[field], current.document[field])
  assert.deepEqual(current, before)
})

test("new presentation fields remain strict, finite and bounded; unknown data is never silently erased", async () => {
  const variants = [d => { d.viewport.zoom = 0 }, d => { d.viewport.zoom = 21 }, d => { d.viewport.pan_x = 11 },
    d => { d.viewport.pan_y = NaN }, d => { d.viewport.unknown = true }, d => { d.image_transform.crop.width = 0 },
    d => { d.image_transform.rotation_degrees = 181 }, d => { d.image_transform.crop.x = -1 },
    d => { d.image_transform.result.affine_matrix[0][0] = Infinity }, d => { d.image_transform.result.crop_box_px[0] = 1.5 },
    d => { d.image_transform.result.unknown = true }, d => { d.image_transform.result.status = "READY" },
    d => { d.objects[0].visible = "false" }, d => { d.objects[1].locked = null },
    d => { d.objects[1].simulation.transformed_fragment_points_px[0].x = Infinity }]
  for (const mutate of variants) {
    const document = presentationDocument(); mutate(document)
    assert.equal(PlanDocumentSchema.safeParse(document).success, false)
    const result = await saveImageCalibrationForBff(caseId, imageId, { baseRevision: 5, calibration: f.line }, read(f.readyImage), read(stored(document)), forbidden)
    assert.equal(result.status, 502)
    assert.equal(result.body.error.code, "INVALID_RESPONSE")
    assert.equal(result.body.error.uncertain, false)
  }
})

test("distance creation preserves the complete new presentation data and other objects' hidden/locked flags", async () => {
  const current = stored(presentationDocument()), before = structuredClone(current.document)
  current.document.calibration = f.persist({ base_revision: 0, document: { ...f.initial.document, calibration: f.line } }).document.calibration
  const input = { kind: "distance-create", baseRevision: 5, id: "00000000-0000-4000-8000-000000000954",
    start: { x: 0.1, y: 0.2 }, end: { x: 0.7, y: 0.8 }, label: "New distance" }
  let writes = 0
  const result = await saveImagePlanEditForBff(caseId, imageId, input, read(f.readyImage), read(current), async (_path, payload) => {
    writes++
    for (const field of ["viewport", "image_transform"]) assert.deepEqual(payload.document[field], before[field])
    assert.deepEqual(payload.document.objects.slice(0, -1), before.objects)
    assert.equal(payload.document.objects.at(-1).visible, true)
    assert.equal(payload.document.objects.at(-1).locked, false)
    return { status: 200, data: { ...current, revision: 6, document: payload.document } }
  })
  assert.equal(result.status, 200)
  assert.equal(writes, 1)
  assert.equal(current.document.objects.length, before.objects.length)
})

test("hidden distances stay out of the overlay/list while locked distances reject edits before PUT", async () => {
  const current = stored(presentationDocument()), line = current.document.objects[0]
  current.document.calibration = f.persist({ base_revision: 0, document: { ...f.initial.document, calibration: f.line } }).document.calibration
  assert.equal(selectSavedDistances(f.publicPlan(current)).length, 0)
  assert.equal(distanceLine(f.publicPlan(current), line.id), null)
  line.visible = true; line.locked = true
  assert.equal(selectSavedDistances(f.publicPlan(current)).length, 1)
  for (const kind of ["distance-update", "distance-delete"]) {
    const input = { kind, id: line.id, baseRevision: current.revision,
      ...(kind === "distance-update" ? { start: { x: 0.1, y: 0.2 }, end: { x: 0.8, y: 0.9 } } : {}) }
    assert.throws(() => applyPlanCommand(current.document, input))
    const result = await saveImagePlanEditForBff(caseId, imageId, input, read(f.readyImage), read(current), forbidden)
    assert.equal(result.status, 400)
    assert.equal(result.body.error.uncertain, false)
    assert.equal(SaveDistanceSchema.safeParse({ ...input, locked: false }).success, false)
  }
  assert.equal(nextDistanceLabel([{ ...line, label: null, visible: false }, { ...line, label: null, visible: true }], index => `Distance ${index}`), "Distance 2")
})
