import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"
import { QueryClient } from "@tanstack/react-query"
import { clinicalUpload } from "./fixtures/clinical-upload.mjs"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript," }
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })
const { cancelImageUploadForBff } = await import("../src/lib/server/image-upload-cancel-bff.ts")
const { ApiHttpClient } = await import("../../../packages/api-client/src/http-client.ts")
const { createImageUploadSessionForBff } = await import("../src/lib/server/image-upload-session-bff.ts")
const { createImageUploadSession } = await import("../src/features/cases/services/image-upload-session-api.ts")
const { createCaseFileUploadQueue } = await import("../src/features/cases/lib/case-file-upload-queue.ts")
const { requestUploadCancellation } = await import("../src/features/cases/lib/image-upload-cancellation.ts")
const { listCaseImagesForBff } = await import("../src/lib/server/case-images-bff.ts")
const { caseId, identity, rawImage } = clinicalUpload()

test("cancel validates tenant-scoped case membership before a bodyless DELETE and propagates its abort signal", async () => {
  const calls = []
  const signal = new AbortController().signal
  const client = new ApiHttpClient({ baseUrl: "https://clinical.example", fetch: async (url, init) => {
    calls.push({ url: String(url), init })
    return init.method === "DELETE" ? new Response(null, { status: 204 }) : Response.json({ items: [rawImage] })
  } })
  const result = await cancelImageUploadForBff(caseId, identity.uploadId,
    (pathParams, passed) => { assert.equal(passed, signal); return client.request({ method: "get", path: "/api/v1/cases/{case_id}/images", pathParams, signal: passed }) },
    (pathParams, passed) => { assert.equal(passed, signal); return client.request({ method: "delete", path: "/api/v1/image-uploads/{upload_id}", pathParams, signal: passed }) }, signal)
  assert.deepEqual(result, { status: 204 })
  assert.deepEqual(calls.map(call => call.init.method), ["GET", "DELETE"])
  assert.equal(calls[1].url, `https://clinical.example/api/v1/image-uploads/${identity.uploadId}`)
  assert.equal(calls[1].init.body, undefined)
  assert.equal(calls[1].init.headers.has("authorization"), false)
  assert.equal(calls[1].init.headers.has("content-type"), false)
  assert.equal(calls[1].init.cache, "no-store")
})

test("invalid IDs, absent sessions and wrong-case images cannot reach cancellation; already cancelled reads converge to 204", async () => {
  let deletes = 0, reads = 0
  const cancel = async () => { deletes++; return { status: 204, data: null } }
  for (const [caseKey, uploadKey] of [["../case", identity.uploadId], [caseId, "../upload"]]) {
    assert.equal((await cancelImageUploadForBff(caseKey, uploadKey, async () => { reads++; return { status: 200, data: { items: [rawImage] } } }, cancel)).status, 400)
  }
  assert.equal(reads, 0)
  assert.equal((await cancelImageUploadForBff(caseId, identity.uploadId, async () => ({ status: 200, data: { items: [] } }), cancel)).status, 404)
  assert.equal((await cancelImageUploadForBff(caseId, identity.uploadId, async () => ({ status: 200, data: { items: [{ ...rawImage, case_id: clinicalUpload(1).identity.imageId }] } }), cancel)).status, 502)
  assert.equal((await cancelImageUploadForBff(caseId, identity.uploadId, async () => ({ status: 200, data: { items: [{ ...rawImage, status: "CANCELLED" }] } }), cancel)).status, 204)
  assert.equal(deletes, 0)
})

test("confirmed/processing/terminal images reject cancellation and a completion race yields a safe 409", async () => {
  let deletes = 0
  for (const status of ["QUARANTINED", "PROCESSING", "READY", "REJECTED", "FAILED"]) {
    const result = await cancelImageUploadForBff(caseId, identity.uploadId,
      async () => ({ status: 200, data: { items: [{ ...rawImage, status }] } }),
      async () => { deletes++; return { status: 204, data: null } })
    assert.equal(result.status, 409)
    assert.equal(result.body.error.code, "IMAGE_UPLOAD_CANCEL_NOT_ALLOWED")
  }
  assert.equal(deletes, 0)
  const result = await cancelImageUploadForBff(caseId, identity.uploadId,
    async () => ({ status: 200, data: { items: [rawImage] } }),
    async () => ({ status: 409, data: { message: "private storage details", trace_id: "secret" } }))
  assert.equal(result.status, 409)
  assert.equal(JSON.stringify(result).includes("private"), false)
})

