import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"
import { QueryClient, QueryObserver } from "@tanstack/react-query"
import { imagePlanFixture, publishedPopulatedDocument } from "./fixtures/image-plan.mjs"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (context.parentURL?.includes("/node_modules/")) return nextResolve(specifier, context)
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })
const { saveImagePlanEdit } = await import("../src/features/cases/services/image-plan-api.ts")
const { requestPlanEditSave, requestCalibrationSave, checkImagePlanSave, discardPlanEditSave } = await import("../src/features/cases/lib/image-plan-saving.ts")
const { applyPlanCommand } = await import("../src/features/cases/schemas/image-plan-command.schema.ts")
const { casesQueryKeys: keys } = await import("../src/features/cases/hooks/cases-query-keys.ts")
const { isCalibrationSaveLocked } = await import("../src/features/cases/lib/calibration-save-state.ts")
const { requestImageDeletion } = await import("../src/features/cases/lib/image-deletion.ts")
const { requestCaseDeletion } = await import("../src/features/cases/lib/case-deletion.ts")
const { editorFromCalibration } = await import("../src/features/cases/lib/calibration-editor.ts")
const f = imagePlanFixture(), { caseId, identity: { imageId } } = f, identity = { caseId, imageId }
const initial = f.publicPlan(f.persist({ base_revision: 7,
  document: { ...publishedPopulatedDocument(f), calibration: f.line } }))
const newId = "00000000-0000-4000-8000-000000000abc"
const otherId = "00000000-0000-4000-8000-000000000def"
const geometry = { start: { x: 0.1, y: 0.2 }, end: { x: 0.8, y: 0.7 } }
const commands = [
  { kind: "distance-create", baseRevision: 8, id: newId, ...geometry, label: "Synthetic distance" },
  { kind: "distance-update", baseRevision: 8, id: initial.document.objects[0].id, ...geometry },
  { kind: "distance-delete", baseRevision: 8, id: initial.document.objects[0].id },
]
const quality = { kind: "radiographic-quality", baseRevision: 8, quality: initial.document.radiographic_quality }
const calibration = { baseRevision: 8, calibration: f.circle }
const makeClient = () => new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes }); return { promise, resolve } }
const forbidden = () => assert.fail("must not perform HTTP")
// Synthetic server responses exercise transport/receipts, not clinical arithmetic.
const after = input => ({ ...initial, revision: 9, document: applyPlanCommand(initial.document, input) })

test("browser distance transport sends only the normalized command by same-origin no-store PATCH and forwards cancellation", async () => {
  for (const command of commands) {
    const signal = new AbortController().signal
    const result = await saveImagePlanEdit(caseId, imageId, command, { signal, fetchImpl: async (url, init) => {
      assert.equal(url, `/api/cases/${caseId}/images/${imageId}/plan/edits`)
      assert.equal(init.method, "PATCH"); assert.equal(init.cache, "no-store"); assert.equal(init.credentials, "same-origin")
      assert.equal(init.signal, signal); assert.equal(init.headers["Content-Type"], "application/json")
      assert.deepEqual(JSON.parse(init.body), command)
      return Response.json(after(command))
    } })
    assert.deepEqual(result, after(command))
  }
  const { label: _label, ...unlabelled } = commands[0]
  await saveImagePlanEdit(caseId, imageId, { ...unlabelled, id: newId.toUpperCase() }, { fetchImpl: async (_url, init) => {
    const input = JSON.parse(init.body)
    assert.equal(input.id, newId); assert.equal(input.label, null)
    return Response.json(after(input))
  } })
})

