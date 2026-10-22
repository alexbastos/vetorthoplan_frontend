import type { CaseImage } from "../types/case-image"

function canPreviewCaseImage(image: Pick<CaseImage, "status" | "previewAvailable"> | undefined): boolean {
  return image?.status === "READY" && image.previewAvailable
}

function isTerminalCaseImageStatus(status: string | undefined): boolean {
  return status === "READY" || status === "REJECTED" || status === "FAILED" || status === "CANCELLED"
}

function caseImageViewerMessage(image: Pick<CaseImage, "status"> | undefined, jobStatus?: string, retryAcknowledged = false) {
  if (!image) return "draftEmpty"
  if (image.status === "READY") return "previewUnavailable"
  if (image.status === "CANCELLED") return "cancelledImage"
  if (image.status === "FAILED" && !retryAcknowledged) return "ingestionFailed"
  if (image.status === "REJECTED") return "rejectedImage"
  if (jobStatus === "FAILED") return "ingestionFailed"
  if (image.status === "PENDING_UPLOAD") return "pendingUploadImage"
  return "ingestionPending"
}

export { canPreviewCaseImage, caseImageViewerMessage, isTerminalCaseImageStatus }
