import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"
import { z } from "zod"
import { imagePlanFixture, publishedPopulatedDocument } from "./fixtures/image-plan.mjs"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (context.parentURL?.includes("/node_modules/")) return nextResolve(specifier, context)
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })
const { PlanPointSchema, PlanLineInputSchema, PlanDocumentSchema } = await import("../src/features/cases/schemas/image-plan.schema.ts")
const { SaveDistanceSchema, SavePlanEditSchema, PlanSaveCommandSchema, applyPlanCommand, planCommandMatches } =
  await import("../src/features/cases/schemas/image-plan-command.schema.ts")

// Synthetic plan inputs test command behavior, not backend geometric results.
const f = imagePlanFixture()
const newId = "00000000-0000-4000-8000-000000000abc"
const create = { kind: "distance-create", baseRevision: 8, id: newId,
  start: { x: 0, y: 0.25 }, end: { x: 1, y: 0.75 }, label: "Distância 1" }
const document = () => {
  const value = publishedPopulatedDocument(f)
  value.objects.push(
    { id: "00000000-0000-4000-8000-000000000902", type: "ANGLE", visible: true, locked: false, start: { x: 0, y: 0 }, vertex: { x: 0.5, y: 0.5 }, end: { x: 1, y: 0 } },
    { id: "00000000-0000-4000-8000-000000000903", type: "CIRCLE", visible: true, locked: false, center: { x: 0.5, y: 0.5 }, edge: { x: 0.7, y: 0.5 } },
    { id: "00000000-0000-4000-8000-000000000904", type: "IMPLANT", visible: true, locked: false, catalog_item_id: newId, position: { x: 0.5, y: 0.5 },
      rotation_degrees: 12, scale: 1, opacity: 0.8, variant: "Synthetic variant", view: "Lateral" },
  )
  return value
}
const planOf = value => ({ imageId: f.identity.imageId, revision: 9, updatedAt: "2026-10-28T19:00:00Z", document: value })
const update = value => ({ kind: "distance-update", baseRevision: 8, id: value.objects[0].id,
  start: { x: 0.123456789123, y: 0.987654321987 }, end: { x: 0.9, y: 0.1 } })
const remove = value => ({ kind: "distance-delete", baseRevision: 8, id: value.objects[0].id })
const deepFreeze = value => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}
const assertInvalidCommand = value => {
  assert.equal(SaveDistanceSchema.safeParse(value).success, false)
  assert.equal(SavePlanEditSchema.safeParse(value).success, false)
  assert.equal(PlanSaveCommandSchema.safeParse(value).success, false)
}

test("distance commands use inclusive finite source coordinates and canonical UUIDs without rounding geometry", () => {
  assert.equal(PlanPointSchema.safeParse({ x: 0, y: 1 }).success, true)
  assert.equal(PlanLineInputSchema.safeParse({ id: newId, type: "LINE", start: create.start, end: create.end }).success, true)
  for (const input of [create, update(document()), remove(document())]) {
    const expected = structuredClone(input)
    const parsed = SaveDistanceSchema.parse(input)
    assert.deepEqual(parsed, expected)
    assert.deepEqual(SavePlanEditSchema.parse(input), expected)
    assert.deepEqual(PlanSaveCommandSchema.parse(input), expected)
  }
  assert.equal(SaveDistanceSchema.parse({ ...create, id: newId.toUpperCase() }).id, newId)
  const { label: _label, ...unlabelled } = create
  assert.equal(SaveDistanceSchema.parse(unlabelled).label, null)
  assert.equal(SaveDistanceSchema.safeParse({ ...create, label: "x".repeat(120) }).success, true)
  assert.equal(SaveDistanceSchema.safeParse({ ...create, baseRevision: Number.MAX_SAFE_INTEGER - 1 }).success, true)
})

