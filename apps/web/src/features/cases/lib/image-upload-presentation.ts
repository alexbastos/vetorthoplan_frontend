import type { FileUploadStatus } from "@/components/ui/file-upload-types"
import type { QueuedFile } from "./case-file-upload-queue"

const knownErrors = ["empty", "too-large", "invalid-name", "unsupported-type", "type-mismatch", "checksum",
  "CASE_NOT_FOUND", "IMAGE_UPLOAD_LIMIT_EXCEEDED", "IMAGE_UPLOAD_SESSION_CONFLICT", "REQUEST_VALIDATION_ERROR", "IMAGE_UPLOAD_VALIDATION_ERROR",
  "NETWORK_ERROR", "SERVICE_UNAVAILABLE", "EXPIRED", "STORAGE_REJECTED", "STORAGE_UNAVAILABLE",
  "IMAGE_UPLOAD_NOT_FOUND", "OBJECT_NOT_FOUND", "OBJECT_MISMATCH", "CONFIRM_NETWORK"] as const

type UploadPresentation = {
  state: FileUploadStatus["state"]
  label: "queuedUpload" | "hashing" | "preparingUpload" | "importing" | "confirming" | "ready" | "imageCancelled"
    | "cancellingUpload" | "cancelNotConfirmed" | "cancelUnavailable"
    | "uploadFailed" | "jobReadError" | "imageReconciling" | "jobStatus.REJECTED"
    | "jobStatus.FAILED" | "jobStatus.PROCESSING" | "jobStatus.QUEUED"
  detail?: `sessionErrors.${(typeof knownErrors)[number] | "OTHER"}` | "transportNotReceived"
  progress?: number
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
  const base = { progress: item.progress ?? undefined, canRemove: false, canRetry: false }
  if (item.phase === "cancelling") return { ...base, state: "processing", label: "cancellingUpload" }
  if (item.phase === "cancel-error") return { ...base, state: "error",
    label: item.cancellation?.phase === "unavailable" ? "cancelUnavailable" : "cancelNotConfirmed",
    canRemove: item.cancellation?.phase === "unavailable", canRetry: item.cancellation?.phase !== "unavailable" }
  if (item.error) {
    const code = knownErrors.find((candidate) => candidate === item.error) ?? "OTHER"
    return { ...base, state: "error", label: "uploadFailed", canRemove: !item.completed,
      canRetry: code !== "IMAGE_UPLOAD_SESSION_CONFLICT",
      detail: item.transportFailed && code === "OBJECT_NOT_FOUND" ? "transportNotReceived" : `sessionErrors.${code}` }
  }
  if (item.phase === "queued") return { ...base, state: "waiting", label: "queuedUpload", canRemove: true }
  if (item.phase === "hashing") return { ...base, state: "waiting", label: "hashing", canRemove: true }
  if (item.phase === "creating") return { ...base, state: "waiting", label: "preparingUpload", canRemove: true }
  if (item.phase === "transporting") return { ...base, state: "uploading", label: "importing", canRemove: true }
  if (item.phase === "confirming") return { ...base, state: "processing", label: "confirming", canRemove: true }
  if (imageStatus === "READY") return { ...base, state: "success", label: "ready" }
  if (imageStatus === "CANCELLED") return { ...base, state: "error", label: "imageCancelled" }
  if (imageStatus === "FAILED" && !retryAcknowledged) return { ...base, state: "error", label: "jobStatus.FAILED" }
  if (imageStatus === "REJECTED" || jobStatus === "REJECTED") return { ...base, state: "error", label: "jobStatus.REJECTED" }
  if (jobStatus === "FAILED") return { ...base, state: "error", label: "jobStatus.FAILED" }
  if (jobError) return { ...base, state: "error", label: "jobReadError" }
  if (jobStatus === "SUCCEEDED") return { ...base, state: "processing", label: "imageReconciling" }
  return { ...base, state: "processing", label: jobStatus === "PROCESSING" ? "jobStatus.PROCESSING" : "jobStatus.QUEUED" }
}

export { imageUploadPresentation }
