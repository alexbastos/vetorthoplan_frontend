import assert from "node:assert/strict"
import test from "node:test"
import { registerHooks } from "node:module"

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })

const { fetchCaseImages, fetchImageIngestionJob, fetchIngestionJob, ImageReadError } = await import("../src/features/cases/services/image-read-api.ts")
const { ingestionJobPollInterval } = await import("../src/features/cases/lib/ingestion-job-polling.ts")
const { canPreviewCaseImage, caseImageViewerMessage } = await import("../src/features/cases/lib/case-image-state.ts")

const caseId = "00000000-0000-4000-8000-000000000064"
const imageId = "00000000-0000-4000-8000-000000000125"
const uploadId = "00000000-0000-4000-8000-000000000124"
const jobId = "00000000-0000-4000-8000-000000000126"
const completed = { caseId, imageId, uploadId, jobId }
const image = { id: imageId, uploadId, jobId, caseId, originalFilename: "synthetic.png", displayName: null, kind: "PNG",
  mediaType: "image/png", detectedMediaType: "image/png", sizeBytes: 3,
  status: "READY", widthPx: 2, heightPx: 2, rejectionCode: null,
  createdAt: "2026-10-18T12:00:00Z", completedAt: "2026-10-18T12:00:01Z",
  processedAt: "2026-10-18T12:00:02Z", previewAvailable: true,
  previewWidthPx: 2, previewHeightPx: 2,
  pixelSpacingMm: null, imagerPixelSpacingMm: null, imageOrientationPatient: null }
const job = { id: jobId, caseId, imageId, uploadId, status: "SUCCEEDED", attempts: 1,
  errorCode: null, createdAt: "2026-10-18T12:00:00Z", updatedAt: "2026-10-18T12:00:02Z",
  startedAt: "2026-10-18T12:00:01Z", finishedAt: "2026-10-18T12:00:02Z" }

test("reads images by case and job by completion identity with same-origin credentials", async () => {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, init })
    return Response.json(String(url).endsWith("/images") ? { items: [image] } : job)
  }
  assert.deepEqual(await fetchCaseImages(caseId, { fetchImpl }), [image])
  assert.deepEqual(await fetchIngestionJob(completed, { fetchImpl }), job)
  assert.equal(calls[0].url, `/api/cases/${caseId}/images`)
  assert.equal(calls[1].url, `/api/cases/${caseId}/jobs/${jobId}`)
  assert.equal(calls.every((call) => call.init.credentials === "same-origin" && call.init.cache === "no-store"), true)
})

test("stops polling for terminal jobs and errors", () => {
  assert.equal(ingestionJobPollInterval("QUEUED"), 2000)
  assert.equal(ingestionJobPollInterval("PROCESSING"), 2000)
  for (const status of ["SUCCEEDED", "REJECTED", "FAILED", undefined]) assert.equal(ingestionJobPollInterval(status), false)
  assert.equal(ingestionJobPollInterval("PROCESSING", true), false)
})

test("rejects cross-case images and mismatched job identifiers", async () => {
  await assert.rejects(fetchCaseImages(caseId, { fetchImpl: async () => Response.json({ items: [{ ...image, caseId: uploadId }] }) }),
    (error) => error instanceof ImageReadError && error.code === "INVALID_RESPONSE")
  await assert.rejects(fetchIngestionJob(completed, { fetchImpl: async () => Response.json({ ...job, imageId: uploadId }) }),
    (error) => error instanceof ImageReadError && error.code === "INVALID_RESPONSE")
  await assert.rejects(fetchCaseImages(caseId, { fetchImpl: async () => Response.json({ error: { code: "CASE_NOT_FOUND", retryable: false } }, { status: 404 }) }),
    (error) => error instanceof ImageReadError && error.code === "CASE_NOT_FOUND" && !error.retryable)
})

