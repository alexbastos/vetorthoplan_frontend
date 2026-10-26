import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier)) {
    return nextResolve(`${specifier}.ts`, context)
  }
  return nextResolve(specifier, context)
} })

const { transportImageUpload, ImageUploadTransportError } = await import("../src/features/cases/services/image-upload-transport.ts")
const { completeImageUpload, completeImageUploadWithVisibilityRetry, ImageUploadCompleteError } = await import("../src/features/cases/services/image-upload-complete-api.ts")
const { imageUploadPresentation } = await import("../src/features/cases/lib/image-upload-presentation.ts")
const { formatUploadFileSize, uploadProgressValue } = await import("../src/components/ui/file-upload-format.ts")

const identity = {
  uploadId: "00000000-0000-4000-8000-000000000124",
  imageId: "00000000-0000-4000-8000-000000000125",
  caseId: "00000000-0000-4000-8000-000000000064",
  kind: "PNG", mediaType: "image/png", sizeBytes: 3, sha256: "a".repeat(64),
}
const session = { ...identity, status: "PENDING_UPLOAD", upload: {
  method: "POST", url: "https://storage.example/opaque-signed-url",
  fields: { key: "signed-key", policy: "signed-policy", "x-amz-signature": "signed-signature" },
  expiresAt: "2099-01-01T00:00:00Z",
} }
const completed = { ...identity, status: "QUARANTINED", completedAt: "2026-10-18T12:00:00Z",
  jobId: "00000000-0000-4000-8000-000000000126", jobStatus: "QUEUED" }

test("storage POST sends every opaque field and the file last without content type or cookies", async () => {
  const file = new File(["abc"], "image.png", { type: "image/png" })
  let called = 0
  await transportImageUpload(session, file, { fetchImpl: async (url, init) => {
    called++
    assert.equal(url, session.upload.url)
    assert.equal(init.method, "POST")
    assert.equal(init.headers, undefined)
    assert.equal(init.credentials, "omit")
    assert.equal(init.referrerPolicy, "no-referrer")
    assert.deepEqual([...init.body.keys()], [...Object.keys(session.upload.fields), "file"])
    assert.equal(init.body.get("file").name, file.name)
    return new Response(null, { status: 204 })
  } })
  assert.equal(called, 1)
})

test("storage failure cannot be mistaken for successful transport", async () => {
  const file = new File(["abc"], "image.png", { type: "image/png" })
  await assert.rejects(transportImageUpload(session, file, { fetchImpl: async () => new Response(null, { status: 403 }) }),
    (error) => error instanceof ImageUploadTransportError && error.code === "STORAGE_REJECTED")
  await assert.rejects(transportImageUpload(session, file, { fetchImpl: async () => { throw new TypeError("network") } }),
    (error) => error instanceof ImageUploadTransportError && error.code === "NETWORK_AMBIGUOUS")
  let called = false
  await assert.rejects(transportImageUpload({ ...session, upload: { ...session.upload, expiresAt: "2000-01-01T00:00:00Z" } }, file,
    { fetchImpl: async () => { called = true } }),
  (error) => error instanceof ImageUploadTransportError && error.code === "EXPIRED")
  assert.equal(called, false)
})

test("browser upload reports real multipart progress and keeps one signed POST per file", async () => {
  const file = new File(["abc"], "image.png", { type: "image/png" })
  const reported = []
  const requests = []
  class UploadRequest extends EventTarget {
    upload = new EventTarget()
    status = 204
    withCredentials = true
    open(method, url) { this.method = method; this.url = url }
    send(body) {
      this.body = body
      requests.push(this)
      for (const loaded of [50, 20, 100]) {
        const progress = new Event("progress")
        Object.assign(progress, { lengthComputable: true, loaded, total: 100 })
        this.upload.dispatchEvent(progress)
      }
      this.dispatchEvent(new Event("load"))
    }
    abort() { this.dispatchEvent(new Event("abort")) }
  }
  await transportImageUpload(session, file, {
    onProgress: (percent) => reported.push(percent), xhrFactory: () => new UploadRequest(),
  })
  assert.equal(requests.length, 1)
  assert.equal(requests[0].method, "POST")
  assert.equal(requests[0].url, session.upload.url)
  assert.equal(requests[0].withCredentials, false)
  assert.deepEqual([...requests[0].body.keys()], [...Object.keys(session.upload.fields), "file"])
  assert.deepEqual(reported, [50, 99, 100])
})

