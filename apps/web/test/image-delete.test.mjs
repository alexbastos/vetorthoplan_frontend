import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"
import { QueryClient } from "@tanstack/react-query"
import { clinicalUpload } from "./fixtures/clinical-upload.mjs"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript," }
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })
const { deleteImageForBff } = await import("../src/lib/server/image-delete-bff.ts")
const { deleteCaseImage, ImageDeleteError } = await import("../src/features/cases/services/image-delete-api.ts")
const { requestImageDeletion, isImageDeletionLocked } = await import("../src/features/cases/lib/image-deletion.ts")
const { requestIngestionRetry } = await import("../src/features/cases/lib/ingestion-job-retry.ts")
const { requestUploadCancellation } = await import("../src/features/cases/lib/image-upload-cancellation.ts")
const { casesQueryKeys: keys } = await import("../src/features/cases/hooks/cases-query-keys.ts")
const { ApiHttpClient } = await import("../../../packages/api-client/src/http-client.ts")
const { caseId, identity, image, rawImage, jobId } = clinicalUpload()
const ready = { ...image, status: "READY", jobId }
const read = data => async () => ({ status: 200, data })
const unexpected = () => assert.fail("must not mutate")

test("image DELETE verifies case ownership, forwards signal and sends no body through the clinical client", async () => {
  const calls = []
  const signal = new AbortController().signal
  const client = new ApiHttpClient({ baseUrl: "https://clinical.example", fetch: async (url, init) => {
    calls.push({ url: String(url), init })
    return init.method === "DELETE" ? new Response(null, { status: 204 }) : Response.json(rawImage)
  } })
  const result = await deleteImageForBff(caseId, identity.imageId,
    (pathParams, passed) => { assert.equal(passed, signal); return client.request({ method: "get", path: "/api/v1/images/{image_id}", pathParams, signal: passed }) },
    (pathParams, passed) => { assert.equal(passed, signal); return client.request({ method: "delete", path: "/api/v1/images/{image_id}", pathParams, signal: passed }) }, signal)
  assert.deepEqual(result, { status: 204 })
  assert.deepEqual(calls.map(item => item.init.method), ["GET", "DELETE"])
  assert.equal(calls[1].url, `https://clinical.example/api/v1/images/${identity.imageId}`)
  assert.equal(calls[1].init.body, undefined)
  assert.equal(calls[1].init.headers.has("content-type"), false)
  assert.equal(calls[1].init.cache, "no-store")
})

test("invalid IDs, wrong case/image and malformed payload cannot reach deletion", async () => {
  for (const [owner, id] of [["../case", identity.imageId], [caseId, "../image"]]) assert.equal((await deleteImageForBff(owner, id, unexpected, unexpected)).status, 400)
  for (const payload of [{ ...rawImage, case_id: clinicalUpload(1).identity.imageId }, { ...rawImage, id: clinicalUpload(1).identity.imageId }]) {
    assert.equal((await deleteImageForBff(caseId, identity.imageId, read(payload), unexpected)).status, 404)
  }
  assert.equal((await deleteImageForBff(caseId, identity.imageId, read({}), unexpected)).status, 502)
  const abort = new AbortController(); abort.abort()
  assert.equal((await deleteImageForBff(caseId, identity.imageId, read(rawImage), unexpected, abort.signal)).status, 503)
})

test("BFF preserves 404/409, sanitizes errors and does not retry destructive operations", async () => {
  for (const status of [404, 409, 403, 422, 401, 503]) {
    let calls = 0
    const result = await deleteImageForBff(caseId, identity.imageId, read(rawImage), async () => {
      calls++; return { status, data: { message: "private storage key", trace_id: "secret" } }
    })
    assert.equal(result.status, status === 422 ? 400 : status === 401 ? 503 : status)
    assert.equal(calls, 1)
    assert.equal(JSON.stringify(result).includes("private"), false)
    assert.equal(JSON.stringify(result).includes("secret"), false)
  }
  assert.equal((await deleteImageForBff(caseId, identity.imageId, read(rawImage), async () => { throw new Error("offline") })).status, 503)
})