test("browser distance transport rejects incoherent acknowledgements as uncertain and preserves definitive BFF refusals", async () => {
  for (const command of commands) {
    const saved = after(command)
    const wrongStates = [{ ...saved, revision: 8 }, { ...saved, revision: 10 }, { ...saved, imageId: otherId },
      { ...saved, document: initial.document }]
    for (const data of wrongStates) await assert.rejects(saveImagePlanEdit(caseId, imageId, command,
      { fetchImpl: async () => Response.json(data) }), error => error.code === "INVALID_RESPONSE" && error.uncertain)
    for (const code of ["CALIBRATION_REQUIRED", "CALIBRATION_GEOMETRY_UNSUPPORTED", "PLAN_REVISION_CONFLICT", "PLAN_SAVE_NOT_ALLOWED", "VALIDATION_ERROR"]) {
      await assert.rejects(saveImagePlanEdit(caseId, imageId, command, { fetchImpl: async () =>
        Response.json({ error: { code, uncertain: false, currentRevision: 12 } }, { status: 409 }) }),
      error => error.code === code && !error.uncertain && error.currentRevision === 12)
    }
    await assert.rejects(saveImagePlanEdit(caseId, imageId, command, { fetchImpl: async () => new Response("malformed", { status: 200 }) }),
      error => error.code === "INVALID_RESPONSE" && error.uncertain)
  }
})

test("identical distance commands share one request, snapshot their input and do not write again after acknowledgement", async () => {
  for (const command of commands) {
    const client = makeClient(), entered = deferred(), barrier = deferred(), calls = []
    const options = { fetchImpl: async (_url, init) => {
      calls.push(init.method); assert.deepEqual(JSON.parse(init.body), command)
      entered.resolve(); await barrier.promise; return Response.json(after(command))
    } }
    try {
      const mutable = structuredClone(command)
      const first = requestPlanEditSave(client, identity, mutable, options)
      assert.equal(first, requestPlanEditSave(client, identity, structuredClone(command), options))
      if (mutable.start) mutable.start.x = 0.9
      else mutable.id = otherId
      await entered.promise
      assert.equal(isCalibrationSaveLocked(client, caseId, imageId), true)
      barrier.resolve()
      assert.equal((await first).phase, "saved")
      assert.equal((await requestPlanEditSave(client, identity, command, options)).phase, "saved")
      assert.deepEqual(calls, ["PATCH"])
      assert.deepEqual(client.getQueryData(keys.imagePlanSave(caseId, imageId)).edit, command)
      assert.deepEqual(client.getQueryData(keys.imagePlan(caseId, imageId)), after(command))
    } finally { barrier.resolve(); client.clear() }
  }
})

test("an active distance blocks different commands, other tools and destructive actions without replacing its receipt", async () => {
  const client = makeClient(), entered = deferred(), barrier = deferred(), command = commands[0]
  try {
    const first = requestPlanEditSave(client, identity, command, { fetchImpl: async () => { entered.resolve(); await barrier.promise; return Response.json(after(command)) } })
    await entered.promise
    const receipt = client.getQueryData(keys.imagePlanSave(caseId, imageId))
    for (const input of [{ ...command, id: otherId }, { ...command, end: { x: 0.9, y: 0.8 } }, commands[1], commands[2], quality]) {
      assert.equal((await requestPlanEditSave(client, identity, input, { fetchImpl: forbidden })).code, "OPERATION_BLOCKED")
      assert.equal((await checkImagePlanSave(client, identity, input, { fetchImpl: forbidden })).code, "OPERATION_BLOCKED")
      assert.equal(discardPlanEditSave(client, identity, input), false)
      assert.deepEqual(client.getQueryData(keys.imagePlanSave(caseId, imageId)), receipt)
    }
    assert.equal((await requestCalibrationSave(client, identity, calibration, { fetchImpl: forbidden })).code, "OPERATION_BLOCKED")
    assert.equal((await requestImageDeletion(client, f.identity, { fetchImpl: forbidden })).message, "blocked")
    assert.equal((await requestCaseDeletion(client, caseId, { fetchImpl: forbidden })).message, "blocked")
    barrier.resolve(); assert.equal((await first).phase, "saved")
  } finally { barrier.resolve(); client.clear() }
})

test("lost responses reconcile create, update and delete by GET, retaining the original command and stable UUID", async () => {
  for (const command of commands) {
    const client = makeClient(), calls = []
    try {
      const result = await requestPlanEditSave(client, identity, command, { fetchImpl: async (_url, init) => {
        calls.push(init.method)
        if (init.method === "PATCH") throw new TypeError("lost after commit")
        return Response.json(after(command))
      } })
      assert.equal(result.phase, "saved"); assert.equal(result.currentRevision, 9)
      assert.equal(result.code, command.kind === "distance-delete" ? "DISTANCE_ALREADY_REMOVED" : undefined)
      assert.deepEqual(result.edit, command); assert.deepEqual(calls, ["PATCH", "GET"])
      assert.equal(isCalibrationSaveLocked(client, caseId, imageId), false)
    } finally { client.clear() }
  }
})

