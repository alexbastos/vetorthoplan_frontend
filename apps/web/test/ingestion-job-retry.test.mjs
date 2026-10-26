import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"
import { QueryClient } from "@tanstack/react-query"

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })
const { IngestionRetryError, retryIngestionJob } = await import("../src/features/cases/services/ingestion-job-retry-api.ts")
const { canRetryIngestion, observeRetriedJob, requestIngestionRetry } = await import("../src/features/cases/lib/ingestion-job-retry.ts")
const { ingestionJobQueryOptions } = await import("../src/features/cases/lib/ingestion-query-options.ts")
const { casesQueryKeys: keys } = await import("../src/features/cases/hooks/cases-query-keys.ts")
const { terminalIngestionRefreshKey } = await import("../src/features/cases/lib/case-ingestion.ts")
const { imageUploadPresentation } = await import("../src/features/cases/lib/image-upload-presentation.ts")
const { caseImageViewerMessage } = await import("../src/features/cases/lib/case-image-state.ts")
const caseId = "00000000-0000-4000-8000-000000000064", imageId = "00000000-0000-4000-8000-000000000125"
const jobId = "00000000-0000-4000-8000-000000000126", uploadId = "00000000-0000-4000-8000-000000000124"
const identity = { caseId, imageId, uploadId, jobId }, target = { ...identity, imageStatus: "FAILED" }
const failed = { id: jobId, caseId, imageId, uploadId, status: "FAILED", attempts: 1, errorCode: "processing_failed",
  createdAt: "2026-10-20T12:00:00Z", updatedAt: "2026-10-20T12:00:02Z", startedAt: "2026-10-20T12:00:01Z", finishedAt: "2026-10-20T12:00:02Z" }
const queued = { ...failed, status: "QUEUED", errorCode: null, startedAt: null, finishedAt: null, updatedAt: "2026-10-20T12:01:00Z" }
const state = client => client.getQueryData(keys.ingestionRetry(caseId, jobId))
const cached = client => client.getQueryData(keys.ingestionJob(caseId, jobId))

test("retry service sends one same-origin POST without body or storage credentials and validates all four identities", async () => {
  const calls = []
  assert.deepEqual(await retryIngestionJob(identity, { fetchImpl: async (url, init) => { calls.push({ url, init }); return Response.json(queued, { status: 202 }) } }), queued)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, `/api/cases/${caseId}/jobs/${jobId}/retry`)
  assert.equal(calls[0].init.method, "POST")
  assert.equal(calls[0].init.body, undefined)
  assert.equal(calls[0].init.headers, undefined)
  assert.equal(calls[0].init.credentials, "same-origin")
  assert.equal(calls[0].init.cache, "no-store")
  for (const field of ["id", "caseId", "imageId", "uploadId"]) {
    await assert.rejects(retryIngestionJob(identity, { fetchImpl: async () => Response.json({ ...queued, [field]: "00000000-0000-4000-8000-000000000999" }, { status: 202 }) }),
      error => error instanceof IngestionRetryError && error.code === "INVALID_RESPONSE" && error.uncertain)
  }
  for (const [status, code, uncertain] of [[404, "JOB_NOT_FOUND", false], [409, "JOB_RETRY_NOT_ALLOWED", false], [503, "SERVICE_UNAVAILABLE", true]]) {
    await assert.rejects(retryIngestionJob(identity, { fetchImpl: async () => Response.json({ error: { code, retryable: false } }, { status }) }),
      error => error.code === code && error.uncertain === uncertain)
  }
})

test("double clicks and another view share one command, reuse the existing job/image and resume active polling without inventing READY", async () => {
  const client = new QueryClient()
  let release
  const barrier = new Promise(resolve => { release = resolve })
  const methods = []
  client.setQueryData(keys.images(caseId), [{ id: imageId, status: "FAILED" }])
  const fetchImpl = async (_, init) => {
    methods.push(init.method ?? "GET")
    if (init.method === "POST") { await barrier; return Response.json(queued, { status: 202 }) }
    return Response.json(failed)
  }
  try {
    const first = requestIngestionRetry(client, target, { fetchImpl })
    const second = requestIngestionRetry(client, { ...target }, { fetchImpl })
    assert.equal(first, second)
    release(); await Promise.all([first, second])
    assert.deepEqual(methods, ["GET", "POST"])
    assert.equal(cached(client).id, jobId)
    assert.equal(cached(client).imageId, imageId)
    assert.equal(state(client).acknowledged, true)
    assert.equal(state(client).phase, "idle")
    const polling = ingestionJobQueryOptions(target, { retryAcknowledged: state(client).acknowledged })
    assert.equal(polling.refetchInterval({ state: { data: cached(client), error: null } }), 2000)
    assert.equal(client.getQueryData(keys.images(caseId))[0].status, "FAILED")
    assert.equal(caseImageViewerMessage({ status: "FAILED" }, "QUEUED", true), "ingestionPending")
    assert.equal(imageUploadPresentation({ phase: "quarantined", completed: {}, error: null, progress: 100 }, "FAILED", "QUEUED", false, true).label, "loading")
  } finally { release(); client.clear() }
})