test("a storage rejection after all bytes were sent never reports accepted transport", async () => {
  const reported = []
  class RejectedRequest extends EventTarget {
    upload = new EventTarget()
    status = 403
    open() {}
    send() {
      const progress = Object.assign(new Event("progress"), { lengthComputable: true, loaded: 100, total: 100 })
      this.upload.dispatchEvent(progress)
      this.dispatchEvent(new Event("load"))
    }
  }
  await assert.rejects(transportImageUpload(session, new File(["abc"], "image.png"), {
    onProgress: (percent) => reported.push(percent), xhrFactory: () => new RejectedRequest(),
  }), (error) => error.code === "STORAGE_REJECTED")
  assert.deepEqual(reported, [99])
})

test("cancelling the browser POST aborts the request without completing it", async () => {
  const controller = new AbortController()
  let aborted = false
  class CancellableRequest extends EventTarget {
    upload = new EventTarget()
    open() {}
    send() { controller.abort() }
    abort() { aborted = true; this.dispatchEvent(new Event("abort")) }
  }
  await assert.rejects(transportImageUpload(session, new File(["abc"], "image.png"), {
    signal: controller.signal, onProgress: () => assert.fail("cancelled upload must not complete"),
    xhrFactory: () => new CancellableRequest(),
  }), (error) => error.name === "AbortError")
  assert.equal(aborted, true)
})

test("the file row only completes when the clinical image is READY", () => {
  const item = { phase: "transporting", progress: 100, error: null, completed: null, transportFailed: false }
  assert.equal(imageUploadPresentation(item).state, "uploading")
  assert.equal(imageUploadPresentation({ ...item, phase: "confirming" }).state, "processing")
  const confirmed = { ...item, phase: "quarantined", completed }
  for (const status of ["QUEUED", "PROCESSING", "SUCCEEDED"]) {
    assert.equal(imageUploadPresentation(confirmed, "QUARANTINED", status).state, "processing")
  }
  assert.equal(imageUploadPresentation(confirmed, "READY", "SUCCEEDED").state, "success")
  assert.equal(imageUploadPresentation(confirmed, "READY", "SUCCEEDED").canRemove, false)
  assert.equal(imageUploadPresentation(confirmed, "REJECTED", "REJECTED").state, "error")
  const failed = imageUploadPresentation(confirmed, "PROCESSING", "FAILED")
  assert.equal(failed.state, "error")
  assert.equal(failed.canRetry, false) // Refreshing must not claim to restart the worker.
})

test("normal loading keeps one simple label and reserves 100 percent for READY", () => {
  const item = { phase: "queued", progress: 100, error: null, completed: null, transportFailed: false }
  for (const [phase, expectedProgress] of [["queued", 0], ["hashing", 3], ["creating", 8], ["transporting", 80],
    ["confirming", 85], ["quarantined", 98], ["stored", 98]]) {
    const row = imageUploadPresentation({ ...item, phase }, "QUARANTINED", "SUCCEEDED")
    assert.equal(row.label, "loading")
    assert.equal(row.detail, undefined)
    assert.notEqual(row.state, "success")
    assert.equal(row.progress, expectedProgress)
  }
  const transferring = imageUploadPresentation({ ...item, phase: "transporting", progress: 50 })
  assert.equal(transferring.progress, 45)
  assert.equal(transferring.transferProgress, 50, "byte counters must not use the overall stage percentage")
  const ready = imageUploadPresentation({ ...item, phase: "quarantined", completed }, "READY", "SUCCEEDED")
  assert.equal(ready.progress, 100)
  assert.equal(ready.label, "ready")
})

test("upload stages advance continuously to READY and never invent timed worker progress", () => {
  const item = { phase: "queued", progress: null, error: null, completed: null, transportFailed: false }
  const stages = [
    ["queued"], ["hashing"], ["creating"],
    ...[0, 10, 25, 50, 75, 100].map(bytes => ["transporting", undefined, undefined, bytes]),
    ["confirming"], ["quarantined", "QUARANTINED", "QUEUED"],
    ["quarantined", "PROCESSING", "PROCESSING"], ["quarantined", "PROCESSING", "SUCCEEDED"],
    ["quarantined", "READY", "SUCCEEDED"],
  ]
  let previous = 0
  for (const [phase, imageStatus, jobStatus, progress = null] of stages) {
    const row = imageUploadPresentation({ ...item, phase, progress }, imageStatus, jobStatus)
    assert.equal(Number.isFinite(row.progress), true)
    assert.ok(row.progress >= previous)
    assert.ok(row.progress <= 100)
    assert.equal(row.progress === 100, imageStatus === "READY")
    previous = row.progress
  }
  const processing = { ...item, phase: "quarantined", progress: 100 }
  const waiting = imageUploadPresentation(processing, "PROCESSING", "PROCESSING")
  assert.equal(waiting.progress, 95)
  assert.deepEqual(imageUploadPresentation(processing, "PROCESSING", "PROCESSING"), waiting,
    "waiting for the same stage keeps its position rather than animating a loop or guessing elapsed progress")
  for (const [progress, expected] of [[null, 0], [Number.NaN, 0], [-20, 0], [150, 100]]) {
    const row = imageUploadPresentation({ ...item, phase: "transporting", progress })
    assert.equal(row.transferProgress, expected)
    assert.equal(row.progress, 10 + expected * 0.7)
  }
})