test("distance inputs reject invalid coordinates, identical endpoints and client-supplied results", () => {
  for (const input of [create, update(document())]) {
    for (const value of [NaN, Infinity, -Infinity, -0.001, 1.001, "0.5", null]) {
      for (const endpoint of ["start", "end"]) for (const axis of ["x", "y"]) {
        assertInvalidCommand({ ...input, [endpoint]: { ...input[endpoint], [axis]: value } })
      }
    }
    assertInvalidCommand({ ...input, end: { ...input.start } })
    assertInvalidCommand({ ...input, start: { ...input.start, z: 0 } })
    assertInvalidCommand({ ...input, measurement: { status: "CALCULATED", values: { length: 999 } } })
    assertInvalidCommand({ ...input, calibration_id: "f".repeat(64) })
  }
  assert.equal(PlanLineInputSchema.safeParse({ id: newId, type: "LINE", start: create.start, end: create.start }).success, false)
  assert.equal(PlanLineInputSchema.safeParse({ id: newId, type: "LINE", start: create.start, end: create.end, measurement: null }).success, false)
})

test("each distance command accepts only its fields and a valid ID and safe base revision", () => {
  for (const input of [create, update(document()), remove(document())]) {
    for (const id of ["", "not-a-uuid", null, 42]) assertInvalidCommand({ ...input, id })
    for (const baseRevision of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER, "8", null]) {
      assertInvalidCommand({ ...input, baseRevision })
    }
    for (const extra of [{ document: {} }, { objects: [] }, { quality: {} }, { clinical_validation: {} }, { type: "ANGLE" }]) {
      assertInvalidCommand({ ...input, ...extra })
    }
    assertInvalidCommand({ ...input, kind: "distance" })
    const { id: _id, ...noId } = input
    assertInvalidCommand(noId)
    const { baseRevision: _revision, ...noRevision } = input
    assertInvalidCommand(noRevision)
  }
  assertInvalidCommand({ ...create, label: "x".repeat(121) })
  assertInvalidCommand({ ...update(document()), label: "Cannot rename through geometry" })
  assertInvalidCommand({ ...remove(document()), start: create.start })
})

test("creating one distance preserves the complete existing plan and never mutates its inputs", () => {
  const before = deepFreeze(document()), input = deepFreeze(structuredClone(create))
  const saved = applyPlanCommand(before, input)
  assert.deepEqual(saved, { ...before, objects: [...before.objects,
    { id: newId, type: "LINE", start: create.start, end: create.end, label: create.label, visible: true, locked: false }] })
  assert.equal(saved.objects.length, before.objects.length + 1)
  assert.equal(PlanDocumentSchema.safeParse(saved).success, true)
  assert.equal(planCommandMatches(planOf(saved), input), true)
})

test("updating one distance preserves its ID, label and position, discards its stale result and retains all other clinical data", () => {
  const before = deepFreeze(document()), input = deepFreeze(update(before))
  assert.ok(before.objects[0].measurement)
  const saved = applyPlanCommand(before, input)
  const { measurement: _oldResult, ...oldLine } = before.objects[0]
  assert.deepEqual(saved, { ...before, objects: [{ ...oldLine, start: input.start, end: input.end }, ...before.objects.slice(1)] })
  assert.equal(Object.hasOwn(saved.objects[0], "measurement"), false)
  assert.equal(before.objects[0].measurement.status, "CALIBRATION_REQUIRED")
  assert.equal(planCommandMatches(planOf(saved), input), true)
})

test("deleting one distance preserves every remaining object and all other fields without mutating the source", () => {
  const before = deepFreeze(document()), input = deepFreeze(remove(before))
  const saved = applyPlanCommand(before, input)
  assert.deepEqual(saved, { ...before, objects: before.objects.slice(1) })
  assert.equal(before.objects.length, 5)
  assert.equal(planCommandMatches(planOf(saved), input), true)
  assert.equal(planCommandMatches(planOf(before), input), false)
})

test("create refuses collisions with any object type; update/delete refuse a missing or non-LINE target", () => {
  const before = deepFreeze(document())
  for (const object of before.objects) {
    assert.throws(() => applyPlanCommand(before, { ...create, id: object.id }), z.ZodError)
    if (object.type !== "LINE") {
      for (const input of [update(before), remove(before)]) {
        const wrongType = { ...input, id: object.id }
        assert.throws(() => applyPlanCommand(before, wrongType), z.ZodError)
        assert.equal(planCommandMatches(planOf(before), wrongType), false)
      }
    }
  }
  for (const input of [update(before), remove(before)]) {
    assert.throws(() => applyPlanCommand(before, { ...input, id: newId }), z.ZodError)
  }
})

