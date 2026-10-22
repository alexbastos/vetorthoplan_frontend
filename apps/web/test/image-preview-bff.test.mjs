import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript," }
  if (specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier)) return nextResolve(`${specifier}.ts`, context)
  return nextResolve(specifier, context)
} })

const { getImagePreviewForBff } = await import("../src/lib/server/image-preview-bff.ts")

const caseId = "00000000-0000-4000-8000-000000000064"
const imageId = "00000000-0000-4000-8000-000000000125"
const image = {
  id: imageId, upload_id: "00000000-0000-4000-8000-000000000124", case_id: caseId,
  job_id: "00000000-0000-4000-8000-000000000126",
  original_filename: "synthetic.png", kind: "PNG", media_type: "image/png",
  detected_media_type: "image/png", size_bytes: 3, sha256: "a".repeat(64),
  status: "READY", width_px: 2, height_px: 2, rejection_code: null,
  created_at: "2026-10-18T12:00:00Z", completed_at: "2026-10-18T12:00:01Z",
  processed_at: "2026-10-18T12:00:02Z", metadata: {},
  preview_available: true, preview_width_px: 2, preview_height_px: 2,
  pixel_spacing_mm: null, imager_pixel_spacing_mm: null, image_orientation_patient: null,
}
const preview = {
  url: "https://storage.example/private-preview?signature=opaque",
  media_type: "image/png", width_px: 2, height_px: 2, expires_at: "2099-01-01T00:00:00Z",
}

test("checks image ownership and readiness before projecting a temporary preview", async () => {
  const paths = []
  const result = await getImagePreviewForBff(caseId, imageId,
    async (path) => { paths.push(path); return { status: 200, data: image } },
    async (path) => { paths.push(path); return { status: 200, data: preview } })
  assert.equal(result.status, 200)
  assert.deepEqual(result.body, { url: preview.url, mediaType: "image/png", widthPx: 2,
    heightPx: 2, expiresAt: preview.expires_at })
  assert.deepEqual(paths, [{ image_id: imageId }, { image_id: imageId }])
  let previewCalls = 0
  const otherCase = "00000000-0000-4000-8000-000000000065"
  const hidden = await getImagePreviewForBff(otherCase, imageId, async () => ({ status: 200, data: image }),
    async () => { previewCalls++; return { status: 200, data: preview } })
  assert.equal(hidden.status, 404)
  const pending = await getImagePreviewForBff(caseId, imageId,
    async () => ({ status: 200, data: { ...image, status: "QUARANTINED" } }),
    async () => { previewCalls++; return { status: 200, data: preview } })
  assert.equal(pending.body.error.code, "PREVIEW_UNAVAILABLE")
  assert.equal(previewCalls, 0)
})

test("rejects expired, malformed, mismatched and unsafe preview responses", async () => {
  const readImage = async () => ({ status: 200, data: image })
  for (const bad of [
    { expires_at: "2000-01-01T00:00:00Z" },
    { media_type: "image/jpeg" }, { width_px: 3 },
    { url: "javascript:alert(1)" },
    { url: "https://user:pass@storage.example/image.png" },
    { url: "http://storage.example/image.png" },
  ]) {
    const result = await getImagePreviewForBff(caseId, imageId, readImage,
      async () => ({ status: 200, data: { ...preview, ...bad } }))
    assert.equal(result.status, 502)
  }
  assert.equal((await getImagePreviewForBff(caseId, imageId, readImage,
    async () => ({ status: 409, data: { message: "private storage" } }))).body.error.code, "PREVIEW_UNAVAILABLE")
  assert.equal((await getImagePreviewForBff(caseId, imageId, readImage,
    async () => ({ status: 404, data: {} }))).body.error.code, "IMAGE_NOT_FOUND")
})

test("every non-ready image returns unavailable without requesting a signed preview", async () => {
  let calls = 0
  for (const status of ["PENDING_UPLOAD", "QUARANTINED", "PROCESSING", "REJECTED", "FAILED", "CANCELLED"]) {
    const result = await getImagePreviewForBff(caseId, imageId,
      async () => ({ status: 200, data: { ...image, status, preview_available: true } }),
      async () => { calls++; return { status: 200, data: preview } })
    assert.equal(result.status, 409)
    assert.equal(result.body.error.code, "PREVIEW_UNAVAILABLE")
  }
  assert.equal(calls, 0)
})
