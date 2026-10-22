import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({ resolve(specifier, context, nextResolve) {
  return specifier === "server-only"
    ? { shortCircuit: true, url: "data:text/javascript," }
    : nextResolve(specifier, context)
} })

const { completeImageUploadForBff } = await import("../src/lib/server/image-upload-complete-bff.ts")
const { ApiHttpClient } = await import("../../../packages/api-client/src/http-client.ts")

const caseId = "00000000-0000-4000-8000-000000000064"
const uploadId = "00000000-0000-4000-8000-000000000124"
const upstream = {
  upload_id: uploadId, image_id: "00000000-0000-4000-8000-000000000125",
  case_id: caseId, kind: "PNG", media_type: "image/png", size_bytes: 100,
  sha256: "a".repeat(64), status: "QUARANTINED",
  completed_at: "2026-10-18T12:00:00Z",
  job_id: "00000000-0000-4000-8000-000000000126", job_status: "QUEUED",
  storage_key: "private-key", tenant_id: "private-tenant",
}

test("completes through the clinical API with no body or identity fields and projects the job", async () => {
  const calls = []
  const client = new ApiHttpClient({ baseUrl: "http://127.0.0.1:8000", fetch: async (url, init) => {
    calls.push({ url: String(url), init })
    return Response.json(upstream, { status: 202 })
  } })
  const complete = (path, signal) => client.request({ method: "post",
    path: "/api/v1/image-uploads/{upload_id}/complete", pathParams: path, signal })
  const first = await completeImageUploadForBff(caseId, uploadId, complete)
  const repeated = await completeImageUploadForBff(caseId, uploadId, complete)
  assert.equal(first.status, 202)
  assert.equal(first.body.status, "QUARANTINED")
  assert.equal(first.body.jobId, upstream.job_id)
  assert.equal(repeated.body.jobId, first.body.jobId)
  assert.equal(calls.length, 2)
  assert.equal(calls[0].url, `http://127.0.0.1:8000/api/v1/image-uploads/${uploadId}/complete`)
  assert.equal(calls[0].init.body, undefined)
  assert.equal(calls[0].init.headers.has("authorization"), false)
  assert.equal(JSON.stringify(first).includes("private-"), false)
})

test("maps missing object as recoverable and definitive mismatches without leaking details", async () => {
  const complete = (reason) => async () => ({ status: 409, data: {
    code: "IMAGE_UPLOAD_OBJECT_INVALID", message: "private bucket name",
    details: { upload_id: uploadId, reason, storage_key: "private-key" }, trace_id: "private-trace",
  } })
  const pending = await completeImageUploadForBff(caseId, uploadId, complete("object_not_found"))
  assert.deepEqual(pending.body, { error: { code: "IMAGE_UPLOAD_OBJECT_INVALID", retryable: true, reason: "object_not_found" } })
  const mismatch = await completeImageUploadForBff(caseId, uploadId, complete("checksum_mismatch"))
  assert.deepEqual(mismatch.body, { error: { code: "IMAGE_UPLOAD_OBJECT_INVALID", retryable: false, reason: "checksum_mismatch" } })
  assert.equal(JSON.stringify(mismatch).includes("private"), false)
  assert.equal((await completeImageUploadForBff(caseId, uploadId, async () => ({ status: 409, data: { code: "IMAGE_UPLOAD_EXPIRED" } }))).body.error.code, "IMAGE_UPLOAD_EXPIRED")
})

test("rejects invalid IDs, tenant mismatches and malformed success", async () => {
  let calls = 0
  const complete = async () => { calls++; return { status: 202, data: upstream } }
  assert.equal((await completeImageUploadForBff("bad", uploadId, complete)).status, 400)
  assert.equal((await completeImageUploadForBff(caseId, "bad", complete)).status, 400)
  assert.equal(calls, 0)
  assert.equal((await completeImageUploadForBff("00000000-0000-4000-8000-000000000065", uploadId, complete)).status, 502)
  assert.equal((await completeImageUploadForBff(caseId, uploadId, async () => ({ status: 202, data: { ...upstream, status: "READY" } }))).status, 502)
  assert.equal((await completeImageUploadForBff(caseId, uploadId, async () => { throw new SyntaxError("private") })).status, 502)
})
