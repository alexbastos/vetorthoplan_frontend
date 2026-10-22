import type { QueryClient } from "@tanstack/react-query"

import { casesQueryKeys } from "../hooks/cases-query-keys"
import { fetchCaseImages, ImageReadError } from "../services/image-read-api"
import { cancelImageUpload, ImageUploadCancelError } from "../services/image-upload-cancel-api"
import type { ImageIngestionIdentity } from "../types/ingestion-reference"
import type { CaseImage } from "../types/case-image"
import { refreshIngestionImages } from "./ingestion-query-options"
import { isImageDeletionLocked } from "./image-deletion"

type CancelMessage = "unavailable" | "unconfirmed" | "pending" | "notFound" | "confirmed" | "accessDenied" | "invalidResponse"
type UploadCancellationState = {
  phase: "idle" | "cancelling" | "checking" | "cancelled" | "unavailable" | "confirmed" | "error" | "uncertain"
  message?: CancelMessage
}
const IDLE_CANCELLATION: UploadCancellationState = { phase: "idle" }
const requests = new WeakMap<QueryClient, Map<string, Promise<UploadCancellationState>>>()

function requestUploadCancellation(client: QueryClient, identity: ImageIngestionIdentity,
  options: { fetchImpl?: typeof fetch; checkOnly?: boolean } = {},
): Promise<UploadCancellationState> {
  let pending = requests.get(client)
  if (!pending) { pending = new Map(); requests.set(client, pending) }
  const key = JSON.stringify(casesQueryKeys.uploadCancellation(identity.caseId, identity.uploadId))
  const existing = pending.get(key)
  if (existing) return existing
  const promise = Promise.resolve().then(() => cancelSession(client, identity, options)).finally(() => pending.delete(key))
  pending.set(key, promise)
  return promise
}

async function cancelSession(client: QueryClient, identity: ImageIngestionIdentity, options: { fetchImpl?: typeof fetch; checkOnly?: boolean }): Promise<UploadCancellationState> {
  if (isImageDeletionLocked(client, identity.caseId, identity.imageId)) return { phase: "error", message: "pending" }
  const key = casesQueryKeys.uploadCancellation(identity.caseId, identity.uploadId)
  const before = client.getQueryData<UploadCancellationState>(key) ?? IDLE_CANCELLATION
  const checkOnly = options.checkOnly || before.phase === "uncertain"
  const publish = (state: UploadCancellationState) => { client.setQueryData(key, state); return state }
  publish({ phase: checkOnly ? "checking" : "cancelling" })
  const read = async () => {
    await client.cancelQueries({ queryKey: casesQueryKeys.images(identity.caseId), exact: true })
    const images = await fetchCaseImages(identity.caseId, { fetchImpl: options.fetchImpl, signal: AbortSignal.timeout(30_000) })
    await client.cancelQueries({ queryKey: casesQueryKeys.images(identity.caseId), exact: true })
    client.setQueryData(casesQueryKeys.images(identity.caseId), images)
    const image = images.find(item => item.id.toLowerCase() === identity.imageId.toLowerCase())
    if (image && image.uploadId.toLowerCase() !== identity.uploadId.toLowerCase()) throw new ImageReadError("INVALID_RESPONSE", false)
    return image
  }
  try {
    const current = await read()
    const known = cancellationFromImage(current)
    if (known) return publish(known)
    if (checkOnly) return publish({ phase: "error", message: "pending" })
    try {
      await cancelImageUpload(identity, { fetchImpl: options.fetchImpl, signal: AbortSignal.timeout(30_000) })
      void refreshIngestionImages(client, identity.caseId)
      return publish({ phase: "cancelled" })
    } catch (error) {
      const uncertain = !(error instanceof ImageUploadCancelError) || error.uncertain
      if (error instanceof ImageUploadCancelError && (error.code === "ACCESS_DENIED" || error.code === "SESSION_UNAVAILABLE")) {
        return publish({ phase: "error", message: "accessDenied" })
      }
      // Reconcile a lost response or a race with complete; never call complete or delete an image here.
      try {
        const actual = await read()
        const known = cancellationFromImage(actual)
        if (known) return publish(known)
        return publish({ phase: uncertain ? "uncertain" : "error", message: uncertain ? "unconfirmed"
          : error instanceof ImageUploadCancelError && error.code === "IMAGE_UPLOAD_NOT_FOUND" ? "notFound" : "pending" })
      } catch (readError) {
        return publish({ phase: uncertain ? "uncertain" : "error", message: readMessage(readError) })
      }
    }
  } catch (error) {
    return publish({ phase: before.phase === "uncertain" ? "uncertain" : "error", message: readMessage(error) })
  }
}

function cancellationFromImage(image?: CaseImage): UploadCancellationState | undefined {
  if (!image) return { phase: "unavailable", message: "notFound" }
  if (image.status === "CANCELLED") return { phase: "cancelled" }
  if (image.status !== "PENDING_UPLOAD") return { phase: "confirmed", message: "confirmed" }
}
function readMessage(error: unknown): CancelMessage {
  return error instanceof ImageReadError && (error.code === "CASE_NOT_FOUND" || error.code === "IMAGE_NOT_FOUND") ? "notFound"
    : error instanceof ImageReadError && error.code === "ACCESS_DENIED" ? "accessDenied"
      : error instanceof ImageReadError && error.code === "INVALID_RESPONSE" ? "invalidResponse" : "unavailable"
}
export { IDLE_CANCELLATION, requestUploadCancellation }
export type { UploadCancellationState }