test("a rejected deletion CAS reconciles observed absence without claiming authorship or replaying", async () => {
  const command = commands[2], client = makeClient(), calls = []
  try {
    const result = await requestPlanEditSave(client, identity, command, { fetchImpl: async (_url, init) => {
      calls.push(init.method)
      if (init.method === "PATCH") return Response.json({ error: { code: "PLAN_REVISION_CONFLICT", uncertain: false, currentRevision: 9 } }, { status: 409 })
      return Response.json(after(command))
    } })
    assert.equal(result.phase, "saved")
    assert.equal(result.code, "DISTANCE_ALREADY_REMOVED")
    assert.deepEqual(calls, ["PATCH", "GET"])
    assert.deepEqual(client.getQueryData(keys.imagePlan(caseId, imageId)).document, after(command).document)
  } finally { client.clear() }
})

test("unchanged reads retain uncertainty until a later read confirms the saved effect; even delete needs a newer revision", async () => {
  for (const command of commands) {
    const client = makeClient(), calls = []
    let persisted = false
    const options = { fetchImpl: async (_url, init) => {
      calls.push(init.method)
      if (init.method === "PATCH") throw new TypeError("lost")
      return Response.json(persisted ? after(command) : initial)
    } }
    try {
      assert.equal((await requestPlanEditSave(client, identity, command, options)).phase, "uncertain")
      assert.equal(discardPlanEditSave(client, identity, command), false)
      const unchanged = await checkImagePlanSave(client, identity, command, options)
      assert.equal(unchanged.phase, "uncertain"); assert.equal(unchanged.code, "SAVE_NOT_CONFIRMED")
      assert.deepEqual(unchanged.edit, command)
      if (command.kind === "distance-delete") {
        const sameRevisionAbsent = { ...after(command), revision: 8 }
        assert.equal((await checkImagePlanSave(client, identity, command, { fetchImpl: async () => Response.json(sameRevisionAbsent) })).phase, "uncertain")
      }
      persisted = true
      assert.equal((await checkImagePlanSave(client, identity, command, options)).phase, "saved")
      assert.deepEqual(calls, ["PATCH", "GET", "GET", "GET"])
    } finally { client.clear() }
  }
})

test("an uncertain command cannot be taken over by another kind or target, and a changed same-target intent only checks the original", async () => {
  const client = makeClient(), command = commands[0], calls = []
  const options = { fetchImpl: async (_url, init) => {
    calls.push(init.method)
    if (init.method === "PATCH") throw new TypeError("lost")
    return Response.json(initial)
  } }
  try {
    await requestPlanEditSave(client, identity, command, options)
    for (const input of [{ ...command, id: otherId }, { ...commands[1], id: command.id }, { ...commands[2], id: command.id }, quality]) {
      assert.equal((await requestPlanEditSave(client, identity, input, { fetchImpl: forbidden })).code, "OPERATION_BLOCKED")
      assert.equal((await checkImagePlanSave(client, identity, input, { fetchImpl: forbidden })).code, "OPERATION_BLOCKED")
    }
    assert.equal((await requestCalibrationSave(client, identity, calibration, { fetchImpl: forbidden })).code, "OPERATION_BLOCKED")
    const changed = { ...command, end: { x: 0.9, y: 0.9 } }
    const state = await requestPlanEditSave(client, identity, changed, options)
    assert.equal(state.phase, "uncertain"); assert.deepEqual(state.edit, command)
    assert.equal((await requestPlanEditSave(client, identity, changed, { fetchImpl: forbidden, checkOnly: true })).code, "OPERATION_BLOCKED")
    assert.deepEqual(calls, ["PATCH", "GET", "GET"])
  } finally { client.clear() }
})

