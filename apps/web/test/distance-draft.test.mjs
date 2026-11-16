import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"
import { QueryClient } from "@tanstack/react-query"
import { imagePlanFixture, publishedPopulatedDocument } from "./fixtures/image-plan.mjs"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (context.parentURL?.includes("/node_modules/")) return nextResolve(specifier, context)
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })

const { distanceLine, distanceEditorFromCommand, distanceCommandFromEditor, distanceEditorHasChanges,
  distanceEditorMatchesCommand, centeredDistanceGeometry, nextDistanceLabel } = await import("../src/features/cases/lib/distance-editor.ts")
const { hasDistanceDraft } = await import("../src/features/cases/lib/distance-draft.ts")
const { hasImagePlanDraft, hasOtherImagePlanDraft } = await import("../src/features/cases/lib/image-plan-draft.ts")
const { editorFromCalibration } = await import("../src/features/cases/lib/calibration-editor.ts")
const { requestPlanEditSave } = await import("../src/features/cases/lib/image-plan-saving.ts")
const { requestImageDeletion } = await import("../src/features/cases/lib/image-deletion.ts")
const { requestCaseDeletion } = await import("../src/features/cases/lib/case-deletion.ts")
const { applyPlanCommand } = await import("../src/features/cases/schemas/image-plan-command.schema.ts")
const { casesQueryKeys: keys } = await import("../src/features/cases/hooks/cases-query-keys.ts")

const f = imagePlanFixture()
const { caseId, identity: { imageId } } = f
const identity = { caseId, imageId }
const lineId = "00000000-0000-4000-8000-000000000900"
const createId = "00000000-0000-4000-8000-000000000abc"
const otherImageId = "00000000-0000-4000-8000-000000000def"
const geometry = { start: { x: 0.1, y: 0.2 }, end: { x: 0.8, y: 0.7 } }
const commands = [
  { kind: "distance-create", baseRevision: 8, id: createId, ...geometry, label: "Synthetic distance" },
  { kind: "distance-update", baseRevision: 8, id: lineId, start: { x: 0.25, y: 0.35 }, end: { x: 0.65, y: 0.75 } },
  { kind: "distance-delete", baseRevision: 8, id: lineId },
]
const quality = { kind: "radiographic-quality", baseRevision: 8, quality: {
  true_lateral: "PASS", femoral_condyles_superimposed: "PASS", stifle_and_tarsus_included: "PASS",
  tibial_axis_centered: "PASS", tibial_plateau_visible: "PASS", notes: "Synthetic quality notes",
} }
const initial = f.publicPlan({ image_id: imageId, revision: 8, updated_at: "2026-10-27T12:00:00Z",
  document: publishedPopulatedDocument(f) })
const after = command => ({ ...initial, revision: 9, updatedAt: "2026-10-27T12:01:00Z",
  document: applyPlanCommand(initial.document, command) })
const makeClient = () => new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
const forbidden = async () => assert.fail("must not perform HTTP")

function putPlan(client) { client.setQueryData(keys.imagePlan(caseId, imageId), initial) }

test("distance editor copies normalized geometry and detects update changes by revision and endpoints", () => {
  const unchanged = { kind: "distance-update", baseRevision: 8, id: lineId,
    start: { x: 0.2, y: 0.3 }, end: { x: 0.4, y: 0.3 } }
  const mutable = structuredClone(commands[0])
  const editor = distanceEditorFromCommand(mutable)
  mutable.start.x = 0.99
  assert.equal(editor.id, createId)
  assert.equal(editor.geometry.start.x, geometry.start.x)
  assert.deepEqual(distanceCommandFromEditor(editor), commands[0])
  assert.equal(distanceEditorHasChanges(distanceEditorFromCommand(unchanged), initial), false)
  assert.equal(distanceEditorHasChanges(distanceEditorFromCommand(commands[1]), initial), true)
  assert.equal(distanceEditorHasChanges(distanceEditorFromCommand(unchanged), { ...initial, revision: 9 }), true)
  assert.equal(distanceEditorMatchesCommand(editor, { ...commands[0], id: createId.toUpperCase() }), true)
  assert.equal(distanceEditorMatchesCommand(editor, { ...commands[0], label: "Different" }), false)
  assert.equal(distanceLine(initial, lineId.toUpperCase()).id, lineId)
  assert.equal(distanceLine(initial, createId), null)
})