test("cancellation maps absent/invalid/unavailable responses without leaking provider details or inventing 204", async () => {
  for (const [upstream, expected, code] of [[404, 404, "IMAGE_UPLOAD_NOT_FOUND"], [403, 403, "ACCESS_DENIED"],
    [422, 400, "VALIDATION_ERROR"], [503, 503, "SERVICE_UNAVAILABLE"], [401, 503, "SERVICE_UNAVAILABLE"], [200, 502, "INVALID_RESPONSE"]]) {
    const result = await cancelImageUploadForBff(caseId, identity.uploadId, async () => ({ status: 200, data: { items: [rawImage] } }),
      async () => ({ status: upstream, data: { message: "private" } }))
    assert.equal(result.status, expected)
    assert.equal(result.body.error.code, code)
    assert.equal(JSON.stringify(result).includes("private"), false)
  }
  const abort = new AbortController(); abort.abort()
  await cancelImageUploadForBff(caseId, identity.uploadId, async () => ({ status: 200, data: { items: [rawImage] } }), async () => { assert.fail("must not DELETE after abort") }, abort.signal)
})

test("cancelling a lost creation response crosses the queue, browser services, BFF and clinical HTTP with one session and one cancellation", async () => {
  const fixture = clinicalUpload()
  const client = new QueryClient()
  let started, loseResponse
  const start = new Promise(resolve => { started = resolve }), loss = new Promise(resolve => { loseResponse = resolve })
  const keys = [], bodies = []
  let records = 0, deletes = 0, sessionState = "PENDING_UPLOAD", frontendCreates = 0, binaries = 0
  const wireSession = { upload_id: identity.uploadId, image_id: identity.imageId, case_id: caseId, kind: "PNG", media_type: "image/png",
    size_bytes: 3, sha256: fixture.session.sha256, status: "PENDING_UPLOAD", upload: { method: "POST", url: fixture.session.upload.url,
      fields: fixture.session.upload.fields, expires_at: fixture.session.upload.expiresAt } }
  const clinical = new ApiHttpClient({ baseUrl: "https://clinical.example", fetch: async (url, init) => {
    if (init.method === "POST") {
      assert.ok(String(url).endsWith("/image-uploads"))
      const key = init.headers.get("idempotency-key")
      if (!keys.includes(key)) records++
      keys.push(key); bodies.push(init.body)
      return Response.json(wireSession, { status: 201 })
    }
    if (init.method === "DELETE") {
      deletes++; sessionState = "CANCELLED"
      return new Response(null, { status: 204 })
    }
    return Response.json({ items: [{ ...rawImage, status: sessionState }] })
  } })
  const read = pathParams => clinical.request({ method: "get", path: "/api/v1/cases/{case_id}/images", pathParams })
  const browserFetch = async (url, init) => {
    if (init.method === "POST") {
      const result = await createImageUploadSessionForBff(caseId, JSON.parse(init.body), init.headers["Idempotency-Key"],
        (pathParams, body, headers) => clinical.request({ method: "post", path: "/api/v1/cases/{case_id}/image-uploads", pathParams, body, headers }))
      assert.equal(result.status, 201)
      if (++frontendCreates === 1) { started(); await loss; throw new Error("response lost after creation committed") }
      return Response.json(result.body, { status: result.status })
    }
    if (init.method === "DELETE") {
      assert.equal(url, `/api/cases/${caseId}/image-uploads/${identity.uploadId}`)
      const result = await cancelImageUploadForBff(caseId, identity.uploadId, read,
        pathParams => clinical.request({ method: "delete", path: "/api/v1/image-uploads/{upload_id}", pathParams }))
      return result.status === 204 ? new Response(null, { status: 204 }) : Response.json(result.body, { status: result.status })
    }
    const result = await listCaseImagesForBff(caseId, read)
    return Response.json(result.body, { status: result.status })
  }
  const queue = createCaseFileUploadQueue(caseId, client, { hash: async () => fixture.session.sha256,
    createSession: (caseId, input, key, options) => createImageUploadSession(caseId, input, key, { ...options, fetchImpl: browserFetch }),
    transport: async () => { binaries++ }, cancel: identity => requestUploadCancellation(client, identity, { fetchImpl: browserFetch }) })
  try {
    const [id] = queue.addFiles([new File(["png"], "synthetic-0.png", { type: "image/png" })])
    await start
    const cancel = queue.removeFile(id)
    loseResponse(); await cancel
    assert.equal(records, 1); assert.equal(deletes, 1); assert.equal(binaries, 0)
    assert.equal(keys.length, 2); assert.equal(keys[0], keys[1]); assert.equal(bodies[0], bodies[1])
    assert.equal(sessionState, "CANCELLED")
    assert.deepEqual(queue.getSnapshot(), [])
  } finally { loseResponse(); queue.dispose(); client.clear() }
})
