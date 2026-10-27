import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"
import { QueryClient } from "@tanstack/react-query"
import { imagePlanFixture, publishedPopulatedDocument } from "./fixtures/image-plan.mjs"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript," }
  if (context.parentURL?.includes("/node_modules/")) return nextResolve(specifier, context)
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })
const { saveImagePlanEditForBff } = await import("../src/lib/server/image-plan-bff.ts")
const { saveImagePlanEdit } = await import("../src/features/cases/services/image-plan-api.ts")
const { requestCalibrationSave, requestPlanEditSave, checkImagePlanSave, discardPlanEditSave } = await import("../src/features/cases/lib/image-plan-saving.ts")
const { casesQueryKeys: keys } = await import("../src/features/cases/hooks/cases-query-keys.ts")
const { isCalibrationSaveLocked } = await import("../src/features/cases/lib/calibration-save-state.ts")
const { requestImageDeletion } = await import("../src/features/cases/lib/image-deletion.ts")
const { requestCaseDeletion } = await import("../src/features/cases/lib/case-deletion.ts")
const { editorFromCalibration } = await import("../src/features/cases/lib/calibration-editor.ts")
const f = imagePlanFixture(), { caseId, identity: { imageId } } = f, identity = { caseId, imageId }
const quality = publishedPopulatedDocument(f).radiographic_quality
const edit = { kind: "radiographic-quality", baseRevision: 0, quality }
const read = data => async () => ({ status: 200, data })
const forbidden = () => assert.fail("must not contact HTTP")
const initial = f.publicPlan(f.initial)
const saved = { ...initial, revision: 1, updatedAt: "2026-10-27T12:00:00Z", document: { ...initial.document, radiographic_quality: quality } }
const makeClient = () => new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
const error = (code, status = 409) => Response.json({ error: { code, uncertain: false } }, { status })
const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes }); return { promise, resolve } }

test("quality command merges one allowed field and preserves calibration, objects, protocol results and audit", async () => {
  const current = { ...f.initial, revision: 8, updated_at: saved.updatedAt, document: publishedPopulatedDocument(f) }
  const input = { ...edit, baseRevision: 8, quality: { ...quality, tibial_plateau_visible: "NOT_ASSESSED", notes: "New observation" } }
  let writes = 0
  const result = await saveImagePlanEditForBff(caseId, imageId, input, read(f.readyImage), read(current), async (path, payload) => {
    writes++
    assert.deepEqual(path, { image_id: imageId })
    assert.equal(payload.base_revision, 8)
    assert.deepEqual(payload.document, { ...current.document, radiographic_quality: input.quality })
    return { status: 200, data: { ...current, revision: 9, document: payload.document } }
  })
  assert.equal(result.status, 200); assert.equal(writes, 1)
  assert.deepEqual(result.body.document.additional_measurements, current.document.additional_measurements)
  assert.deepEqual(result.body.document.clinical_validation.audit, current.document.clinical_validation.audit)
})

test("quality command never accepts arbitrary plan replacement, derived fields or invented review and eligibility", async () => {
  for (const value of [{ ...edit, document: {} }, { ...edit, calibration: f.line }, { ...edit, clinical_validation: {} },
    { ...edit, quality: { ...quality, eligibility: "ELIGIBLE" } }, { ...edit, quality: null }, { ...edit, kind: "approve" },
    { ...edit, baseRevision: -1 }, { ...edit, quality: { notes: "x".repeat(2001) } }, { ...edit, quality: { true_lateral: "APPROVED" } }]) {
    assert.equal((await saveImagePlanEditForBff(caseId, imageId, value, forbidden, forbidden, forbidden)).status, 400)
    await assert.rejects(saveImagePlanEdit(caseId, imageId, value, { fetchImpl: forbidden }), e => e.code === "VALIDATION_ERROR")
  }
  assert.equal((await saveImagePlanEditForBff(caseId, imageId, edit, read({ ...f.readyImage, case_id: "00000000-0000-4000-8000-000000000999" }), forbidden, forbidden)).status, 404)
  assert.equal((await saveImagePlanEditForBff(caseId, imageId, edit, read({ ...f.readyImage, status: "PROCESSING" }), forbidden, forbidden)).status, 409)
  assert.equal((await saveImagePlanEditForBff(caseId, imageId, { ...edit, baseRevision: 2 }, read(f.readyImage), read(f.initial), forbidden)).body.error.code, "PLAN_REVISION_CONFLICT")
})