test("draft aggregation distinguishes the distance editor's own intent from calibration, quality and other distance owners", () => {
  const client = makeClient()
  try {
    putPlan(client)
    const ownKey = keys.imageDistanceDraft(caseId, imageId)
    client.setQueryData(ownKey, distanceEditorFromCommand(commands[0]))
    assert.equal(hasDistanceDraft(client, caseId, imageId), true)
    assert.equal(hasImagePlanDraft(client, caseId, imageId), true)
    assert.equal(hasOtherImagePlanDraft(client, caseId, imageId, "distance"), false)

    client.setQueryData(keys.imageCalibrationDraft(caseId, imageId), editorFromCalibration(8, f.circle))
    assert.equal(hasOtherImagePlanDraft(client, caseId, imageId, "distance"), true)
    client.setQueryData(keys.imageCalibrationDraft(caseId, imageId), null)
    client.setQueryData(keys.imageQualityDraft(caseId, imageId), { baseRevision: 8, quality: { ...quality.quality, notes: "Local edit" } })
    assert.equal(hasOtherImagePlanDraft(client, caseId, imageId, "distance"), true)
    client.setQueryData(keys.imageQualityDraft(caseId, imageId), null)
    client.setQueryData(keys.imagePlanSave(caseId, imageId), { phase: "uncertain", edit: commands[0] })
    assert.equal(hasOtherImagePlanDraft(client, caseId, imageId, "distance"), false)
    assert.equal(hasOtherImagePlanDraft(client, caseId, imageId, "radiographic-quality"), true)
    assert.equal(hasOtherImagePlanDraft(client, caseId, imageId, "calibration"), true)

    client.setQueryData(keys.imageDistanceDraft(caseId, otherImageId), distanceEditorFromCommand({
      kind: "distance-create", baseRevision: 8, id: otherImageId, ...geometry,
    }))
    assert.equal(hasDistanceDraft(client, caseId, imageId), true)
    assert.equal(hasDistanceDraft(client, caseId, otherImageId), true)
    assert.equal(hasImagePlanDraft(client, caseId, imageId), true)
  } finally { client.clear() }
})

test("calibration, quality and a mismatched distance editor block before HTTP; an exact distance draft can save", async () => {
  const client = makeClient(), calls = []
  const options = { fetchImpl: async (_url, init) => {
    calls.push(init.method)
    return Response.json(after(JSON.parse(init.body)))
  } }
  try {
    putPlan(client)
    client.setQueryData(keys.imageCalibrationDraft(caseId, imageId), editorFromCalibration(8, f.circle))
    assert.equal((await requestPlanEditSave(client, identity, commands[0], { fetchImpl: forbidden })).code, "OPERATION_BLOCKED")
    client.setQueryData(keys.imageCalibrationDraft(caseId, imageId), null)
    client.setQueryData(keys.imageQualityDraft(caseId, imageId), { baseRevision: 8, quality: { ...quality.quality, notes: "Local quality" } })
    assert.equal((await requestPlanEditSave(client, identity, commands[0], { fetchImpl: forbidden })).code, "OPERATION_BLOCKED")
    client.setQueryData(keys.imageQualityDraft(caseId, imageId), null)
    client.setQueryData(keys.imageDistanceDraft(caseId, imageId), distanceEditorFromCommand(commands[0]))
    assert.equal((await requestPlanEditSave(client, identity, commands[1], { fetchImpl: forbidden })).code, "OPERATION_BLOCKED")
    assert.deepEqual(calls, [])
    const saved = await requestPlanEditSave(client, identity, commands[0], options)
    assert.equal(saved.phase, "saved")
    assert.deepEqual(calls, ["PATCH"])
  } finally { client.clear() }
})

test("acknowledgement clears only the matching distance draft and preserves a newer geometry edit", async () => {
  for (const command of commands) {
    const client = makeClient()
    try {
      putPlan(client)
      client.setQueryData(keys.imageDistanceDraft(caseId, imageId), distanceEditorFromCommand(command))
      const pending = requestPlanEditSave(client, identity, command, { fetchImpl: async (_url, init) => {
        const sent = JSON.parse(init.body)
        return Response.json(after(sent))
      } })
      assert.equal((await pending).phase, "saved", command.kind)
      assert.equal(client.getQueryData(keys.imageDistanceDraft(caseId, imageId)), null, command.kind)
    } finally { client.clear() }
  }

  const client = makeClient(), command = commands[0]
  try {
    putPlan(client)
    client.setQueryData(keys.imageDistanceDraft(caseId, imageId), distanceEditorFromCommand(command))
    const pending = requestPlanEditSave(client, identity, command, { fetchImpl: async (_url, init) => {
      const sent = JSON.parse(init.body)
      client.setQueryData(keys.imageDistanceDraft(caseId, imageId), distanceEditorFromCommand({
        ...sent, start: { x: 0.12, y: 0.22 }, label: "Newer distance intent",
      }))
      return Response.json(after(sent))
    } })
    assert.equal((await pending).phase, "saved")
    assert.equal(client.getQueryData(keys.imageDistanceDraft(caseId, imageId)).label, "Newer distance intent")
  } finally { client.clear() }
})

