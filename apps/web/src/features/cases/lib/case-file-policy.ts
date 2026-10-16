const CASE_FILE_ACCEPT_ATTRIBUTE = ".dcm,.png,.jpg,.jpeg,.pdf,.mp4,application/dicom,image/png,image/jpeg,application/pdf,video/mp4"
const CASE_FILE_MAX_SIZE = 50 * 1_024 * 1_024

type CaseFileValidationError = "empty" | "too-large" | "unsupported-type"

type CaseFileValidationResult =
  | { ok: true }
  | { error: CaseFileValidationError; ok: false }

const SUPPORTED_EXTENSIONS = new Set(["dcm", "jpeg", "jpg", "mp4", "pdf", "png"])

function validateCaseFile(file: File): CaseFileValidationResult {
  if (file.size <= 0) {
    return { error: "empty", ok: false }
  }

  if (file.size > CASE_FILE_MAX_SIZE) {
    return { error: "too-large", ok: false }
  }

  const extension = file.name.split(".").pop()?.toLowerCase()

  if (!extension || !SUPPORTED_EXTENSIONS.has(extension)) {
    return { error: "unsupported-type", ok: false }
  }

  return { ok: true }
}

function getCaseFileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

export { CASE_FILE_ACCEPT_ATTRIBUTE, CASE_FILE_MAX_SIZE, getCaseFileKey, validateCaseFile }
export type { CaseFileValidationError }