test("distance operations refuse duplicate IDs anywhere in the plan, including UUID case variants", () => {
  for (const duplicate of [newId, newId.toUpperCase()]) {
    const before = document()
    before.objects.push({ ...before.objects[0], id: newId }, { ...before.objects[2], id: duplicate })
    const snapshot = structuredClone(before)
    for (const input of [create, update(before), remove(before)]) {
      assert.throws(() => applyPlanCommand(before, input), z.ZodError)
      assert.equal(planCommandMatches(planOf(before), input), false)
      assert.deepEqual(before, snapshot)
    }
  }
})

test("the global 500-object limit includes other types while updates and removals still work at capacity", () => {
  const before = document()
  while (before.objects.length < 500) {
    before.objects.push({ ...before.objects[3], id: `10000000-0000-4000-8000-${String(before.objects.length).padStart(12, "0")}` })
  }
  assert.throws(() => applyPlanCommand(before, create), z.ZodError)
  assert.equal(applyPlanCommand(before, update(before)).objects.length, 500)
  assert.equal(applyPlanCommand(before, remove(before)).objects.length, 499)
  before.objects.pop()
  assert.equal(applyPlanCommand(before, create).objects.length, 500)
})

test("acknowledgement uses the exact target geometry and creation label, not a label match or an arbitrary numeric result", () => {
  const saved = applyPlanCommand(document(), create)
  const target = saved.objects.at(-1)
  for (const change of [{ id: "00000000-0000-4000-8000-000000000def" }, { type: "ANGLE" },
    { start: { ...target.start, x: 0.001 } }, { end: { ...target.end, y: 0.751 } }, { label: "Another line" }]) {
    const different = { ...saved, objects: [...saved.objects.slice(0, -1), { ...target, ...change }] }
    assert.equal(planCommandMatches(planOf(different), create), false)
  }
  assert.equal(planCommandMatches(planOf({ ...saved, objects: [...saved.objects.slice(0, -1),
    { ...target, id: target.id.toUpperCase() }] }), create), true)
  assert.equal(planCommandMatches(planOf(saved), { ...create, measurement: null }), false)
})

test("saved geometry is acknowledged independently of optional or not-yet-calculated measurement results", () => {
  for (const input of [create, update(document())]) {
    const saved = applyPlanCommand(document(), input)
    const target = saved.objects.find(object => object.id === input.id)
    for (const measurement of [null, { status: "CALIBRATION_REQUIRED", values: {}, units: {} },
      { status: "IMAGE_DIMENSIONS_REQUIRED" }, { status: "CALCULATED", calibration_id: "a".repeat(64), values: { length: 42 }, units: { length: "mm" } }]) {
      const state = { ...saved, objects: saved.objects.map(object => object === target ? { ...object, measurement } : object) }
      assert.equal(planCommandMatches(planOf(state), input), true)
    }
  }
})

test("optional labels match backend null defaults; update keeps the stored name and canonical IDs identify the same target", () => {
  const { label: _label, ...unlabelled } = create
  const saved = applyPlanCommand(document(), unlabelled)
  assert.equal(saved.objects.at(-1).label, null)
  assert.equal(planCommandMatches(planOf(saved), unlabelled), true)
  delete saved.objects.at(-1).label
  assert.equal(planCommandMatches(planOf(saved), unlabelled), true)
  const before = document()
  before.objects[0].id = newId.toUpperCase()
  const input = { ...update(before), id: newId }
  const edited = applyPlanCommand(before, input)
  assert.equal(edited.objects[0].id, newId.toUpperCase())
  assert.equal(edited.objects[0].label, before.objects[0].label)
  assert.equal(planCommandMatches(planOf(edited), input), true)
  assert.throws(() => applyPlanCommand(before, create), z.ZodError)
})

test("pure application validates the command before touching objects or accepting forged fields", () => {
  const before = deepFreeze(document())
  for (const input of [{ ...create, measurement: {} }, { ...update(before), end: update(before).start }, { ...remove(before), document: {} }]) {
    assert.throws(() => applyPlanCommand(before, input), z.ZodError)
  }
})
