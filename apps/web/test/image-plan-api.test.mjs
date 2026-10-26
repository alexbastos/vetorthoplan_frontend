import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"
import { QueryClient, QueryObserver } from "@tanstack/react-query"
import { imagePlanFixture } from "./fixtures/image-plan.mjs"

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })
const { fetchImagePlan, saveImageCalibration, ImagePlanError } = await import("../src/features/cases/services/image-plan-api.ts")
const { requestCalibrationSave } = await import("../src/features/cases/lib/image-plan-saving.ts")
const { imagePlanQueryOptions } = await import("../src/features/cases/lib/image-plan-query-options.ts")
const { isCalibrationSaveLocked } = await import("../src/features/cases/lib/calibration-save-state.ts")
const { requestImageDeletion } = await import("../src/features/cases/lib/image-deletion.ts")
const { requestCaseDeletion } = await import("../src/features/cases/lib/case-deletion.ts")
const { casesQueryKeys: keys } = await import("../src/features/cases/hooks/cases-query-keys.ts")
const f = imagePlanFixture()
const { caseId, identity: { imageId } } = f
const identity = { caseId, imageId }
const command = { baseRevision: 0, calibration: f.line }
const initial = f.publicPlan(f.initial)
const saved = f.publicPlan(f.persist({ base_revision: 0, document: { ...f.initial.document, calibration: f.line } }))
const json = data => Response.json(data)
const error = (code, status = 503, uncertain) => Response.json({ error: { code, retryable: false, ...(uncertain === undefined ? {} : { uncertain }) } }, { status })
const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes }); return { promise, resolve } }

test("browser GET/PUT use same-origin no-store transport and send only the validated calibration and revision", async () => {
  const calls = [], signal = new AbortController().signal
  const fetchImpl = async (url, init) => { calls.push({ url, init }); return json(init.method === "GET" ? initial : saved) }
  assert.deepEqual(await fetchImagePlan(caseId, imageId, { fetchImpl, signal }), initial)
  assert.deepEqual(await saveImageCalibration(caseId, imageId, command, { fetchImpl, signal }), saved)
  for (const { url, init } of calls) {
    assert.equal(url, `/api/cases/${caseId}/images/${imageId}/plan`)
    assert.equal(init.credentials, "same-origin"); assert.equal(init.cache, "no-store"); assert.equal(init.signal, signal)
  }
  assert.equal(calls[0].init.body, undefined)
  assert.deepEqual(JSON.parse(calls[1].init.body), command)
  assert.equal(new Headers(calls[1].init.headers).get("content-type"), "application/json")
  await assert.rejects(saveImageCalibration(caseId, imageId, { ...command, document: {} }, { fetchImpl }), e => e.code === "VALIDATION_ERROR")
  await assert.rejects(fetchImagePlan("../case", imageId, { fetchImpl }), e => e.code === "VALIDATION_ERROR")
  assert.equal(calls.length, 2)
})

test("browser rejects bad identities and acknowledgements, preserving uncertainty only when a write may have occurred", async () => {
  for (const body of [{ ...saved, imageId: "00000000-0000-4000-8000-000000000999" }, { ...saved, revision: 5 },
    { ...saved, document: { ...saved.document, calibration: f.line } }, { ...saved, document: { ...saved.document, unrecognized: {} } }]) {
    await assert.rejects(saveImageCalibration(caseId, imageId, command, { fetchImpl: async () => json(body) }), e => e instanceof ImagePlanError && e.code === "INVALID_RESPONSE" && e.uncertain)
  }
  await assert.rejects(saveImageCalibration(caseId, imageId, command, { fetchImpl: async () => error("PLAN_REVISION_CONFLICT", 409, false) }), e => e.code === "PLAN_REVISION_CONFLICT" && !e.uncertain)
  await assert.rejects(saveImageCalibration(caseId, imageId, command, { fetchImpl: async () => error("SERVICE_UNAVAILABLE", 503, false) }), e => !e.uncertain)
  await assert.rejects(saveImageCalibration(caseId, imageId, command, { fetchImpl: async () => { throw new TypeError("lost response") } }), e => e.code === "NETWORK_ERROR" && e.uncertain)
  await assert.rejects(fetchImagePlan(caseId, imageId, { fetchImpl: async () => error("IMAGE_NOT_FOUND", 404) }), e => e.code === "IMAGE_NOT_FOUND" && !e.uncertain)
  await assert.rejects(fetchImagePlan(caseId, imageId, { fetchImpl: async () => Response.json({ error: { code: "PRIVATE", message: "private" } }, { status: 500 }) }), e => e.code === "INVALID_RESPONSE" && !e.message.includes("private"))
})