test("a lost response is reconciled by GET; queued, fast success, rejection and a new failure never trigger a second POST", async () => {
  for (const status of ["QUEUED", "SUCCEEDED", "REJECTED", "FAILED"]) {
    const client = new QueryClient()
    let posted = false
    const methods = []
    const actual = { ...queued, status, attempts: 2, finishedAt: status === "QUEUED" ? null : "2026-10-20T12:01:02Z" }
    try {
      await requestIngestionRetry(client, target, { fetchImpl: async (_, init) => {
        methods.push(init.method ?? "GET")
        if (init.method === "POST") { posted = true; throw new Error("response lost") }
        return Response.json(posted ? actual : failed)
      } })
      assert.deepEqual(methods, ["GET", "POST", "GET"])
      assert.equal(cached(client).status, status)
      assert.equal(state(client).phase, "idle")
      assert.equal(state(client).acknowledged, true)
      if (status !== "QUEUED") {
        assert.ok(terminalIngestionRefreshKey({ ...target, job: cached(client), retryAcknowledged: true }))
        assert.equal(ingestionJobQueryOptions(target, { retryAcknowledged: true }).refetchInterval({ state: { data: actual, error: null } }), false)
      }
    } finally { client.clear() }
  }
})

test("an ambiguous command with unchanged FAILED stays check-only across remounts until a transition is observed", async () => {
  const client = new QueryClient()
  const methods = []
  let actual = failed
  const fetchImpl = async (_, init) => {
    methods.push(init.method ?? "GET")
    if (init.method === "POST") throw new Error("connection lost before outcome known")
    return Response.json(actual)
  }
  try {
    await requestIngestionRetry(client, target, { fetchImpl })
    assert.equal(state(client).phase, "uncertain")
    assert.equal(state(client).message, "unconfirmed")
    await requestIngestionRetry(client, { ...target }, { fetchImpl })
    await requestIngestionRetry(client, target, { fetchImpl, checkOnly: true })
    assert.equal(methods.filter(method => method === "POST").length, 1)
    assert.equal(state(client).phase, "uncertain")
    actual = queued
    await requestIngestionRetry(client, target, { fetchImpl, checkOnly: true })
    assert.equal(state(client).phase, "idle")
    assert.equal(cached(client).status, "QUEUED")
    assert.equal(methods.filter(method => method === "POST").length, 1)
  } finally { client.clear() }
})

test("409 races and a job already active before click are read rather than blindly resent", async () => {
  for (const alreadyActive of [true, false]) {
    const client = new QueryClient()
    const methods = []
    let posted = false
    try {
      await requestIngestionRetry(client, target, { fetchImpl: async (_, init) => {
        methods.push(init.method ?? "GET")
        if (init.method === "POST") { posted = true; return Response.json({ error: { code: "JOB_RETRY_NOT_ALLOWED" } }, { status: 409 }) }
        return Response.json(alreadyActive || posted ? queued : failed)
      } })
      assert.deepEqual(methods, alreadyActive ? ["GET"] : ["GET", "POST", "GET"])
      assert.equal(cached(client).status, "QUEUED")
      assert.equal(state(client).phase, "idle")
    } finally { client.clear() }
  }
})

test("a confirmed new failure permits a later explicit retry, with no extra command in between", async () => {
  const client = new QueryClient()
  let actual = failed, posts = 0
  const fetchImpl = async (_, init) => {
    if (init.method === "POST") {
      posts++
      if (posts === 1) { actual = { ...failed, attempts: 2, updatedAt: "2026-10-20T12:01:02Z" }; throw new Error("lost") }
      actual = { ...queued, attempts: 2 }; return Response.json(actual, { status: 202 })
    }
    return Response.json(actual)
  }
  try {
    await requestIngestionRetry(client, target, { fetchImpl })
    assert.equal(posts, 1)
    assert.equal(state(client).message, "failedAgain")
    assert.equal(state(client).phase, "idle")
    await requestIngestionRetry(client, target, { fetchImpl })
    assert.equal(posts, 2)
    assert.equal(cached(client).status, "QUEUED")
  } finally { client.clear() }
})

