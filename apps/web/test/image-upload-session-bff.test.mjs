import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({ resolve(specifier, context, nextResolve) {
  return specifier === "server-only"
    ? { shortCircuit: true, url: "data:text/javascript," }
    : nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })

const { createImageUploadSessionForBff } = await import("../src/lib/server/image-upload-session-bff.ts")
const { ApiHttpClient } = await import("../../../packages/api-client/src/http-client.ts")
const { createImageUploadSession, ImageUploadSessionError } = await import("../src/features/cases/services/image-upload-session-api.ts")
const { prepareImageUploadAttempt } = await import("../src/features/cases/lib/image-upload-attempt.ts")

const caseId = "00000000-0000-4000-8000-000000000064"
const idempotencyKey = "00000000-0000-4000-8000-000000000099"
const sha256 = "a".repeat(64)
const input = {
  original_filename: "joelho-direito.dcm", media_type: "application/dicom",
  size_bytes: 8388608, sha256,
}
const upstream = {
  upload_id: "00000000-0000-4000-8000-000000000124",
  image_id: "00000000-0000-4000-8000-000000000125",
  case_id: caseId, kind: "DICOM", media_type: input.media_type,
  size_bytes: input.size_bytes, sha256, status: "PENDING_UPLOAD",
  upload: { method: "POST", url: "https://storage.example/upload",
    fields: { key: "signed-key", policy: "signed-policy", "x-amz-signature": "signed-signature" },
    expires_at: "2099-01-01T00:00:00Z" },
  tenant_id: "private-tenant", storage_key: "private-object-key",
}

test("creates a pending session through the clinical route and returns only upload contract fields", async () => {
  const calls = []
  const client = new ApiHttpClient({ baseUrl: "http://127.0.0.1:8000", fetch: async (url, init) => {
    calls.push({ url: String(url), init })
    return Response.json(upstream, { status: 201 })
  } })
  const result = await createImageUploadSessionForBff(caseId, input, idempotencyKey, (path, body, headers, signal) => client.request({
    method: "post", path: "/api/v1/cases/{case_id}/image-uploads", pathParams: path, body, headers, signal,
  }))
  assert.equal(result.status, 201)
  assert.equal(result.body.status, "PENDING_UPLOAD")
  assert.equal(result.body.upload.method, "POST")
  assert.deepEqual(result.body.upload.fields, upstream.upload.fields)
  assert.equal(JSON.stringify(result).includes("private-tenant"), false)
  assert.equal(JSON.stringify(result).includes("private-object-key"), false)
  assert.equal(calls[0].url, `http://127.0.0.1:8000/api/v1/cases/${caseId}/image-uploads`)
  assert.deepEqual(JSON.parse(calls[0].init.body), input)
  assert.equal(calls[0].init.headers.has("authorization"), false)
  assert.equal(calls[0].init.headers.get("idempotency-key"), idempotencyKey)
  assert.equal(calls[0].init.cache, "no-store")
})

test("rejects invalid metadata and identity fields before contacting the backend", async () => {
  let calls = 0
  const writer = async () => { calls++; return { data: upstream, status: 201 } }
  for (const [bad, field] of [
    [{ ...input, original_filename: "../secret.dcm" }, "original_filename"],
    [{ ...input, original_filename: "image.pdf", media_type: "image/jpeg" }, "media_type"],
    [{ ...input, size_bytes: 104857601 }, "size_bytes"],
    [{ ...input, sha256: "not-a-digest" }, "sha256"],
    [{ ...input, tenant_id: caseId }, null],
  ]) {
    const result = await createImageUploadSessionForBff(caseId, bad, idempotencyKey, writer)
    assert.equal(result.status, 400)
    if (field) assert.equal(result.body.error.fieldErrors.some((item) => item.field === field), true)
  }
  assert.equal((await createImageUploadSessionForBff("bad-id", input, idempotencyKey, writer)).status, 400)
  assert.equal(calls, 0)
})

test("maps 404, upload limit, validation and upstream failures to safe errors", async () => {
  const writer = (status, data) => () => Promise.resolve({ status, data })
  assert.equal((await createImageUploadSessionForBff(caseId, input, idempotencyKey, writer(404, { message: "private" }))).body.error.code, "CASE_NOT_FOUND")
  assert.equal((await createImageUploadSessionForBff(caseId, input, idempotencyKey, writer(409, { code: "IMAGE_UPLOAD_LIMIT_EXCEEDED", message: "private" }))).body.error.code, "IMAGE_UPLOAD_LIMIT_EXCEEDED")
  const invalid = await createImageUploadSessionForBff(caseId, input, idempotencyKey, writer(422, {
    code: "REQUEST_VALIDATION_ERROR", trace_id: "private-trace", details: { errors: [
      { field: "original_filename", type: "invalid_name" }, { field: "tenant_id", type: "private" },
    ] },
  }))
  assert.deepEqual(invalid.body.error.fieldErrors, [{ field: "original_filename", type: "invalid_name" }])
  assert.equal(JSON.stringify(invalid).includes("private-trace"), false)
  assert.equal((await createImageUploadSessionForBff(caseId, input, idempotencyKey, writer(422, { code: "IMAGE_UPLOAD_VALIDATION_ERROR", details: {} }))).status, 422)
  assert.equal((await createImageUploadSessionForBff(caseId, input, idempotencyKey, writer(500, null))).status, 503)
  assert.equal((await createImageUploadSessionForBff(caseId, input, idempotencyKey, async () => { throw new SyntaxError("private") })).status, 502)
})

test("rejects inconsistent or unusable signed sessions", async () => {
  for (const bad of [
    { case_id: "00000000-0000-4000-8000-000000000065" },
    { status: "READY" }, { sha256: "b".repeat(64) },
    { upload: { ...upstream.upload, method: "PUT" } },
    { upload: { ...upstream.upload, fields: {} } },
  ]) {
    const result = await createImageUploadSessionForBff(caseId, input, idempotencyKey, async () => ({ status: 201, data: { ...upstream, ...bad } }))
    assert.equal(result.status, 502)
  }
})

test("validates the header before upstream and preserves opaque valid keys", async () => {
  const calls = []
  const writer = async (path, body, headers, signal) => {
    calls.push({ path, body, headers, signal })
    return { status: 201, data: upstream }
  }
  for (const key of [null, "", " ", "x".repeat(129), "bad\r\nheader"]) {
    const result = await createImageUploadSessionForBff(caseId, input, key, writer)
    assert.equal(result.status, 400)
  }
  assert.equal(calls.length, 0)
  const signal = new AbortController().signal
  for (const key of ["a", "x".repeat(128), "opaque command key"]) {
    assert.equal((await createImageUploadSessionForBff(caseId, input, key, writer, signal)).status, 201)
    assert.deepEqual(calls.at(-1), { path: { case_id: caseId }, body: input,
      headers: { "Idempotency-Key": key }, signal })
  }
})

test("distinguishes a key conflict from the upload limit without exposing backend details", async () => {
  for (const code of ["IDEMPOTENCY_KEY_REUSED", "PROVIDER_CONFLICT"]) {
    const result = await createImageUploadSessionForBff(caseId, input, idempotencyKey, async () => ({
      status: 409, data: { code, message: "private-provider-message", trace_id: "private-trace" },
    }))
    assert.deepEqual(result, { status: 409, body: { error: {
      code: "IMAGE_UPLOAD_SESSION_CONFLICT", retryable: false,
    } } })
  }
  const malformed = await createImageUploadSessionForBff(caseId, input, idempotencyKey,
    async () => ({ status: 409, data: {} }))
  assert.equal(malformed.status, 502)
})

test("a lost browser response recovers the same clinical session with the same key", async () => {
  const sessions = new Map()
  const receivedKeys = []
  let created = 0
  const client = new ApiHttpClient({ baseUrl: "https://clinical.example", fetch: async (_url, init) => {
    const key = init.headers.get("idempotency-key")
    receivedKeys.push(key)
    const body = JSON.stringify(JSON.parse(init.body))
    const prior = sessions.get(key)
    if (prior && prior.body !== body) return Response.json({ code: "IDEMPOTENCY_KEY_REUSED" }, { status: 409 })
    if (!prior) { created++; sessions.set(key, { body, response: upstream }) }
    return Response.json(sessions.get(key).response, { status: 201 })
  } })
  let loseResponse = true
  const fetchImpl = async (_url, options) => {
    const result = await createImageUploadSessionForBff(caseId, JSON.parse(options.body),
      new Headers(options.headers).get("idempotency-key"), (path, body, headers, signal) => client.request({
        method: "post", path: "/api/v1/cases/{case_id}/image-uploads", pathParams: path, body, headers, signal,
      }))
    if (loseResponse) { loseResponse = false; throw new TypeError("response lost after commit") }
    return Response.json(result.body, { status: result.status })
  }
  const first = prepareImageUploadAttempt(null, caseId, input)
  await assert.rejects(createImageUploadSession(caseId, first.input, first.key, { fetchImpl }),
    (error) => error instanceof ImageUploadSessionError && error.code === "NETWORK_ERROR")
  const recovered = prepareImageUploadAttempt(first, caseId, input)
  const result = await createImageUploadSession(caseId, recovered.input, recovered.key, { fetchImpl })
  assert.equal(created, 1)
  assert.deepEqual(receivedKeys, [first.key, first.key])
  assert.equal(result.uploadId, upstream.upload_id)
  assert.equal(result.imageId, upstream.image_id)
  assert.equal(recovered, first)
  const simultaneous = await Promise.all([
    createImageUploadSession(caseId, recovered.input, recovered.key, { fetchImpl }),
    createImageUploadSession(caseId, recovered.input, recovered.key, { fetchImpl }),
  ])
  assert.equal(created, 1)
  assert.equal(simultaneous[0].uploadId, simultaneous[1].uploadId)
  await assert.rejects(createImageUploadSession(caseId, { ...input, original_filename: "another.dcm" },
    first.key, { fetchImpl }), (error) => error instanceof ImageUploadSessionError
      && error.code === "IMAGE_UPLOAD_SESSION_CONFLICT" && error.retryable === false)
  assert.equal(created, 1)
})