test("persisted FAILED and CANCELLED stop the file row even with an outdated active job", () => {
  const item = { phase: "quarantined", progress: 100, error: null, completed, transportFailed: false }
  for (const [status, label] of [["FAILED", "jobStatus.FAILED"], ["CANCELLED", "imageCancelled"]]) {
    const row = imageUploadPresentation(item, status, "PROCESSING")
    assert.equal(row.state, "error")
    assert.equal(row.label, label)
    assert.equal(row.canRetry, false)
    assert.equal(row.canRemove, false)
  }
  assert.equal(imageUploadPresentation(item, "READY", "FAILED").state, "success")
})

test("transport failure is preserved when confirmation cannot find the object", () => {
  const failed = imageUploadPresentation({ phase: "error", progress: 0, error: "OBJECT_NOT_FOUND",
    completed: null, transportFailed: true })
  assert.equal(failed.detail, "transportNotReceived")
  assert.equal(failed.canRetry, true)
  assert.equal(failed.state, "error")
  const unknown = imageUploadPresentation({ phase: "error", progress: null, error: "UNPUBLISHED_CODE",
    completed: null, transportFailed: false })
  assert.equal(unknown.detail, "sessionErrors.OTHER")
})

test("session conflict has a distinct message and cannot be blindly retried", () => {
  const failed = imageUploadPresentation({ phase: "error", progress: null,
    error: "IMAGE_UPLOAD_SESSION_CONFLICT", completed: null, transportFailed: false })
  assert.equal(failed.state, "error")
  assert.equal(failed.detail, "sessionErrors.IMAGE_UPLOAD_SESSION_CONFLICT")
  assert.equal(failed.canRetry, false)
  assert.equal(failed.canRemove, true)
  const limit = imageUploadPresentation({ phase: "error", progress: null,
    error: "IMAGE_UPLOAD_LIMIT_EXCEEDED", completed: null, transportFailed: false })
  assert.equal(limit.detail, "sessionErrors.IMAGE_UPLOAD_LIMIT_EXCEEDED")
})

test("file progress counters stay bounded and use localized file sizes", () => {
  assert.equal(formatUploadFileSize(0, "en"), "0 KB")
  assert.equal(formatUploadFileSize(0.03, "en"), "0 KB")
  assert.equal(formatUploadFileSize(1_536, "pt-BR"), "1,5 KB")
  assert.equal(uploadProgressValue(150), 100)
  assert.equal(uploadProgressValue(-1), 0)
  assert.equal(uploadProgressValue(Number.NaN), 0)
})

test("confirmation uses BFF without a body and accepts only matching quarantined response", async () => {
  const result = await completeImageUpload(identity, { fetchImpl: async (url, init) => {
    assert.equal(url, `/api/cases/${identity.caseId}/image-uploads/${identity.uploadId}/complete`)
    assert.equal(init.method, "POST")
    assert.equal(init.body, undefined)
    assert.equal(init.credentials, "same-origin")
    return Response.json(completed, { status: 202 })
  } })
  assert.equal(result.jobId, completed.jobId)
  await assert.rejects(completeImageUpload(identity, { fetchImpl: async () => Response.json({ ...completed, status: "READY" }, { status: 202 }) }),
    (error) => error instanceof ImageUploadCompleteError && error.code === "INVALID_RESPONSE")
})

test("visibility retry is limited to object_not_found and stops after success or three attempts", async () => {
  let attempts = 0
  const waits = []
  const result = await completeImageUploadWithVisibilityRetry(identity, {
    completeImpl: async () => {
      attempts++
      if (attempts < 3) throw new ImageUploadCompleteError("IMAGE_UPLOAD_OBJECT_INVALID", true, "object_not_found")
      return completed
    },
    wait: async (milliseconds) => { waits.push(milliseconds) },
  })
  assert.equal(result.jobId, completed.jobId)
  assert.equal(attempts, 3)
  assert.deepEqual(waits, [1000, 2000])
  attempts = 0
  await assert.rejects(completeImageUploadWithVisibilityRetry(identity, {
    completeImpl: async () => { attempts++; throw new ImageUploadCompleteError("IMAGE_UPLOAD_OBJECT_INVALID", false, "checksum_mismatch") },
    wait: async () => { throw new Error("should not wait") },
  }), (error) => error.reason === "checksum_mismatch")
  assert.equal(attempts, 1)
})