test("browser accepts all clinical image states and preserves required null metadata", async () => {
  const statuses = ["PENDING_UPLOAD", "QUARANTINED", "PROCESSING", "READY", "REJECTED", "FAILED", "CANCELLED"]
  const items = statuses.map((status, index) => ({ ...image, status,
    id: `00000000-0000-4000-8000-${String(200 + index).padStart(12, "0")}`,
    jobId: status === "CANCELLED" ? null : jobId }))
  const result = await fetchCaseImages(caseId, { fetchImpl: async () => Response.json({ items }) })
  assert.deepEqual(result, items)
})

test("browser rejects missing required fields and invalid physical metadata", async () => {
  for (const invalid of [
    { jobId: undefined }, { jobId: "bad-id" }, { pixelSpacingMm: undefined },
    { pixelSpacingMm: [0.5, 0.6, 0.7] }, { imageOrientationPatient: [1, 0] },
    { imagerPixelSpacingMm: ["0.5", "0.6"] }, { status: "UNPUBLISHED" },
  ]) await assert.rejects(fetchCaseImages(caseId, { fetchImpl: async () =>
    Response.json({ items: [{ ...image, ...invalid }] }),
  }), (error) => error instanceof ImageReadError && error.code === "INVALID_RESPONSE")
})

test("persisted terminal images stop stale active-job polling and never unlock non-ready previews", () => {
  for (const status of ["READY", "REJECTED", "FAILED", "CANCELLED"]) {
    assert.equal(ingestionJobPollInterval("QUEUED", false, status), false)
    assert.equal(ingestionJobPollInterval("PROCESSING", false, status), false)
    assert.equal(canPreviewCaseImage({ status, previewAvailable: true }), status === "READY")
  }
  for (const status of ["PENDING_UPLOAD", "QUARANTINED", "PROCESSING"]) {
    assert.equal(ingestionJobPollInterval("PROCESSING", false, status), 2000)
    assert.equal(canPreviewCaseImage({ status, previewAvailable: true }), false)
  }
  assert.equal(canPreviewCaseImage(undefined), false)
  assert.equal(canPreviewCaseImage({ status: "READY", previewAvailable: false }), false)
})

test("viewer messages distinguish pending transport, rejection, failure and cancellation", () => {
  assert.equal(caseImageViewerMessage({ status: "PENDING_UPLOAD" }), "pendingUploadImage")
  assert.equal(caseImageViewerMessage({ status: "QUARANTINED" }), "ingestionPending")
  assert.equal(caseImageViewerMessage({ status: "PROCESSING" }), "ingestionPending")
  assert.equal(caseImageViewerMessage({ status: "PROCESSING" }, "FAILED"), "ingestionFailed")
  assert.equal(caseImageViewerMessage({ status: "FAILED" }), "ingestionFailed")
  assert.equal(caseImageViewerMessage({ status: "CANCELLED" }, "PROCESSING"), "cancelledImage")
  assert.equal(caseImageViewerMessage({ status: "REJECTED" }), "rejectedImage")
  assert.equal(caseImageViewerMessage({ status: "READY" }, "FAILED"), "previewUnavailable")
  assert.equal(caseImageViewerMessage(undefined), "draftEmpty")
})

test("discovery validates its image identity, preserves a null job and uses the BFF", async () => {
  const calls = []
  const found = await fetchImageIngestionJob(completed, { fetchImpl: async (url, init) => {
    calls.push({ url, init })
    return Response.json({ job })
  } })
  assert.deepEqual(found, job)
  assert.equal(calls[0].url, `/api/cases/${caseId}/images/${imageId}/job`)
  assert.equal(calls[0].init.credentials, "same-origin")
  assert.equal(calls[0].init.cache, "no-store")
  assert.equal(await fetchImageIngestionJob(completed, { fetchImpl: async () => Response.json({ job: null }) }), null)
  for (const data of [{}, { job: { ...job, imageId: uploadId } }, { job: { ...job, uploadId: imageId } }]) {
    await assert.rejects(fetchImageIngestionJob(completed, { fetchImpl: async () => Response.json(data) }),
      (error) => error instanceof ImageReadError && error.code === "INVALID_RESPONSE")
  }
})