test("query cache deduplicates plan reads and stays isolated between images and organization QueryClients", async () => {
  const first = new QueryClient(), second = new QueryClient(), barrier = deferred()
  let reads = 0
  const options = imagePlanQueryOptions(first, identity, { fetchImpl: async () => { reads++; await barrier.promise; return json(initial) } })
  try {
    const one = first.fetchQuery(options), two = first.fetchQuery(options)
    barrier.resolve()
    assert.deepEqual(await one, await two)
    assert.equal(reads, 1)
    assert.equal(second.getQueryData(keys.imagePlan(caseId, imageId)), undefined)
    assert.equal(first.getQueryData(keys.imagePlan(caseId, "other-image")), undefined)
    first.setQueryData(keys.imageDeletion(caseId, imageId), { phase: "deleted" })
    assert.equal(options.enabled(), false)
    await assert.rejects(first.fetchQuery(options), e => e.code === "IMAGE_NOT_FOUND")
    assert.equal(reads, 1)
  } finally { first.clear(); second.clear() }
})

test("identical saves share one PUT, preserve a detached draft and update only the intended plan", async () => {
  const client = new QueryClient(), barrier = deferred(), began = deferred()
  let writes = 0
  const fetchImpl = async (_url, init) => {
    assert.equal(init.method, "PUT"); writes++; began.resolve(); await barrier.promise
    assert.deepEqual(JSON.parse(init.body), command)
    return json(saved)
  }
  const otherKey = keys.imagePlan(caseId, "other-image")
  client.setQueryData(otherKey, { untouched: true })
  try {
    const mutable = structuredClone(command)
    const one = requestCalibrationSave(client, identity, mutable, { fetchImpl })
    assert.equal(one, requestCalibrationSave(client, identity, structuredClone(command), { fetchImpl }))
    mutable.calibration.known_length_mm = 100
    await began.promise
    assert.equal(isCalibrationSaveLocked(client, caseId, imageId), true)
    assert.equal(imagePlanQueryOptions(client, identity).enabled(), false)
    const competing = await requestCalibrationSave(client, identity, { ...command, calibration: f.circle }, { fetchImpl })
    assert.equal(competing.code, "OPERATION_BLOCKED")
    assert.equal(client.getQueryData(keys.imagePlanSave(caseId, imageId)).phase, "saving")
    barrier.resolve()
    assert.equal((await one).phase, "saved")
    assert.equal(isCalibrationSaveLocked(client, caseId, imageId), false)
    assert.deepEqual(client.getQueryData(keys.imagePlan(caseId, imageId)), saved)
    assert.deepEqual(client.getQueryData(otherKey), { untouched: true })
    await requestCalibrationSave(client, identity, command, { fetchImpl })
    assert.equal(writes, 1, "a double-click after acknowledgement also cannot repeat the old command")
  } finally { barrier.resolve(); client.clear() }
})

test("a revision conflict reads current state and retains the original draft without automatically resubmitting", async () => {
  const client = new QueryClient(), calls = []
  const latest = { ...initial, revision: 2, updatedAt: "2026-10-23T19:01:00Z" }
  const fetchImpl = async (_url, init) => { calls.push(init.method); return init.method === "PUT" ? error("PLAN_REVISION_CONFLICT", 409, false) : json(latest) }
  try {
    const state = await requestCalibrationSave(client, identity, command, { fetchImpl })
    assert.equal(state.phase, "conflict"); assert.equal(state.currentRevision, 2)
    assert.deepEqual(state.draft, command)
    assert.deepEqual(client.getQueryData(keys.imagePlan(caseId, imageId)), latest)
    assert.deepEqual(calls, ["PUT", "GET"])
  } finally { client.clear() }
})

test("lost write responses reconcile a matching newer persisted calibration as saved", async () => {
  const client = new QueryClient(), calls = []
  try {
    const state = await requestCalibrationSave(client, identity, command, { fetchImpl: async (_url, init) => {
      calls.push(init.method)
      if (init.method === "PUT") throw new TypeError("response lost after commit")
      return json(saved)
    } })
    assert.equal(state.phase, "saved")
    assert.deepEqual(calls, ["PUT", "GET"])
    assert.deepEqual(client.getQueryData(keys.imagePlan(caseId, imageId)), saved)
  } finally { client.clear() }
})