test("a newer incompatible plan becomes a conflict; only the exact failed command can be discarded", async () => {
  for (const command of commands) {
    const client = makeClient(), calls = []
    try {
      const state = await requestPlanEditSave(client, identity, command, { fetchImpl: async (_url, init) => {
        calls.push(init.method)
        if (init.method === "PATCH") throw new TypeError("lost")
        return Response.json({ ...initial, revision: 10 })
      } })
      assert.equal(state.phase, "conflict"); assert.equal(state.currentRevision, 10)
      assert.deepEqual(state.edit, command); assert.deepEqual(calls, ["PATCH", "GET"])
      assert.equal(discardPlanEditSave(client, identity, quality), false)
      assert.equal(discardPlanEditSave(client, identity, { ...command, id: otherId }), false)
      assert.equal(discardPlanEditSave(client, identity, { ...command, baseRevision: 9 }), false)
      assert.deepEqual(client.getQueryData(keys.imagePlanSave(caseId, imageId)), state)
      assert.equal(discardPlanEditSave(client, identity, command), true)
      assert.equal(client.getQueryData(keys.imagePlanSave(caseId, imageId)).phase, "idle")
    } finally { client.clear() }
  }
})

test("checking requires a real matching receipt, and a stale view cannot check a newer receipt queued before its read starts", async () => {
  const client = makeClient(), command = commands[0]
  try {
    assert.equal((await checkImagePlanSave(client, identity, command, { fetchImpl: forbidden })).code, "OPERATION_BLOCKED")
    assert.equal((await requestPlanEditSave(client, identity, command, { fetchImpl: forbidden, checkOnly: true })).code, "OPERATION_BLOCKED")
    client.setQueryData(keys.imagePlanSave(caseId, imageId), { phase: "uncertain", edit: command })
    const pending = checkImagePlanSave(client, identity, command, { fetchImpl: forbidden })
    const newer = { phase: "uncertain", edit: { ...command, label: "Newer receipt" } }
    client.setQueryData(keys.imagePlanSave(caseId, imageId), newer)
    assert.equal((await pending).code, "OPERATION_BLOCKED")
    assert.deepEqual(client.getQueryData(keys.imagePlanSave(caseId, imageId)), newer)
  } finally { client.clear() }
})

test("distance checks other raw drafts before sending, and acknowledgement never clears a later quality draft", async () => {
  const client = makeClient(), command = commands[0], entered = deferred(), barrier = deferred()
  try {
    client.setQueryData(keys.imagePlan(caseId, imageId), initial)
    client.setQueryData(keys.imageCalibrationDraft(caseId, imageId), editorFromCalibration(8, f.circle))
    assert.equal((await requestPlanEditSave(client, identity, command, { fetchImpl: forbidden })).code, "OPERATION_BLOCKED")
    client.setQueryData(keys.imageCalibrationDraft(caseId, imageId), null)
    const dirtyQuality = { baseRevision: 8, quality: { ...quality.quality, notes: "Keep this draft" } }
    client.setQueryData(keys.imageQualityDraft(caseId, imageId), dirtyQuality)
    assert.equal((await requestPlanEditSave(client, identity, command, { fetchImpl: forbidden })).code, "OPERATION_BLOCKED")
    client.setQueryData(keys.imageQualityDraft(caseId, imageId), null)
    const pending = requestPlanEditSave(client, identity, command, { fetchImpl: async () => { entered.resolve(); await barrier.promise; return Response.json(after(command)) } })
    await entered.promise
    client.setQueryData(keys.imageQualityDraft(caseId, imageId), dirtyQuality)
    barrier.resolve(); assert.equal((await pending).phase, "saved")
    assert.deepEqual(client.getQueryData(keys.imageQualityDraft(caseId, imageId)), dirtyQuality)
  } finally { barrier.resolve(); client.clear() }
})

