const caseId = "00000000-0000-4000-8000-000000000064"
function clinicalUpload(index = 0) {
  const uuid = number => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`
  const uploadId = uuid(124 + index * 10), imageId = uuid(125 + index * 10), jobId = uuid(126 + index * 10)
  const identity = { caseId, uploadId, imageId }
  const session = { ...identity, kind: "PNG", mediaType: "image/png", sizeBytes: 3, sha256: "a".repeat(64), status: "PENDING_UPLOAD",
    upload: { method: "POST", url: "https://storage.example/upload", fields: { key: "signed-key", policy: "signed-policy" }, expiresAt: "2099-01-01T00:00:00Z" } }
  const completed = { ...identity, kind: session.kind, mediaType: session.mediaType, sizeBytes: session.sizeBytes, sha256: session.sha256,
    status: "QUARANTINED", completedAt: "2026-10-20T12:00:01Z", jobId, jobStatus: "QUEUED" }
  const image = { id: imageId, caseId, uploadId, jobId: null, originalFilename: `synthetic-${index}.png`, displayName: null, kind: "PNG", mediaType: "image/png",
    detectedMediaType: null, sizeBytes: 3, status: "PENDING_UPLOAD", widthPx: null, heightPx: null, rejectionCode: null,
    createdAt: "2026-10-20T12:00:00Z", completedAt: null, processedAt: null, previewAvailable: false,
    previewWidthPx: null, previewHeightPx: null, pixelSpacingMm: null, imagerPixelSpacingMm: null, imageOrientationPatient: null }
  const rawImage = { id: imageId, case_id: caseId, upload_id: uploadId, job_id: null, original_filename: image.originalFilename, display_name: null,
    kind: "PNG", media_type: "image/png", detected_media_type: null, size_bytes: 3, sha256: session.sha256, status: "PENDING_UPLOAD",
    width_px: null, height_px: null, rejection_code: null, created_at: image.createdAt, completed_at: null, processed_at: null,
    metadata: {}, preview_available: false, preview_width_px: null, preview_height_px: null,
    pixel_spacing_mm: null, imager_pixel_spacing_mm: null, image_orientation_patient: null }
  return { caseId, jobId, identity, session, completed, image, rawImage }
}
export { clinicalUpload }