test("unchanged or unreadable reconciliation stays check-only, even when another view supplies a different draft", async () => {
  const client = new QueryClient(), calls = []
  let unreadable = true
  const fetchImpl = async (_url, init) => {
    calls.push(init.method)
    if (init.method === "PUT" || unreadable) throw new TypeError("connection lost")
    return json(initial)
  }
  try {
    const first = await requestCalibrationSave(client, identity, command, { fetchImpl })
    assert.equal(first.phase, "uncertain")
    unreadable = false
    const check = await requestCalibrationSave(client, identity, { ...command, calibration: f.circle }, { fetchImpl })
    assert.equal(check.phase, "uncertain")
    assert.deepEqual(check.draft, command)
    assert.equal(check.code, "SAVE_NOT_CONFIRMED")
    assert.equal(isCalibrationSaveLocked(client, caseId, imageId), true)
    assert.deepEqual(calls, ["PUT", "GET", "GET"])
  } finally { client.clear() }
})

test("a lost command followed by a different newer revision becomes a conflict, never a second PUT", async () => {
  const client = new QueryClient(), calls = []
  const latest = f.publicPlan(f.persist({ base_revision: 1, document: { ...f.initial.document, calibration: f.circle } }))
  try {
    const state = await requestCalibrationSave(client, identity, command, { fetchImpl: async (_url, init) => {
      calls.push(init.method); if (init.method === "PUT") throw new TypeError("lost"); return json(latest)
    } })
    assert.equal(state.phase, "conflict")
    assert.deepEqual(state.draft, command)
    assert.deepEqual(calls, ["PUT", "GET"])
    assert.equal(isCalibrationSaveLocked(client, caseId, imageId), false)
  } finally { client.clear() }
})

test("definitive read/preflight refusals keep the draft without pretending a write may still be running", async () => {
  for (const code of ["CALIBRATION_GEOMETRY_UNSUPPORTED", "IMAGE_NOT_READY", "VALIDATION_ERROR", "ACCESS_DENIED", "CLINICAL_VALIDATION_INVALID", "SERVICE_UNAVAILABLE"]) {
    const client = new QueryClient(), calls = []
    try {
      const state = await requestCalibrationSave(client, identity, command, { fetchImpl: async (_url, init) => {
        calls.push(init.method); return error(code, 422, false)
      } })
      assert.equal(state.phase, "error"); assert.equal(state.code, code)
      assert.deepEqual(state.draft, command)
      assert.deepEqual(calls, ["PUT"])
      assert.equal(isCalibrationSaveLocked(client, caseId, imageId), false)
    } finally { client.clear() }
  }
})

test("plan saving and case/image deletion mutually exclude commands before any destructive HTTP", async () => {
  const client = new QueryClient(), forbidden = async () => assert.fail("must not contact upstream")
  try {
    client.setQueryData(keys.imagePlanSave(caseId, imageId), { phase: "saving", draft: command })
    assert.equal((await requestImageDeletion(client, f.identity, { fetchImpl: forbidden })).message, "blocked")
    assert.equal((await requestCaseDeletion(client, caseId, { fetchImpl: forbidden })).message, "blocked")
    client.setQueryData(keys.imagePlanSave(caseId, imageId), { phase: "idle" })
    client.setQueryData(keys.imageDeletion(caseId, imageId), { phase: "deleting" })
    assert.equal((await requestCalibrationSave(client, identity, command, { fetchImpl: forbidden })).code, "OPERATION_BLOCKED")
    client.setQueryData(keys.imageDeletion(caseId, imageId), { phase: "idle" })
    client.setQueryData(keys.caseDeletion(caseId), { phase: "uncertain" })
    assert.equal((await requestCalibrationSave(client, identity, command, { fetchImpl: forbidden })).code, "OPERATION_BLOCKED")
  } finally { client.clear() }
})