test("definitive errors retain distance intent without a verification GET and allow its owner to retry explicitly", async () => {
  for (const command of commands) {
    const client = makeClient(), calls = []
    try {
      const failed = await requestPlanEditSave(client, identity, command, { fetchImpl: async (_url, init) => {
        calls.push(init.method); return Response.json({ error: { code: "CALIBRATION_REQUIRED", uncertain: false } }, { status: 409 })
      } })
      assert.equal(failed.phase, "error"); assert.equal(failed.code, "CALIBRATION_REQUIRED")
      assert.deepEqual(failed.edit, command); assert.deepEqual(calls, ["PATCH"])
      assert.equal((await checkImagePlanSave(client, identity, command, { fetchImpl: forbidden })).code, "OPERATION_BLOCKED")
      assert.equal((await requestPlanEditSave(client, identity, command, { fetchImpl: forbidden, checkOnly: true })).code, "OPERATION_BLOCKED")
      assert.deepEqual(client.getQueryData(keys.imagePlanSave(caseId, imageId)), failed)
      assert.equal(isCalibrationSaveLocked(client, caseId, imageId), false)
      assert.equal((await requestPlanEditSave(client, identity, quality, { fetchImpl: forbidden })).code, "OPERATION_BLOCKED")
      assert.equal((await requestPlanEditSave(client, identity, command, { fetchImpl: async (_url, init) => {
        calls.push(init.method); return Response.json(after(command))
      } })).phase, "saved")
      assert.deepEqual(calls, ["PATCH", "PATCH"])
    } finally { client.clear() }
  }
})

test("an old saved receipt checks a newer incompatible cached plan instead of repeating the old distance command", async () => {
  for (const command of commands) {
    const client = makeClient(), calls = []
    try {
      await requestPlanEditSave(client, identity, command, { fetchImpl: async () => Response.json(after(command)) })
      const changed = { ...initial, revision: 10 }
      client.setQueryData(keys.imagePlan(caseId, imageId), changed)
      const state = await requestPlanEditSave(client, identity, command, { fetchImpl: async (_url, init) => {
        calls.push(init.method); return Response.json(changed)
      } })
      assert.equal(state.phase, "conflict"); assert.equal(state.currentRevision, 10)
      assert.deepEqual(calls, ["GET"]); assert.deepEqual(state.edit, command)
    } finally { client.clear() }
  }
})

test("distance receipts survive unmount collection and stay isolated by image and organization QueryClient", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 5 } } }), otherOrganization = makeClient()
  const key = keys.imagePlanSave(caseId, imageId), command = commands[0]
  const observer = new QueryObserver(client, { queryKey: key, enabled: false }), unsubscribe = observer.subscribe(() => {})
  try {
    await requestPlanEditSave(client, identity, command, { fetchImpl: async (_url, init) => {
      if (init.method === "PATCH") throw new TypeError("lost")
      return Response.json(initial)
    } })
    unsubscribe(); await new Promise(resolve => setTimeout(resolve, 20))
    assert.equal(client.getQueryData(key).phase, "uncertain")
    assert.equal(isCalibrationSaveLocked(client, caseId, imageId), true)
    assert.equal(otherOrganization.getQueryData(key), undefined)
    assert.equal((await requestPlanEditSave(otherOrganization, identity, command, { fetchImpl: async () => Response.json(after(command)) })).phase, "saved")
    const other = { caseId, imageId: otherId }
    assert.equal((await requestPlanEditSave(client, other, command, { fetchImpl: async () => Response.json({ ...after(command), imageId: otherId }) })).phase, "saved")
    assert.equal(client.getQueryData(key).phase, "uncertain")
  } finally { unsubscribe(); observer.destroy(); client.clear(); otherOrganization.clear() }
})

test("late distance write or reconciliation responses never recreate confirmed-deleted image data or receipts", async () => {
  for (const duringRead of [false, true]) {
    const client = makeClient(), entered = deferred(), barrier = deferred(), command = commands[0]
    try {
      const pending = requestPlanEditSave(client, identity, command, { fetchImpl: async (_url, init) => {
        if (duringRead && init.method === "PATCH") throw new TypeError("lost")
        entered.resolve(); await barrier.promise; return Response.json(after(command))
      } })
      await entered.promise
      client.setQueryData(keys.imageDeletion(caseId, imageId), { phase: "deleted" })
      client.removeQueries({ queryKey: keys.imagePlanSave(caseId, imageId), exact: true })
      client.removeQueries({ queryKey: keys.imagePlan(caseId, imageId), exact: true })
      barrier.resolve()
      assert.equal((await pending).code, "IMAGE_NOT_FOUND")
      assert.equal(client.getQueryData(keys.imagePlan(caseId, imageId)), undefined)
      assert.equal(client.getQueryData(keys.imagePlanSave(caseId, imageId)), undefined)
    } finally { barrier.resolve(); client.clear() }
  }
})