test("browser DELETE is same-origin, bodyless, accepts empty 204 and keeps network uncertainty", async () => {
  const signal = new AbortController().signal
  await deleteCaseImage(caseId, identity.imageId, { signal, fetchImpl: async (url, init) => {
    assert.equal(url, `/api/cases/${caseId}/images/${identity.imageId}`)
    assert.equal(init.method, "DELETE"); assert.equal(init.credentials, "same-origin")
    assert.equal(init.cache, "no-store"); assert.equal(init.body, undefined); assert.equal(init.headers, undefined)
    assert.equal(init.signal, signal)
    return { status: 204, json: () => assert.fail("no JSON on 204") }
  } })
  for (const [status, code, uncertain] of [[404, "IMAGE_NOT_FOUND", false], [409, "IMAGE_DELETE_NOT_ALLOWED", false], [503, "SERVICE_UNAVAILABLE", true]]) {
    await assert.rejects(deleteCaseImage(caseId, identity.imageId, { fetchImpl: async () => Response.json({ error: { code } }, { status }) }), error => error instanceof ImageDeleteError && error.code === code && error.uncertain === uncertain)
  }
  await assert.rejects(deleteCaseImage(caseId, identity.imageId, { fetchImpl: async () => { throw Error("offline") } }), error => error.uncertain)
})

test("204 deduplicates concurrent clicks and clears only this image's list, preview, jobs and memory references", async () => {
  const client = new QueryClient()
  const other = clinicalUpload(1)
  let release
  const barrier = new Promise(resolve => { release = resolve })
  const methods = []
  client.setQueryData(keys.images(caseId), [ready, other.image])
  client.setQueryData(keys.preview(caseId, identity.imageId), { url: "private-preview" })
  client.setQueryData(keys.preview(caseId, other.identity.imageId), { url: "other-preview" })
  client.setQueryData(keys.ingestionJob(caseId, jobId), { id: jobId, imageId: identity.imageId })
  client.setQueryData(keys.imageIngestionJob(caseId, identity.imageId), { id: jobId })
  client.setQueryData(keys.ingestionRetry(caseId, jobId), { phase: "idle" })
  client.setQueryData(keys.activeIngestions(caseId), [{ ...identity, jobId }, { ...other.identity, jobId: other.jobId }])
  const fetchImpl = async (_, init) => {
    methods.push(init.method ?? "GET")
    if (init.method === "DELETE") { await barrier; return new Response(null, { status: 204 }) }
    return Response.json({ items: [ready, other.image] })
  }
  try {
    const first = requestImageDeletion(client, identity, { fetchImpl })
    assert.equal(first, requestImageDeletion(client, identity, { fetchImpl }))
    release(); assert.equal((await first).phase, "deleted")
    assert.deepEqual(methods, ["GET", "DELETE"])
    assert.deepEqual(client.getQueryData(keys.images(caseId)), [other.image])
    assert.deepEqual(client.getQueryData(keys.deletedImages(caseId)), [identity.imageId])
    for (const key of [keys.preview(caseId, identity.imageId), keys.ingestionJob(caseId, jobId), keys.imageIngestionJob(caseId, identity.imageId), keys.ingestionRetry(caseId, jobId)]) assert.equal(client.getQueryData(key), undefined)
    assert.equal(client.getQueryData(keys.preview(caseId, other.identity.imageId)).url, "other-preview")
    assert.equal(client.getQueryData(keys.activeIngestions(caseId))[0].imageId, other.identity.imageId)
    assert.equal((await requestImageDeletion(client, identity, { fetchImpl: unexpected })).phase, "deleted")
  } finally { release(); client.clear() }
})

test("a late preview response is aborted and cannot restore its signed URL after deletion", async () => {
  const client = new QueryClient()
  let started, release, aborted = false
  const begin = new Promise(resolve => { started = resolve })
  const barrier = new Promise(resolve => { release = resolve })
  const preview = client.fetchQuery({ queryKey: keys.preview(caseId, identity.imageId), queryFn: async ({ signal }) => {
    signal.addEventListener("abort", () => { aborted = true })
    started(); await barrier; return { url: "stale-private-preview" }
  } }).catch(() => undefined)
  await begin
  try {
    const result = await requestImageDeletion(client, identity, { fetchImpl: async (_, init) => init.method === "DELETE" ? new Response(null, { status: 204 }) : Response.json({ items: [ready] }) })
    assert.equal(result.phase, "deleted"); assert.equal(aborted, true)
    release(); await preview
    assert.equal(client.getQueryData(keys.preview(caseId, identity.imageId)), undefined)
  } finally { release(); client.clear() }
})

