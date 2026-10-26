import type { FileUploadStatus } from "@/components/ui/file-upload-types"
import type { QueuedFile } from "./case-file-upload-queue"
import { isUploadSelectionError } from "./upload-selection-feedback"

const knownErrors = ["empty", "too-large", "invalid-name", "unsupported-type", "type-mismatch", "checksum",
  "DUPLICATE_FILE", "CASE_NOT_FOUND", "IMAGE_UPLOAD_LIMIT_EXCEEDED", "IMAGE_UPLOAD_SESSION_CONFLICT", "REQUEST_VALIDATION_ERROR", "IMAGE_UPLOAD_VALIDATION_ERROR",
  "NETWORK_ERROR", "SERVICE_UNAVAILABLE", "EXPIRED", "STORAGE_REJECTED", "STORAGE_UNAVAILABLE",
  "IMAGE_UPLOAD_NOT_FOUND", "OBJECT_NOT_FOUND", "OBJECT_MISMATCH", "CONFIRM_NETWORK"] as const

type UploadPresentation = {
  state: FileUploadStatus["state"]
  label: "loading" | "ready" | "imageCancelled"
    | "cancellingUpload" | "cancelNotConfirmed" | "cancelUnavailable"
    | "uploadFailed" | "duplicateFile" | "jobReadError" | "jobStatus.REJECTED" | "jobStatus.FAILED"
  detail?: `sessionErrors.${(typeof knownErrors)[number] | "OTHER"}` | "transportNotReceived"
  progress?: number
  transferProgress?: number
  canRemove: boolean
  canRetry: boolean
}

function imageUploadPresentation(
  item: Pick<QueuedFile, "phase" | "error" | "completed" | "progress" | "transportFailed" | "cancellation">,
  imageStatus?: string,
  jobStatus?: string,
  jobError = false,
  retryAcknowledged = false,
): UploadPresentation {
  const base = { canRemove: false, canRetry: false }
  if (item.phase === "cancelling") return { ...base, state: "processing", label: "cancellingUpload" }
  if (item.phase === "cancel-error") return { ...base, state: "error",
    label: item.cancellation?.phase === "unavailable" ? "cancelUnavailable" : "cancelNotConfirmed",
    canRemove: item.cancellation?.phase === "unavailable", canRetry: item.cancellation?.phase !== "unavailable" }
  if (item.error) {
    const code = knownErrors.find((candidate) => candidate === item.error) ?? "OTHER"
    if (isUploadSelectionError(code)) return { ...base, state: "error",
      label: code === "DUPLICATE_FILE" ? "duplicateFile" : "uploadFailed", canRemove: !item.completed }
    return { ...base, state: "error", label: "uploadFailed", canRemove: !item.completed,
      canRetry: code !== "IMAGE_UPLOAD_SESSION_CONFLICT",
      detail: item.transportFailed && code === "OBJECT_NOT_FOUND" ? "transportNotReceived" : `sessionErrors.${code}` }
  }
  // Overall progress represents completed stages, not a measured worker percentage.
  // Reserve the last portion for confirmation, processing and the READY image.
  if (item.phase === "queued" || item.phase === "hashing" || item.phase === "creating") {
    return { ...base, state: "waiting", label: "loading", canRemove: true,
      progress: item.phase === "creating" ? 8 : item.phase === "hashing" ? 3 : 0 }
  }
  if (item.phase === "transporting") {
    const transferProgress = typeof item.progress === "number" && Number.isFinite(item.progress)
      ? Math.max(0, Math.min(100, item.progress)) : 0
    return { ...base, state: "uploading", label: "loading", canRemove: true,
      transferProgress, progress: 10 + transferProgress * 0.7 }
  }
  if (item.phase === "confirming") return { ...base, state: "processing", label: "loading", canRemove: true, progress: 85 }
  if (imageStatus === "READY") return { ...base, state: "success", label: "ready", progress: 100 }
  if (imageStatus === "CANCELLED") return { ...base, state: "error", label: "imageCancelled" }
  if (imageStatus === "FAILED" && !retryAcknowledged) return { ...base, state: "error", label: "jobStatus.FAILED" }
  if (imageStatus === "REJECTED" || jobStatus === "REJECTED") return { ...base, state: "error", label: "jobStatus.REJECTED" }
  if (jobStatus === "FAILED") return { ...base, state: "error", label: "jobStatus.FAILED" }
  if (jobError) return { ...base, state: "error", label: "jobReadError" }
  return { ...base, state: "processing", label: "loading",
    progress: jobStatus === "SUCCEEDED" ? 98 : imageStatus === "PROCESSING" || jobStatus === "PROCESSING" ? 95 : 90 }
}

export { imageUploadPresentation }
