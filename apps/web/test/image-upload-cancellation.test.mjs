import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"
import { QueryClient } from "@tanstack/react-query"
import { clinicalUpload } from "./fixtures/clinical-upload.mjs"

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })
const { cancelImageUpload, ImageUploadCancelError } = await import("../src/features/cases/services/image-upload-cancel-api.ts")
const { requestUploadCancellation } = await import("../src/features/cases/lib/image-upload-cancellation.ts")
const { casesQueryKeys: keys } = await import("../src/features/cases/hooks/cases-query-keys.ts")
const { caseId, identity, image } = clinicalUpload()

test("cancel service uses same-origin DELETE with no payload, accepts empty 204 without JSON, and preserves uncertainty", async () => {
  const abort = new AbortController()
  await cancelImageUpload(identity, { signal: abort.signal, fetchImpl: async (url, init) => {
    assert.equal(url, `/api/cases/${caseId}/image-uploads/${identity.uploadId}`)
    assert.equal(init.method, "DELETE"); assert.equal(init.body, undefined); assert.equal(init.headers, undefined)
    assert.equal(init.credentials, "same-origin"); assert.equal(init.signal, abort.signal)
    return { status: 204, json: () => assert.fail("204 has no JSON") }
  } })
  for (const [status, code, uncertain] of [[404, "IMAGE_UPLOAD_NOT_FOUND", false], [409, "IMAGE_UPLOAD_CANCEL_NOT_ALLOWED", false], [503, "SERVICE_UNAVAILABLE", true]]) {
    await assert.rejects(cancelImageUpload(identity, { fetchImpl: async () => Response.json({ error: { code } }, { status }) }),
      error => error instanceof ImageUploadCancelError && error.code === code && error.uncertain === uncertain)
  }
  await assert.rejects(cancelImageUpload(identity, { fetchImpl: async () => { throw new Error("offline") } }), error => error.uncertain)
})

test("two cancellation clicks share one request; success never fabricates deletion of the image in cache", async () => {
  const client = new QueryClient()
  let release
  const barrier = new Promise(resolve => { release = resolve })
  const methods = []
  const fetchImpl = async (_, init) => {
    methods.push(init.method ?? "GET")
    if (init.method === "DELETE") { await barrier; return new Response(null, { status: 204 }) }
    return Response.json({ items: [image] })
  }
  try {
    const first = requestUploadCancellation(client, identity, { fetchImpl })
    const second = requestUploadCancellation(client, { ...identity }, { fetchImpl })
    assert.equal(first, second)
    release(); assert.equal((await first).phase, "cancelled")
    assert.deepEqual(methods, ["GET", "DELETE"])
    assert.equal(client.getQueryData(keys.images(caseId))[0].status, "PENDING_UPLOAD")
    assert.equal(client.getQueryData(keys.uploadCancellation(caseId, identity.uploadId)).phase, "cancelled")
  } finally { release(); client.clear() }
})

test("fresh CANCELLED, missing and confirmed images reconcile without DELETE; mismatched upload identity fails closed", async () => {
  for (const [images, phase] of [[[{ ...image, status: "CANCELLED" }], "cancelled"], [[], "unavailable"],
    ...["QUARANTINED", "PROCESSING", "READY", "FAILED", "REJECTED"].map(status => [[{ ...image, status }], "confirmed"])]) {
    const client = new QueryClient()
    try {
      const result = await requestUploadCancellation(client, identity, { fetchImpl: async (_, init) => {
        assert.notEqual(init.method, "DELETE"); return Response.json({ items: images })
      } })
      assert.equal(result.phase, phase)
    } finally { client.clear() }
  }
  const client = new QueryClient()
  try {
    const result = await requestUploadCancellation(client, identity, { fetchImpl: async (_, init) => {
      assert.notEqual(init.method, "DELETE"); return Response.json({ items: [{ ...image, uploadId: clinicalUpload(1).identity.uploadId }] })
    } })
    assert.equal(result.phase, "error"); assert.equal(result.message, "invalidResponse")
  } finally { client.clear() }
})

test("lost 204 and a 409 race with confirmation converge by reading persisted images, with no complete/storage/image-delete calls", async () => {
  for (const status of ["CANCELLED", "QUARANTINED"]) {
    const client = new QueryClient()
    let changed = false
    const methods = []
    try {
      const result = await requestUploadCancellation(client, identity, { fetchImpl: async (url, init) => {
        methods.push(init.method ?? "GET")
        assert.ok(url.endsWith("/images") || url.endsWith(`/image-uploads/${identity.uploadId}`))
        if (init.method === "DELETE") {
          changed = true
          if (status === "CANCELLED") throw new Error("response lost")
          return Response.json({ error: { code: "IMAGE_UPLOAD_CANCEL_NOT_ALLOWED" } }, { status: 409 })
        }
        return Response.json({ items: [{ ...image, status: changed ? status : "PENDING_UPLOAD" }] })
      } })
      assert.deepEqual(methods, ["GET", "DELETE", "GET"])
      assert.equal(result.phase, status === "CANCELLED" ? "cancelled" : "confirmed")
      assert.equal(client.getQueryData(keys.images(caseId))[0].status, status)
    } finally { client.clear() }
  }
})

test("an unknown cancellation remains check-only until a read proves pending, and another DELETE requires an explicit action", async () => {
  const client = new QueryClient()
  let deletes = 0, failRead = false
  const methods = []
  const fetchImpl = async (_, init) => {
    methods.push(init.method ?? "GET")
    if (init.method === "DELETE") {
      if (++deletes === 1) { failRead = true; throw new Error("ambiguous") }
      return new Response(null, { status: 204 })
    }
    if (failRead) return Response.json({ error: { code: "SERVICE_UNAVAILABLE", retryable: true } }, { status: 503 })
    return Response.json({ items: [image] })
  }
  try {
    assert.equal((await requestUploadCancellation(client, identity, { fetchImpl })).phase, "uncertain")
    assert.equal(deletes, 1)
    failRead = false
    assert.deepEqual(await requestUploadCancellation(client, identity, { fetchImpl }), { phase: "error", message: "pending" })
    assert.equal(deletes, 1)
    assert.equal((await requestUploadCancellation(client, identity, { fetchImpl })).phase, "cancelled")
    assert.equal(deletes, 2)
    assert.deepEqual(methods, ["GET", "DELETE", "GET", "GET", "GET", "DELETE"])
  } finally { client.clear() }
})