test("quality acknowledgements must match image, next revision and every submitted criterion", async () => {
  for (const response of [{ ...saved, revision: 3 }, { ...saved, imageId: "00000000-0000-4000-8000-000000000999" },
    { ...saved, document: { ...saved.document, radiographic_quality: { ...quality, true_lateral: "FAIL" } } }]) {
    await assert.rejects(saveImagePlanEdit(caseId, imageId, edit, { fetchImpl: async () => Response.json(response) }), e => e.code === "INVALID_RESPONSE" && e.uncertain)
  }
  const result = await saveImagePlanEditForBff(caseId, imageId, edit, read(f.readyImage), read(f.initial), async () => ({ status: 200, data: f.initial }))
  assert.equal(result.status, 502); assert.equal(result.body.error.uncertain, true)
})

test("quality and calibration share one in-flight receipt and deletion lock; distinct intent is returned without being sent", async () => {
  const client = makeClient(), barrier = deferred(), entered = deferred()
  let writes = 0
  const options = { fetchImpl: async (url, init) => {
    assert.ok(url.endsWith("/plan/edits")); assert.equal(init.method, "PATCH")
    assert.equal(init.credentials, "same-origin"); assert.equal(init.cache, "no-store")
    assert.deepEqual(JSON.parse(init.body), edit)
    writes++; entered.resolve(); await barrier.promise; return Response.json(saved)
  } }
  try {
    const first = requestPlanEditSave(client, identity, edit, options), same = requestPlanEditSave(client, identity, edit, options)
    assert.equal(first, same)
    await entered.promise
    assert.equal(isCalibrationSaveLocked(client, caseId, imageId), true)
    assert.equal(discardPlanEditSave(client, identity), false)
    assert.equal((await requestCalibrationSave(client, identity, { baseRevision: 0, calibration: f.line }, { fetchImpl: forbidden })).code, "OPERATION_BLOCKED")
    assert.equal((await requestPlanEditSave(client, identity, { ...edit, quality: { ...quality, true_lateral: "FAIL" } }, { fetchImpl: forbidden })).code, "OPERATION_BLOCKED")
    assert.equal((await requestImageDeletion(client, identity, { fetchImpl: forbidden })).message, "blocked")
    assert.equal((await requestCaseDeletion(client, caseId, { fetchImpl: forbidden })).message, "blocked")
    assert.deepEqual(client.getQueryData(keys.imagePlanSave(caseId, imageId)).edit, edit)
    barrier.resolve(); assert.equal((await first).phase, "saved"); assert.equal(writes, 1)
    assert.equal(isCalibrationSaveLocked(client, caseId, imageId), false)
  } finally { barrier.resolve(); client.clear() }
})

test("sequential quality and calibration edits use the confirmed revisions and preserve the other's fields", async () => {
  const client = makeClient()
  let stored = structuredClone(f.initial)
  const revisions = []
  const options = { fetchImpl: async (url, init) => {
    const input = JSON.parse(init.body)
    revisions.push(input.baseRevision)
    const next = init.method === "PATCH"
      ? await saveImagePlanEditForBff(caseId, imageId, input, read(f.readyImage), read(stored), async (_path, payload) => {
        stored = { ...stored, revision: stored.revision + 1, updated_at: saved.updatedAt, document: payload.document }
        return { status: 200, data: stored }
      })
      : null
    if (next) return Response.json(next.body, { status: next.status })
    assert.ok(url.endsWith("/plan")); assert.equal(input.baseRevision, stored.revision)
    stored = f.persist({ base_revision: stored.revision, document: { ...stored.document, calibration: input.calibration } })
    return Response.json(f.publicPlan(stored))
  } }
  try {
    assert.equal((await requestPlanEditSave(client, identity, edit, options)).phase, "saved")
    assert.equal((await requestCalibrationSave(client, identity, { baseRevision: 1, calibration: f.line }, options)).phase, "saved")
    assert.equal((await requestPlanEditSave(client, identity, { ...edit, baseRevision: 2, quality: { ...quality, notes: "Updated" } }, options)).phase, "saved")
    assert.deepEqual(revisions, [0, 1, 2])
    assert.ok(stored.document.calibration.result)
    assert.equal(stored.document.radiographic_quality.notes, "Updated")
    assert.equal(client.getQueryData(keys.imagePlan(caseId, imageId)).revision, 3)
  } finally { client.clear() }
})