test("409 preserves image and preview; 404 requires verified absence before reconciling removal", async () => {
  for (const [status, remaining, phase, message] of [[409, [ready], "error", "blocked"], [404, [ready], "error", "stillPresent"], [404, [], "deleted", undefined]]) {
    const client = new QueryClient(); let reads = 0
    client.setQueryData(keys.images(caseId), [ready]); client.setQueryData(keys.preview(caseId, identity.imageId), "preview")
    try {
      const result = await requestImageDeletion(client, identity, { fetchImpl: async (_, init) => init.method === "DELETE"
        ? Response.json({ error: { code: status === 409 ? "IMAGE_DELETE_NOT_ALLOWED" : "IMAGE_NOT_FOUND" } }, { status })
        : Response.json({ items: reads++ === 0 ? [ready] : remaining }) })
      assert.equal(result.phase, phase); assert.equal(result.message, message)
      assert.equal(client.getQueryData(keys.images(caseId)).length, phase === "deleted" ? 0 : 1)
      assert.equal(client.getQueryData(keys.preview(caseId, identity.imageId)), phase === "deleted" ? undefined : "preview")
    } finally { client.clear() }
  }
})

test("lost DELETE response reconciles absence; if uncertain the next action only reads, then explicit retry can delete", async () => {
  for (const absent of [true, false]) {
    const client = new QueryClient(); let reads = 0, deletes = 0
    const fetchImpl = async (_, init) => {
      if (init.method === "DELETE") { deletes++; throw Error("response lost") }
      return Response.json({ items: reads++ > 0 && absent ? [] : [ready] })
    }
    try {
      const result = await requestImageDeletion(client, identity, { fetchImpl })
      assert.equal(result.phase, absent ? "deleted" : "uncertain")
      if (!absent) {
        assert.equal((await requestImageDeletion(client, identity, { fetchImpl })).message, "stillPresent")
        assert.equal(deletes, 1)
        await requestImageDeletion(client, identity, { fetchImpl }); assert.equal(deletes, 2)
      }
    } finally { client.clear() }
  }
})

test("active images, mismatched upload, auth failure and failed preflight never cause DELETE or optimistic removal", async () => {
  for (const response of [Response.json({ items: [{ ...ready, status: "PROCESSING" }] }),
    Response.json({ items: [{ ...ready, uploadId: clinicalUpload(1).identity.uploadId }] }), Response.json({ error: { code: "ACCESS_DENIED", retryable: false } }, { status: 403 }), Response.json({})]) {
    const client = new QueryClient(); client.setQueryData(keys.images(caseId), [ready])
    try {
      assert.equal((await requestImageDeletion(client, identity, { fetchImpl: async (_, init) => { assert.notEqual(init.method, "DELETE"); return response } })).phase, "error")
      assert.equal(client.getQueryData(keys.images(caseId))[0], ready)
      assert.equal(client.getQueryData(keys.deletedImages(caseId)), undefined)
    } finally { client.clear() }
  }
})

test("pending session expiry and QUEUED races are decided by backend 409, not by invented expiry in the frontend", async () => {
  for (const status of ["PENDING_UPLOAD", "QUARANTINED"]) {
    const client = new QueryClient(); let deletes = 0
    try {
      const result = await requestImageDeletion(client, identity, { fetchImpl: async (_, init) => {
        if (init.method === "DELETE") { deletes++; return Response.json({ error: { code: "IMAGE_DELETE_NOT_ALLOWED" } }, { status: 409 }) }
        return Response.json({ items: [{ ...ready, status }] })
      } })
      assert.equal(result.message, "blocked"); assert.equal(deletes, 1)
      assert.equal(client.getQueryData(keys.deletedImages(caseId)), undefined)
    } finally { client.clear() }
  }
})

test("deletion and retry/cancellation commands cannot start competing mutations for the same image", async () => {
  const client = new QueryClient()
  let release, started
  const barrier = new Promise(resolve => { release = resolve })
  const begin = new Promise(resolve => { started = resolve })
  client.setQueryData(keys.images(caseId), [ready])
  const deletion = requestImageDeletion(client, identity, { fetchImpl: async (_, init) => {
    if (init.method === "DELETE") { started(); await barrier; return new Response(null, { status: 204 }) }
    return Response.json({ items: [ready] })
  } })
  await begin
  try {
    assert.equal(isImageDeletionLocked(client, caseId, identity.imageId), true)
    await requestIngestionRetry(client, { ...identity, jobId }, { fetchImpl: unexpected })
    assert.equal((await requestUploadCancellation(client, identity, { fetchImpl: unexpected })).phase, "error")
    release(); await deletion
  } finally { release(); client.clear() }
  const other = new QueryClient()
  other.setQueryData(keys.images(caseId), [ready]); other.setQueryData(keys.ingestionRetry(caseId, jobId), { phase: "requesting" })
  try { assert.equal((await requestImageDeletion(other, identity, { fetchImpl: unexpected })).message, "blocked") } finally { other.clear() }
})