test("dirty distance drafts guard image/case deletion; successful deletion clears only the deleted image or case keys", async () => {
  const client = makeClient(), blocked = async () => assert.fail("dirty distance draft must block deletion")
  try {
    putPlan(client)
    client.setQueryData(keys.imageDistanceDraft(caseId, imageId), distanceEditorFromCommand(commands[0]))
    assert.equal((await requestImageDeletion(client, f.identity, { fetchImpl: blocked })).message, "blocked")
    assert.equal((await requestCaseDeletion(client, caseId, { fetchImpl: blocked })).message, "blocked")

    // An unchanged update editor is cached but not dirty, so confirmed deletion
    // can exercise the cleanup path for the new query key.
    const unchanged = { kind: "distance-update", baseRevision: 8, id: lineId,
      start: { x: 0.2, y: 0.3 }, end: { x: 0.4, y: 0.3 } }
    client.setQueryData(keys.imageDistanceDraft(caseId, imageId), distanceEditorFromCommand(unchanged))
    client.setQueryData(keys.imageDistanceDraft(caseId, otherImageId), distanceEditorFromCommand({
      kind: "distance-create", baseRevision: 8, id: createId, ...geometry,
    }))
    const imageDeleted = await requestImageDeletion(client, f.identity, { fetchImpl: async () => Response.json({ items: [] }) })
    assert.equal(imageDeleted.phase, "deleted")
    assert.equal(client.getQueryData(keys.imageDistanceDraft(caseId, imageId)), undefined)
    assert.ok(client.getQueryData(keys.imageDistanceDraft(caseId, otherImageId)))

    // Case deletion also removes every image-scoped draft under the case.
    const caseClient = makeClient()
    try {
      const extraImageId = "00000000-0000-4000-8000-000000000789"
      caseClient.setQueryData(keys.imagePlan(caseId, imageId), initial)
      caseClient.setQueryData(keys.imageDistanceDraft(caseId, imageId), distanceEditorFromCommand({
        kind: "distance-update", baseRevision: 8, id: lineId,
        start: { x: 0.2, y: 0.3 }, end: { x: 0.4, y: 0.3 },
      }))
      caseClient.setQueryData(keys.imageDistanceDraft("other-case", extraImageId), distanceEditorFromCommand({
        kind: "distance-create", baseRevision: 0, id: createId, ...geometry,
      }))
      const caseDeleted = await requestCaseDeletion(caseClient, caseId, { fetchImpl: async () =>
        Response.json({ error: { code: "CASE_NOT_FOUND", retryable: false } }, { status: 404 }) })
      assert.equal(caseDeleted.phase, "deleted")
      assert.equal(caseClient.getQueryData(keys.imageDistanceDraft(caseId, imageId)), undefined)
      assert.ok(caseClient.getQueryData(keys.imageDistanceDraft("other-case", extraImageId)))
    } finally { caseClient.clear() }
  } finally { client.clear() }
})

test("a late successful distance write after QueryClient.clear cannot recreate plan or receipt data", async () => {
  const client = makeClient(), entered = (() => { let resolve; return { promise: new Promise(yes => { resolve = yes }), resolve } })()
  const barrier = (() => { let resolve; return { promise: new Promise(yes => { resolve = yes }), resolve } })()
  try {
    putPlan(client)
    const pending = requestPlanEditSave(client, identity, commands[0], { fetchImpl: async (_url, init) => {
      assert.equal(init.method, "PATCH")
      entered.resolve()
      await barrier.promise
      return Response.json(after(commands[0]))
    } })
    await entered.promise
    client.clear()
    barrier.resolve()
    const result = await pending
    assert.equal(result.code, "CLINICAL_CONTEXT_CHANGED")
    assert.equal(client.getQueryData(keys.imagePlan(caseId, imageId)), undefined)
    assert.equal(client.getQueryData(keys.imagePlanSave(caseId, imageId)), undefined)
  } finally { barrier.resolve(); client.clear() }
})


test("distance placement is centered in normalized source space and each creation receives independent points", () => {
  const geometry = centeredDistanceGeometry()
  assert.deepEqual(geometry, { start: { x: 0.4, y: 0.5 }, end: { x: 0.6, y: 0.5 } })
  geometry.start.x = 0
  assert.equal(centeredDistanceGeometry().start.x, 0.4)
  assert.notDeepEqual(centeredDistanceGeometry().start, centeredDistanceGeometry().end)
})

test("initial distance names avoid existing object labels and a non-varying name factory never loops forever", () => {
  const objects = [{ label: " distance 1 " }, { label: "Distance 3" }, { label: null }, { label: "DISTANCE 2" }]
  const before = structuredClone(objects)
  assert.equal(nextDistanceLabel(objects, index => `Distance ${index}`), "Distance 4")
  assert.equal(nextDistanceLabel([], index => `Distance ${index}`), "Distance 1")
  assert.equal(nextDistanceLabel(objects, () => "Distance 1"), null)
  assert.equal(nextDistanceLabel([{ type: "LINE", label: null }, { type: "ANGLE", label: null }, { type: "LINE" }], index => `Distance ${index}`), "Distance 3")
  assert.deepEqual(objects, before)
})
