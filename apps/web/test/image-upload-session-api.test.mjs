import assert from "node:assert/strict"
import test from "node:test"
import { registerHooks } from "node:module"

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })

const { validateImageUploadFile } = await import("../src/features/cases/lib/image-upload-policy.ts")
const { isUploadSignatureExpired, millisecondsUntilUploadExpiry } = await import("../src/features/cases/lib/upload-signature-expiry.ts")
const { createImageUploadSession, ImageUploadSessionError } = await import("../src/features/cases/services/image-upload-session-api.ts")
const { prepareImageUploadAttempt } = await import("../src/features/cases/lib/image-upload-attempt.ts")

const caseId = "00000000-0000-4000-8000-000000000064"
const idempotencyKey = "00000000-0000-4000-8000-000000000099"
const sha256 = "a".repeat(64)
const input = { original_filename: "image.png", media_type: "image/png", size_bytes: 100, sha256 }
const session = {
  uploadId: "00000000-0000-4000-8000-000000000124",
  imageId: "00000000-0000-4000-8000-000000000125",
  caseId, kind: "PNG", mediaType: "image/png", sizeBytes: 100, sha256, status: "PENDING_UPLOAD",
  upload: { method: "POST", url: "https://storage.example/upload", fields: { key: "opaque", policy: "opaque" }, expiresAt: "2099-01-01T00:00:00Z" },
}

test("selects only contract formats and sizes, including DICOM without browser MIME", () => {
  assert.deepEqual(validateImageUploadFile({ name: "scan.dicom", size: 1, type: "" }), { ok: true, mediaType: "application/dicom" })
  assert.deepEqual(validateImageUploadFile({ name: "scan.dcm", size: 104857600, type: "image/dicom" }), { ok: true, mediaType: "image/dicom" })
  assert.equal(validateImageUploadFile({ name: "scan.pdf", size: 100, type: "application/pdf" }).ok, false)
  assert.equal(validateImageUploadFile({ name: "scan.png", size: 104857601, type: "image/png" }).error, "too-large")
  assert.equal(validateImageUploadFile({ name: "scan.jpg", size: 0, type: "image/jpeg" }).error, "empty")
  assert.equal(validateImageUploadFile({ name: "scan.png", size: 100, type: "image/jpeg" }).error, "type-mismatch")
  assert.equal(validateImageUploadFile({ name: "../scan.png", size: 100, type: "image/png" }).error, "invalid-name")
})

test("browser creates a session through same-origin BFF without sending file bytes", async () => {
  const calls = []
  const result = await createImageUploadSession(caseId, input, idempotencyKey, { fetchImpl: async (url, options) => {
    calls.push({ url, options })
    return Response.json(session, { status: 201 })
  } })
  assert.deepEqual(result, session)
  assert.equal(calls[0].url, `/api/cases/${caseId}/image-uploads`)
  assert.equal(calls[0].options.credentials, "same-origin")
  assert.equal(calls[0].options.cache, "no-store")
  assert.equal(calls[0].options.headers["Idempotency-Key"], idempotencyKey)
  assert.deepEqual(JSON.parse(calls[0].options.body), input)
})

test("browser preserves safe error codes and rejects an inconsistent session", async () => {
  await assert.rejects(createImageUploadSession(caseId, input, idempotencyKey, { fetchImpl: async () => Response.json({ error: {
    code: "IMAGE_UPLOAD_LIMIT_EXCEEDED", retryable: false,
  } }, { status: 409 }) }), (error) => error instanceof ImageUploadSessionError && error.code === "IMAGE_UPLOAD_LIMIT_EXCEEDED")
  await assert.rejects(createImageUploadSession(caseId, input, idempotencyKey, { fetchImpl: async () => Response.json({ ...session, sizeBytes: 101 }, { status: 201 }) }),
    (error) => error instanceof ImageUploadSessionError && error.code === "INVALID_RESPONSE")
  await assert.rejects(createImageUploadSession(caseId, input, idempotencyKey, { fetchImpl: async () => { throw new Error("offline") } }),
    (error) => error instanceof ImageUploadSessionError && error.code === "NETWORK_ERROR")
})

test("marks signatures expired before the deadline so transport never starts at the edge", () => {
  const deadline = "2026-10-18T13:05:00Z"
  const now = Date.parse(deadline) - 6_000
  assert.equal(isUploadSignatureExpired(deadline, now), false)
  assert.equal(millisecondsUntilUploadExpiry(deadline, now), 1_000)
  assert.equal(isUploadSignatureExpired(deadline, now + 1_000), true)
})

test("upload attempts preserve the command through retries and bind every metadata field and case", () => {
  let issued = 0
  const key = () => `command-${++issued}`
  const first = prepareImageUploadAttempt(null, caseId, input, key)
  const reordered = { sha256, size_bytes: 100, media_type: "image/png", original_filename: "image.png" }
  assert.equal(prepareImageUploadAttempt(first, caseId, reordered, key), first)
  for (const changed of [
    { ...input, original_filename: "another.png" }, { ...input, media_type: "image/jpeg" },
    { ...input, size_bytes: 101 }, { ...input, sha256: "b".repeat(64) },
  ]) assert.notEqual(prepareImageUploadAttempt(first, caseId, changed, key).key, first.key)
  assert.notEqual(prepareImageUploadAttempt(first, "00000000-0000-4000-8000-000000000065", input, key).key, first.key)
  assert.notEqual(prepareImageUploadAttempt(null, caseId, input, key).key, first.key)
  const mutable = { ...input }
  const isolated = prepareImageUploadAttempt(null, caseId, mutable, key)
  mutable.original_filename = "changed.png"
  assert.equal(isolated.input.original_filename, "image.png")
})

test("missing and invalid keys never send a request", async () => {
  let calls = 0
  for (const key of [undefined, null, "", " ", "x".repeat(129), "bad\r\nheader"]) {
    await assert.rejects(createImageUploadSession(caseId, input, key, { fetchImpl: async () => {
      calls++
      return Response.json(session, { status: 201 })
    } }), (error) => error instanceof ImageUploadSessionError && error.code === "VALIDATION_ERROR")
  }
  assert.equal(calls, 0)
})

test("a recovered expired signature is never accepted for transport", async () => {
  await assert.rejects(createImageUploadSession(caseId, input, idempotencyKey, { fetchImpl: async () =>
    Response.json({ ...session, upload: { ...session.upload, expiresAt: "2000-01-01T00:00:00Z" } }, { status: 201 }),
  }), (error) => error instanceof ImageUploadSessionError && error.code === "EXPIRED" && !error.retryable)
})

test("cancellation preserves AbortError without retrying the creation command", async () => {
  const controller = new AbortController()
  let calls = 0
  await assert.rejects(createImageUploadSession(caseId, input, idempotencyKey, {
    signal: controller.signal,
    fetchImpl: async (_url, options) => {
      calls++
      assert.equal(options.signal, controller.signal)
      controller.abort()
      throw new DOMException("Aborted", "AbortError")
    },
  }), (error) => error.name === "AbortError")
  assert.equal(calls, 1)
})