test("lost quality responses reconcile only by reading; unchanged reads keep the original intent locked across calls", async () => {
  const client = makeClient()
  let writes = 0, persisted = false
  const options = { fetchImpl: async (_url, init) => {
    if (init.method === "PATCH") { writes++; throw new TypeError("lost") }
    assert.equal(init.method, "GET"); return Response.json(persisted ? saved : initial)
  } }
  try {
    assert.equal((await requestPlanEditSave(client, identity, edit, options)).phase, "uncertain")
    const different = { ...edit, quality: { ...quality, notes: "New intent must not replace the unresolved one" } }
    const checked = await requestPlanEditSave(client, identity, different, options)
    assert.equal(checked.phase, "uncertain"); assert.deepEqual(checked.edit, edit)
    assert.equal(discardPlanEditSave(client, identity), false)
    assert.equal((await requestCalibrationSave(client, identity, { baseRevision: 0, calibration: f.line }, { fetchImpl: forbidden })).code, "OPERATION_BLOCKED")
    assert.equal(isCalibrationSaveLocked(client, caseId, imageId), true)
    persisted = true
    assert.equal((await checkImagePlanSave(client, identity, options)).phase, "saved")
    assert.equal(writes, 1); assert.equal(isCalibrationSaveLocked(client, caseId, imageId), false)
  } finally { client.clear() }
})

test("quality conflicts retain their input and refresh latest revision without an automatic replay or lost intent", async () => {
  const client = makeClient()
  let writes = 0
  try {
    const result = await requestPlanEditSave(client, identity, edit, { fetchImpl: async (_url, init) => {
      if (init.method === "PATCH") { writes++; return error("PLAN_REVISION_CONFLICT") }
      return Response.json({ ...saved, document: { ...saved.document, radiographic_quality: { ...quality, true_lateral: "FAIL" } } })
    } })
    assert.equal(result.phase, "conflict"); assert.deepEqual(result.edit, edit); assert.equal(result.currentRevision, 1)
    assert.equal(writes, 1)
    assert.equal((await requestCalibrationSave(client, identity, { baseRevision: 1, calibration: f.line }, { fetchImpl: forbidden })).code, "OPERATION_BLOCKED")
    assert.deepEqual(client.getQueryData(keys.imagePlanSave(caseId, imageId)).edit, edit)
    assert.equal(discardPlanEditSave(client, identity), true)
    assert.equal(client.getQueryData(keys.imagePlanSave(caseId, imageId)).phase, "idle")
    assert.equal(client.getQueryData(keys.imagePlan(caseId, imageId)).revision, 1)
  } finally { client.clear() }
})

test("omitted quality criteria and notes are normalized consistently with the backend defaults", async () => {
  const client = makeClient()
  try {
    const input = { kind: "radiographic-quality", baseRevision: 0, quality: {} }
    const defaults = { true_lateral: "NOT_ASSESSED", femoral_condyles_superimposed: "NOT_ASSESSED", stifle_and_tarsus_included: "NOT_ASSESSED",
      tibial_axis_centered: "NOT_ASSESSED", tibial_plateau_visible: "NOT_ASSESSED", notes: null }
    const result = await requestPlanEditSave(client, identity, input, { fetchImpl: async (_url, init) => {
      assert.deepEqual(JSON.parse(init.body), { ...input, quality: defaults })
      return Response.json({ ...saved, document: { ...saved.document, radiographic_quality: defaults } })
    } })
    assert.equal(result.phase, "saved")
    assert.deepEqual(result.edit.quality, defaults)
  } finally { client.clear() }
})

