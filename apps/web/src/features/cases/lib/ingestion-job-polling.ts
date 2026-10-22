import { isTerminalCaseImageStatus } from "./case-image-state"

function ingestionJobPollInterval(status: string | undefined, hasError = false, imageStatus?: string, retryAcknowledged = false): number | false {
  return !hasError && (!isTerminalCaseImageStatus(imageStatus) || imageStatus === "FAILED" && retryAcknowledged)
    && (status === "QUEUED" || status === "PROCESSING") ? 2_000 : false
}

export { ingestionJobPollInterval }
