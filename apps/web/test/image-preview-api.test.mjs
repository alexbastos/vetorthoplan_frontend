import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })

const { fetchImagePreview, ImagePreviewError, previewRefreshInterval } = await import("../src/features/cases/services/image-preview-api.ts")
const caseId = "00000000-0000-4000-8000-000000000064"
const imageId = "00000000-0000-4000-8000-000000000125"
const preview = { url: "https://storage.example/image.png?signature=opaque", mediaType: "image/png",
  widthPx: 2, heightPx: 2, expiresAt: "2099-01-01T00:00:00Z" }

test("requests a same-origin preview without caching and keeps the signed URL opaque", async () => {
  const result = await fetchImagePreview(caseId, imageId, { fetchImpl: async (url, init) => {
    assert.equal(url, `/api/cases/${caseId}/images/${imageId}/preview`)
    assert.equal(init.credentials, "same-origin")
    assert.equal(init.cache, "no-store")
    return Response.json(preview)
  } })
  assert.deepEqual(result, preview)
})

test("rejects unavailable or invalid preview and schedules renewal before expiry", async () => {
  await assert.rejects(fetchImagePreview(caseId, imageId, { fetchImpl: async () => Response.json({ error: {
    code: "PREVIEW_UNAVAILABLE", retryable: false,
  } }, { status: 409 }) }), (error) => error instanceof ImagePreviewError && error.code === "PREVIEW_UNAVAILABLE")
  await assert.rejects(fetchImagePreview(caseId, imageId, { fetchImpl: async () => Response.json({ ...preview, widthPx: 0 }) }),
    (error) => error instanceof ImagePreviewError && error.code === "INVALID_RESPONSE")
  assert.equal(previewRefreshInterval("2026-10-19T12:00:30Z", false, Date.parse("2026-10-19T12:00:00Z")), 20_000)
  assert.equal(previewRefreshInterval("2026-10-19T12:00:30Z", true, Date.parse("2026-10-19T12:00:00Z")), false)
})