test("confirmed image deletion clears its cached plan and command receipt while keeping other image plans", async () => {
  const client = new QueryClient()
  try {
    client.setQueryData(keys.imagePlan(caseId, imageId), saved)
    client.setQueryData(keys.imagePlanSave(caseId, imageId), { phase: "saved", draft: command })
    client.setQueryData(keys.imagePlan(caseId, "other"), { retained: true })
    const state = await requestImageDeletion(client, f.identity, { fetchImpl: async (_url, init) => {
      assert.equal(init.method ?? "GET", "GET"); return Response.json({ items: [] })
    } })
    assert.equal(state.phase, "deleted")
    assert.equal(client.getQueryData(keys.imagePlan(caseId, imageId)), undefined)
    assert.equal(client.getQueryData(keys.imagePlanSave(caseId, imageId)), undefined)
    assert.deepEqual(client.getQueryData(keys.imagePlan(caseId, "other")), { retained: true })
  } finally { client.clear() }
})

test("a late save cannot recreate a case's removed plan or command receipt", async () => {
  const client = new QueryClient(), began = deferred(), barrier = deferred()
  try {
    const pending = requestCalibrationSave(client, identity, command, { fetchImpl: async () => { began.resolve(); await barrier.promise; return json(saved) } })
    await began.promise
    client.setQueryData(keys.caseDeletion(caseId), { phase: "deleted" })
    client.removeQueries({ queryKey: keys.imagePlan(caseId, imageId), exact: true })
    client.removeQueries({ queryKey: keys.imagePlanSave(caseId, imageId), exact: true })
    barrier.resolve()
    assert.equal((await pending).code, "IMAGE_NOT_FOUND")
    assert.equal(client.getQueryData(keys.imagePlan(caseId, imageId)), undefined)
    assert.equal(client.getQueryData(keys.imagePlanSave(caseId, imageId)), undefined)
  } finally { barrier.resolve(); client.clear() }
})

test("an older in-flight plan read cannot overwrite an acknowledged save", async () => {
  const client = new QueryClient(), began = deferred(), barrier = deferred()
  try {
    const old = client.fetchQuery(imagePlanQueryOptions(client, identity, { fetchImpl: async () => { began.resolve(); await barrier.promise; return json(initial) } }))
    const cancelled = old.catch(() => undefined)
    await began.promise
    const state = await requestCalibrationSave(client, identity, command, { fetchImpl: async () => json(saved) })
    barrier.resolve()
    await cancelled
    assert.equal(state.phase, "saved")
    assert.deepEqual(client.getQueryData(keys.imagePlan(caseId, imageId)), saved)
  } finally { barrier.resolve(); client.clear() }
})

test("an old saved receipt does not claim success after a newer plan changes the calibration", async () => {
  const client = new QueryClient(), calls = []
  try {
    await requestCalibrationSave(client, identity, command, { fetchImpl: async () => json(saved) })
    const newer = f.publicPlan(f.persist({ base_revision: 1, document: { ...f.initial.document, calibration: f.circle } }))
    client.setQueryData(keys.imagePlan(caseId, imageId), newer)
    const state = await requestCalibrationSave(client, identity, command, { fetchImpl: async (_url, init) => {
      calls.push(init.method); return json(newer)
    } })
    assert.equal(state.phase, "conflict")
    assert.equal(state.currentRevision, 2)
    assert.deepEqual(state.draft, command)
    assert.deepEqual(calls, ["GET"])
  } finally { client.clear() }
})

test("an existing receipt survives observer unmount and garbage collection while a write remains uncertain", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 10 } } }), calls = []
  const key = keys.imagePlanSave(caseId, imageId)
  const observer = new QueryObserver(client, { queryKey: key, enabled: false })
  const unsubscribe = observer.subscribe(() => {})
  const fetchImpl = async (_url, init) => {
    calls.push(init.method)
    if (init.method === "PUT") throw new TypeError("response lost")
    return json(initial)
  }
  try {
    assert.equal((await requestCalibrationSave(client, identity, command, { fetchImpl })).phase, "uncertain")
    unsubscribe()
    await new Promise(resolve => setTimeout(resolve, 30))
    assert.equal(client.getQueryData(key)?.phase, "uncertain", "unmount must not forget an unresolved write")
    assert.equal(isCalibrationSaveLocked(client, caseId, imageId), true)
    assert.equal((await requestCalibrationSave(client, identity, { ...command, calibration: f.circle }, { fetchImpl })).phase, "uncertain")
    assert.deepEqual(calls, ["PUT", "GET", "GET"], "only reconciliation is allowed after remount")
  } finally { unsubscribe(); observer.destroy(); client.clear() }
})
