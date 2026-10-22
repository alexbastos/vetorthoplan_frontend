import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({ resolve(specifier, context, nextResolve) {
  return specifier === "server-only" ? { shortCircuit: true, url: "data:text/javascript," }
    : nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })

const { listCaseImagesForBff } = await import("../src/lib/server/case-images-bff.ts")
const { getIngestionJobForBff } = await import("../src/lib/server/ingestion-job-bff.ts")
const { getImageIngestionJobForBff } = await import("../src/lib/server/image-ingestion-job-bff.ts")
const { ApiHttpClient } = await import("../../../packages/api-client/src/http-client.ts")
const { fetchCaseImages } = await import("../src/features/cases/services/image-read-api.ts")

const caseId = "00000000-0000-4000-8000-000000000064"
const imageId = "00000000-0000-4000-8000-000000000125"
const uploadId = "00000000-0000-4000-8000-000000000124"
const jobId = "00000000-0000-4000-8000-000000000126"
const image = {
  id: imageId, upload_id: uploadId, job_id: jobId, case_id: caseId,
  original_filename: "synthetic.png", kind: "PNG", media_type: "image/png",
  detected_media_type: "image/png", size_bytes: 3, sha256: "a".repeat(64),
  status: "READY", width_px: 2, height_px: 2, rejection_code: null,
  created_at: "2026-10-18T12:00:00Z", completed_at: "2026-10-18T12:00:01Z",
  processed_at: "2026-10-18T12:00:02Z", metadata: { private_tag: "sensitive" },
  preview_available: true, preview_width_px: 2, preview_height_px: 2,
  pixel_spacing_mm: null, imager_pixel_spacing_mm: null, image_orientation_patient: null,
}
const job = {
  id: jobId, case_id: caseId, image_id: imageId, upload_id: uploadId,
  status: "SUCCEEDED", attempts: 1, error_code: null,
  created_at: "2026-10-18T12:00:00Z", updated_at: "2026-10-18T12:00:02Z",
  started_at: "2026-10-18T12:00:01Z", finished_at: "2026-10-18T12:00:02Z",
  storage_key: "private-key",
}

test("reads the case images and job through the clinical paths and projects public fields", async () => {
  const calls = []
  const client = new ApiHttpClient({ baseUrl: "http://127.0.0.1:8000", fetch: async (url, init) => {
    calls.push({ url: String(url), init })
    return Response.json(String(url).endsWith("/images") ? { items: [image] } : job)
  } })
  const images = await listCaseImagesForBff(caseId, (path, signal) => client.request({
    method: "get", path: "/api/v1/cases/{case_id}/images", pathParams: path, signal,
  }))
  const ingestion = await getIngestionJobForBff(caseId, jobId, (path, signal) => client.request({
    method: "get", path: "/api/v1/jobs/{job_id}", pathParams: path, signal,
  }))
  assert.equal(images.status, 200)
  assert.equal(images.body.items[0].status, "READY")
  assert.equal(ingestion.status, 200)
  assert.equal(ingestion.body.status, "SUCCEEDED")
  assert.equal(calls[0].url, `http://127.0.0.1:8000/api/v1/cases/${caseId}/images`)
  assert.equal(calls[1].url, `http://127.0.0.1:8000/api/v1/jobs/${jobId}`)
  assert.equal(calls.every((call) => call.init.cache === "no-store" && !call.init.headers.has("authorization")), true)
  assert.equal(JSON.stringify(images).includes("sensitive"), false)
  assert.equal(JSON.stringify(images).includes(image.sha256), false)
  assert.equal(JSON.stringify(ingestion).includes("private-key"), false)
})

test("rejects cross-case data, incomplete image schema and inconsistent jobs", async () => {
  const otherCase = "00000000-0000-4000-8000-000000000065"
  assert.equal((await listCaseImagesForBff(otherCase, async () => ({ status: 200, data: { items: [image] } }))).status, 502)
  assert.equal((await listCaseImagesForBff(caseId, async () => ({ status: 200, data: { items: [{ ...image, preview_available: undefined }] } }))).status, 502)
  assert.equal((await getIngestionJobForBff(otherCase, jobId, async () => ({ status: 200, data: job }))).status, 502)
  assert.equal((await getIngestionJobForBff(caseId, imageId, async () => ({ status: 200, data: job }))).status, 502)
  assert.equal((await getIngestionJobForBff(caseId, jobId, async () => ({ status: 200, data: { ...job, status: "READY" } }))).status, 502)
})

test("maps missing case/job and operational errors without leaking upstream details", async () => {
  const read = (status) => async () => ({ status, data: { message: "private" } })
  assert.equal((await listCaseImagesForBff(caseId, read(404))).body.error.code, "CASE_NOT_FOUND")
  assert.equal((await getIngestionJobForBff(caseId, jobId, read(404))).body.error.code, "JOB_NOT_FOUND")
  assert.equal((await listCaseImagesForBff(caseId, read(500))).status, 503)
  assert.equal((await getIngestionJobForBff(caseId, jobId, async () => { throw new SyntaxError("private") })).status, 502)
})

test("a mixed list preserves every valid image state and null job without losing other images", async () => {
  const statuses = ["PENDING_UPLOAD", "QUARANTINED", "PROCESSING", "READY", "REJECTED", "FAILED", "CANCELLED"]
  const items = statuses.map((status, index) => ({ ...image,
    id: `00000000-0000-4000-8000-${String(200 + index).padStart(12, "0")}`, status,
    job_id: status === "PENDING_UPLOAD" || status === "CANCELLED" ? null : jobId,
  }))
  const result = await listCaseImagesForBff(caseId, async () => ({ status: 200, data: { items } }))
  assert.equal(result.status, 200)
  assert.deepEqual(result.body.items.map((item) => item.status), statuses)
  assert.equal(result.body.items[0].jobId, null)
  assert.equal(result.body.items[5].jobId, jobId)
  assert.equal(result.body.items[6].jobId, null)
  assert.equal(result.body.items[0].pixelSpacingMm, null)
  assert.equal(result.body.items[0].imageOrientationPatient, null)
})

test("DICOM geometry crosses BFF and browser unchanged, without metadata or checksum leakage", async () => {
  const dicom = { ...image, kind: "DICOM", media_type: "application/dicom", detected_media_type: "application/dicom",
    pixel_spacing_mm: [0.41, 0.79], imager_pixel_spacing_mm: [0.42, 0.8],
    image_orientation_patient: [-1, 0, 0, 0, 1, 0] }
  const response = await listCaseImagesForBff(caseId, async () => ({ status: 200, data: { items: [dicom] } }))
  assert.equal(response.status, 200)
  const [publicImage] = await fetchCaseImages(caseId, { fetchImpl: async () => Response.json(response.body) })
  assert.equal(publicImage.jobId, jobId)
  assert.deepEqual(publicImage.pixelSpacingMm, [0.41, 0.79])
  assert.deepEqual(publicImage.imagerPixelSpacingMm, [0.42, 0.8])
  assert.deepEqual(publicImage.imageOrientationPatient, [-1, 0, 0, 0, 1, 0])
  assert.equal("metadata" in publicImage, false)
  assert.equal("sha256" in publicImage, false)
})

test("requires nullable 0.9.0 fields and rejects malformed geometry rather than inventing defaults", async () => {
  for (const invalid of [
    { job_id: undefined }, { job_id: "bad-id" }, { pixel_spacing_mm: undefined },
    { pixel_spacing_mm: [0.5] }, { imager_pixel_spacing_mm: [0.5, "0.6"] },
    { image_orientation_patient: [1, 0, 0] }, { status: "UNPUBLISHED" },
  ]) {
    const result = await listCaseImagesForBff(caseId,
      async () => ({ status: 200, data: { items: [{ ...image, ...invalid }] } }))
    assert.equal(result.status, 502)
    assert.equal(result.body.error.code, "INVALID_RESPONSE")
  }
})

test("recovers a job by image after checking ownership and projects only public fields", async () => {
  const paths = []
  const signal = new AbortController().signal
  const result = await getImageIngestionJobForBff(caseId, imageId,
    async (path, received) => { paths.push(path); assert.equal(received, signal); return { status: 200, data: image } },
    async (path, received) => { paths.push(path); assert.equal(received, signal); return { status: 200, data: { job } } }, signal)
  assert.equal(result.status, 200)
  assert.equal(result.body.job.id, jobId)
  assert.deepEqual(paths, [{ image_id: imageId }, { image_id: imageId }])
  assert.equal(JSON.stringify(result).includes("private-key"), false)
  assert.equal(JSON.stringify(result).includes("sensitive"), false)
})

test("job lookup cannot cross cases and distinguishes a missing image from a null job", async () => {
  let calls = 0
  const lookup = async () => { calls++; return { status: 200, data: { job: null } } }
  const readImage = async () => ({ status: 200, data: image })
  const forbidden = await getImageIngestionJobForBff(uploadId, imageId, readImage, lookup)
  assert.equal(forbidden.status, 404)
  assert.equal(calls, 0)
  assert.equal((await getImageIngestionJobForBff("bad-id", imageId, readImage, lookup)).status, 400)
  assert.equal(calls, 0)
  const empty = await getImageIngestionJobForBff(caseId, imageId,
    async () => ({ status: 200, data: { ...image, job_id: null, status: "QUARANTINED" } }), lookup)
  assert.deepEqual(empty, { status: 200, body: { job: null } })
  assert.equal((await getImageIngestionJobForBff(caseId, imageId,
    async () => ({ status: 404, data: { message: "private" } }), lookup)).body.error.code, "IMAGE_NOT_FOUND")
})

test("rejects mismatched discovered jobs and handles upstream failures without leaking details", async () => {
  const readImage = async () => ({ status: 200, data: image })
  for (const bad of [{ ...job, case_id: uploadId }, { ...job, image_id: uploadId },
    { ...job, upload_id: imageId }, { ...job, id: uploadId }, null, undefined]) {
    const result = await getImageIngestionJobForBff(caseId, imageId, readImage,
      async () => ({ status: 200, data: { job: bad } }))
    assert.equal(result.status, 502)
  }
  for (const [status, expected] of [[404, 404], [403, 403], [422, 400], [500, 503], [401, 503]]) {
    const result = await getImageIngestionJobForBff(caseId, imageId, readImage,
      async () => ({ status, data: { message: "private-provider-message", trace_id: "private-trace" } }))
    assert.equal(result.status, expected)
    assert.equal(JSON.stringify(result).includes("private"), false)
  }
})
