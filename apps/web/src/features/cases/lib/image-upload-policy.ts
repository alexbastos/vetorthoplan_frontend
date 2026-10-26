import type { CreateImageUploadRequest } from "@vetorthoplan/api-client/clinical-contract"

const IMAGE_UPLOAD_MAX_BYTES = 100 * 1024 * 1024
const IMAGE_UPLOAD_ACCEPT = ".dcm,.dicom,.png,.jpg,.jpeg,application/dicom,image/dicom,image/png,image/jpeg"
const SIMPLE_FILENAME = /^[^/\\\x00-\x1f\x7f]+$/

const IMAGE_UPLOAD_FILE_ERRORS = ["empty", "too-large", "invalid-name", "unsupported-type", "type-mismatch"] as const
type ImageUploadFileError = (typeof IMAGE_UPLOAD_FILE_ERRORS)[number]
type ImageUploadFileResult =
  | { ok: true; mediaType: CreateImageUploadRequest["media_type"] }
  | { ok: false; error: ImageUploadFileError }

function validateImageUploadFile(file: Pick<File, "name" | "size" | "type">): ImageUploadFileResult {
  if (!file.name || file.name.length > 255 || !SIMPLE_FILENAME.test(file.name)) {
    return { ok: false, error: "invalid-name" }
  }
  if (file.size < 1) return { ok: false, error: "empty" }
  if (file.size > IMAGE_UPLOAD_MAX_BYTES) return { ok: false, error: "too-large" }

  const extension = file.name.split(".").pop()?.toLowerCase()
  const expected = extension === "dcm" || extension === "dicom" ? "application/dicom"
    : extension === "png" ? "image/png"
      : extension === "jpg" || extension === "jpeg" ? "image/jpeg" : null
  if (!expected) return { ok: false, error: "unsupported-type" }

  const declared = file.type.toLowerCase()
  if (declared && declared !== "application/octet-stream"
    && declared !== expected && !(expected === "application/dicom" && declared === "image/dicom")) {
    return { ok: false, error: "type-mismatch" }
  }
  return { ok: true, mediaType: declared === "image/dicom" ? declared : expected }
}

export { IMAGE_UPLOAD_ACCEPT, IMAGE_UPLOAD_MAX_BYTES, IMAGE_UPLOAD_FILE_ERRORS, validateImageUploadFile }
export type { ImageUploadFileError, ImageUploadFileResult }