test("terminal images and rejected jobs cannot request retry; missing jobs, denied access and read failures stay recoverable by reads", async () => {
  for (const imageStatus of ["READY", "REJECTED", "CANCELLED", "PENDING_UPLOAD"]) {
    const client = new QueryClient()
    try {
      assert.equal(canRetryIngestion({ ...target, imageStatus, job: failed }), false)
      await requestIngestionRetry(client, { ...target, imageStatus }, { fetchImpl: async () => { throw new Error("must not call") } })
      assert.equal(state(client), undefined)
    } finally { client.clear() }
  }
  assert.equal(canRetryIngestion({ ...target, job: { ...failed, status: "REJECTED" } }), false)
  const rejectedClient = new QueryClient()
  try {
    await requestIngestionRetry(rejectedClient, target, { fetchImpl: async (_, init) => { assert.notEqual(init.method, "POST"); return Response.json({ ...failed, status: "REJECTED" }) } })
  } finally { rejectedClient.clear() }
  for (const [status, code, message] of [[404, "JOB_NOT_FOUND", "notFound"], [403, "ACCESS_DENIED", "accessDenied"], [503, "SERVICE_UNAVAILABLE", "unavailable"]]) {
    const client = new QueryClient()
    try {
      await requestIngestionRetry(client, target, { fetchImpl: async (_, init) => {
        assert.notEqual(init.method, "POST"); return Response.json({ error: { code, retryable: false } }, { status })
      } })
      assert.equal(state(client).phase, "error")
      assert.equal(state(client).message, message)
      await requestIngestionRetry(client, target, { fetchImpl: async (_, init) => { assert.notEqual(init.method, "POST"); return Response.json(failed) } })
      assert.equal(state(client).phase, "idle")
    } finally { client.clear() }
  }
})

test("fresh job reads recover an external retry behind a FAILED image; old active cache alone cannot restart polling", async () => {
  const client = new QueryClient()
  client.setQueryData(keys.ingestionJob(caseId, jobId), queued)
  try {
    const old = ingestionJobQueryOptions(target)
    assert.equal(old.refetchInterval({ state: { data: queued, error: null } }), false)
    assert.equal(old.staleTime, 0)
    await client.fetchQuery(ingestionJobQueryOptions(target, { fetchImpl: async () => Response.json(queued),
      onJobRead: job => observeRetriedJob(client, identity, job) }))
    assert.equal(state(client).acknowledged, true)
    client.setQueryData(keys.ingestionRetry(caseId, jobId), { phase: "idle", acknowledged: true, message: "failedAgain" })
    observeRetriedJob(client, identity, queued)
    assert.equal(state(client).message, undefined)
    const resumed = ingestionJobQueryOptions(target, { retryAcknowledged: true })
    assert.equal(resumed.refetchInterval({ state: { data: queued, error: null } }), 2000)
    for (const imageStatus of ["READY", "CANCELLED", "REJECTED"]) {
      const terminal = ingestionJobQueryOptions({ ...target, imageStatus }, { retryAcknowledged: true })
      assert.equal(terminal.refetchInterval({ state: { data: queued, error: null } }), false)
      assert.equal(terminalIngestionRefreshKey({ ...target, imageStatus, retryAcknowledged: true, job: { ...failed, status: "SUCCEEDED" } }), null)
    }
  } finally { client.clear() }
})

test("a failed reconciliation keeps an ambiguous command check-only until a later successful read", async () => {
  const client = new QueryClient()
  let posts = 0
  try {
    await requestIngestionRetry(client, target, { fetchImpl: async (_, init) => {
      if (init.method === "POST") { posts++; throw new Error("lost") }
      return posts ? Response.json({ error: { code: "SERVICE_UNAVAILABLE", retryable: true } }, { status: 503 }) : Response.json(failed)
    } })
    assert.equal(posts, 1)
    assert.equal(state(client).phase, "uncertain")
    assert.equal(state(client).message, "unavailable")
    await requestIngestionRetry(client, target, { fetchImpl: async (_, init) => { assert.notEqual(init.method, "POST"); return Response.json(queued) } })
    assert.equal(cached(client).status, "QUEUED")
    assert.equal(state(client).phase, "idle")
  } finally { client.clear() }
})

test("retry locks are per job; two different files can recover independently", async () => {
  const client = new QueryClient()
  const second = { ...target, imageId: "00000000-0000-4000-8000-000000000225", uploadId: "00000000-0000-4000-8000-000000000224", jobId: "00000000-0000-4000-8000-000000000226" }
  let posts = 0
  try {
    const fetchImpl = async (url, init) => {
      const current = String(url).includes(second.jobId) ? second : target
      if (init.method === "POST") posts++
      return Response.json({ ...(init.method === "POST" ? queued : failed), id: current.jobId, imageId: current.imageId, uploadId: current.uploadId },
        { status: init.method === "POST" ? 202 : 200 })
    }
    await Promise.all([requestIngestionRetry(client, target, { fetchImpl }), requestIngestionRetry(client, second, { fetchImpl })])
    assert.equal(posts, 2)
    assert.equal(cached(client).status, "QUEUED")
    assert.equal(client.getQueryData(keys.ingestionJob(caseId, second.jobId)).status, "QUEUED")
  } finally { client.clear() }
})