test("an unresolved calibration cannot be replaced by quality, and a superseded lost quality edit becomes a conflict without another write", async () => {
  const client = makeClient()
  try {
    const calibration = { baseRevision: 0, calibration: f.line }
    client.setQueryData(keys.imagePlanSave(caseId, imageId), { phase: "uncertain", draft: calibration })
    assert.equal((await requestPlanEditSave(client, identity, edit, { fetchImpl: forbidden })).code, "OPERATION_BLOCKED")
    assert.deepEqual(client.getQueryData(keys.imagePlanSave(caseId, imageId)).draft, calibration)
    client.clear()
    let writes = 0
    const result = await requestPlanEditSave(client, identity, edit, { fetchImpl: async (_url, init) => {
      if (init.method === "PATCH") { writes++; throw new TypeError("lost") }
      return Response.json({ ...saved, document: { ...saved.document, radiographic_quality: { ...quality, notes: "Saved by another tab" } } })
    } })
    assert.equal(result.phase, "conflict"); assert.equal(result.currentRevision, 1); assert.equal(writes, 1)
    assert.deepEqual(result.edit, edit)
  } finally { client.clear() }
})

test("quality cannot save while deletion is unresolved or recreate cache after a confirmed deletion", async () => {
  const client = makeClient(), barrier = deferred(), entered = deferred()
  try {
    client.setQueryData(keys.imageDeletion(caseId, imageId), { phase: "uncertain" })
    assert.equal((await requestPlanEditSave(client, identity, edit, { fetchImpl: forbidden })).code, "OPERATION_BLOCKED")
    client.removeQueries({ queryKey: keys.imageDeletion(caseId, imageId) })
    const pending = requestPlanEditSave(client, identity, edit, { fetchImpl: async () => { entered.resolve(); await barrier.promise; return Response.json(saved) } })
    await entered.promise
    client.setQueryData(keys.caseDeletion(caseId), { phase: "deleted" })
    client.removeQueries({ queryKey: keys.imagePlanSave(caseId, imageId) })
    barrier.resolve()
    assert.equal((await pending).code, "IMAGE_NOT_FOUND")
    assert.equal(client.getQueryData(keys.imagePlan(caseId, imageId)), undefined)
    assert.equal(client.getQueryData(keys.imagePlanSave(caseId, imageId)), undefined)
  } finally { barrier.resolve(); client.clear() }
})

test("shared writer checks the other raw draft synchronously before HTTP, independent of a stale view's enabled controls", async () => {
  const client = makeClient()
  try {
    client.setQueryData(keys.imagePlan(caseId, imageId), initial)
    client.setQueryData(keys.imageQualityDraft(caseId, imageId), { baseRevision: 0, quality })
    assert.equal((await requestCalibrationSave(client, identity, { baseRevision: 0, calibration: f.line }, { fetchImpl: forbidden })).code, "OPERATION_BLOCKED")
    client.setQueryData(keys.imageQualityDraft(caseId, imageId), null)
    client.setQueryData(keys.imageCalibrationDraft(caseId, imageId), editorFromCalibration(0, f.line))
    assert.equal((await requestPlanEditSave(client, identity, edit, { fetchImpl: forbidden })).code, "OPERATION_BLOCKED")
  } finally { client.clear() }
})

test("acknowledging quality clears only its matching detached draft and preserves a different later intent", async () => {
  for (const different of [false, true]) {
    const client = makeClient(), entered = deferred(), barrier = deferred()
    try {
      client.setQueryData(keys.imageQualityDraft(caseId, imageId), { baseRevision: 0, quality })
      const pending = requestPlanEditSave(client, identity, edit, { fetchImpl: async () => { entered.resolve(); await barrier.promise; return Response.json(saved) } })
      await entered.promise
      const newer = { baseRevision: 1, quality: { ...quality, notes: "Keep this later intent" } }
      if (different) client.setQueryData(keys.imageQualityDraft(caseId, imageId), newer)
      barrier.resolve()
      assert.equal((await pending).phase, "saved")
      assert.deepEqual(client.getQueryData(keys.imageQualityDraft(caseId, imageId)), different ? newer : null)
    } finally { barrier.resolve(); client.clear() }
  }
})
