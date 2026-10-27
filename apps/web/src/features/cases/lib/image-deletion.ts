import type { QueryClient } from "@tanstack/react-query"

import { casesQueryKeys as keys } from "../hooks/cases-query-keys"
import { deleteCaseImage, ImageDeleteError } from "../services/image-delete-api"
import { fetchCaseImages, ImageReadError } from "../services/image-read-api"
import type { CaseImage } from "../types/case-image"
import type { ImageIngestionIdentity, IngestionReference } from "../types/ingestion-reference"
import { isCaseDeletionLocked } from "./case-deletion"
import { isCalibrationSaveLocked } from "./calibration-save-state"
import { hasImagePlanDraft } from "./image-quality-draft"

type ImageDeletionState = { phase: "idle" | "deleting" | "checking" | "deleted" | "error" | "uncertain"; message?: "blocked" | "unavailable" | "unconfirmed" | "stillPresent" | "accessDenied" | "invalidResponse" }
const IDLE_DELETION: ImageDeletionState = { phase: "idle" }
const requests = new WeakMap<QueryClient, Map<string, Promise<ImageDeletionState>>>()
// A pending session may have expired. Only the backend knows its validity;
// allow an explicit DELETE to decide, while local active transfers stay in cancellation.
const eligible = new Set<CaseImage["status"]>(["PENDING_UPLOAD", "QUARANTINED", "READY", "REJECTED", "FAILED", "CANCELLED"])
const activePhase = (phase?: string) => phase === "checking" || phase === "requesting" || phase === "cancelling" || phase === "deleting" || phase === "renaming" || phase === "saving" || phase === "uncertain"
function isImageDeletionLocked(client: QueryClient, caseId: string, imageId: string): boolean {
  const state = client.getQueryData<ImageDeletionState>(keys.imageDeletion(caseId, imageId))
  return isCaseDeletionLocked(client, caseId) || isCalibrationSaveLocked(client, caseId, imageId) || activePhase(state?.phase) || state?.phase === "deleted"
}
function canDeleteCaseImage(image: CaseImage): boolean { return eligible.has(image.status) }

function requestImageDeletion(client: QueryClient, identity: ImageIngestionIdentity, options: { fetchImpl?: typeof fetch; checkOnly?: boolean } = {}): Promise<ImageDeletionState> {
  let pending = requests.get(client)
  if (!pending) { pending = new Map(); requests.set(client, pending) }
  const id = JSON.stringify(keys.imageDeletion(identity.caseId, identity.imageId))
  const existing = pending.get(id)
  if (existing) return existing
  const action = Promise.resolve().then(() => remove(client, identity, options)).finally(() => pending.delete(id))
  pending.set(id, action)
  return action
}

async function remove(client: QueryClient, identity: ImageIngestionIdentity, options: { fetchImpl?: typeof fetch; checkOnly?: boolean }): Promise<ImageDeletionState> {
  const { caseId, imageId, uploadId } = identity
  const key = keys.imageDeletion(caseId, imageId)
  const before = client.getQueryData<ImageDeletionState>(key) ?? IDLE_DELETION
  if (before.phase === "deleted") return before
  const publish = (state: ImageDeletionState) => { client.setQueryData(key, state); return state }
  const checkOnly = options.checkOnly || before.phase === "uncertain"
  const references = client.getQueryData<IngestionReference[]>(keys.activeIngestions(caseId)) ?? []
  const jobIds = new Set(references.filter(item => item.imageId === imageId).map(item => item.jobId))
  for (const query of client.getQueryCache().findAll({ queryKey: ["cases", "ingestion-job", caseId] })) {
    const job = query.state.data as { imageId?: string; id?: string } | undefined
    if (job?.imageId === imageId && job.id) jobIds.add(job.id)
  }
  const cachedImage = client.getQueryData<CaseImage[]>(keys.images(caseId))?.find(image => image.id === imageId)
  if (cachedImage?.jobId) jobIds.add(cachedImage.jobId)
  const discovered = client.getQueryData<{ id: string } | null>(keys.imageIngestionJob(caseId, imageId))
  if (discovered?.id) jobIds.add(discovered.id)
  if (isCaseDeletionLocked(client, caseId)
    || hasImagePlanDraft(client, caseId, imageId)
    || isCalibrationSaveLocked(client, caseId, imageId)
    || activePhase(client.getQueryData<{ phase: string }>(keys.imageRename(caseId, imageId))?.phase)
    || activePhase(client.getQueryData<{ phase: string }>(keys.uploadCancellation(caseId, uploadId))?.phase)
    || [...jobIds].some(id => activePhase(client.getQueryData<{ phase: string }>(keys.ingestionRetry(caseId, id))?.phase))) return publish({ phase: "error", message: "blocked" })
  publish({ phase: checkOnly ? "checking" : "deleting" })
  const read = async () => {
    await client.cancelQueries({ queryKey: keys.images(caseId), exact: true })
    const images = await fetchCaseImages(caseId, { fetchImpl: options.fetchImpl, signal: AbortSignal.timeout(30_000) })
    const image = images.find(item => item.id === imageId)
    if (image && image.uploadId !== uploadId) throw new ImageReadError("INVALID_RESPONSE", false)
    if (image?.jobId) jobIds.add(image.jobId)
    return image
  }
  const finish = async () => {
    // Cancel stale reads before removing data; an in-flight preview/job must not restore deleted content.
    const related = (query: { queryKey: readonly unknown[] }) => {
      const [scope, kind, owner, id] = query.queryKey
      return scope === "cases" && owner === caseId && (kind === "images" || ((kind === "preview" || kind === "image-ingestion-job" || kind === "image-plan" || kind === "image-plan-save" || kind === "image-calibration-draft" || kind === "image-quality-draft" || kind === "image-display-settings" || kind === "image-calibration-introduction") && id === imageId)
        || ((kind === "ingestion-job" || kind === "ingestion-retry") && jobIds.has(String(id))))
    }
    await client.cancelQueries({ predicate: related })
    client.setQueryData<string[]>(keys.deletedImages(caseId), (current = []) => current.includes(imageId) ? current : [...current, imageId])
    client.setQueryData<CaseImage[]>(keys.images(caseId), (current = []) => current.filter(image => image.id !== imageId))
    client.setQueryData<IngestionReference[]>(keys.activeIngestions(caseId), (current = []) => current.filter(item => item.imageId !== imageId))
    client.removeQueries({ predicate: query => related(query) && query.queryKey[1] !== "images" })
    client.removeQueries({ queryKey: keys.uploadCancellation(caseId, uploadId), exact: true })
    void client.invalidateQueries({ queryKey: keys.list() })
    void client.invalidateQueries({ queryKey: keys.detail(caseId), exact: true })
    return publish({ phase: "deleted" })
  }
  try {
    const image = await read()
    if (!image) return finish()
    if (checkOnly) return publish({ phase: "error", message: "stillPresent" })
    if (!canDeleteCaseImage(image)) return publish({ phase: "error", message: "blocked" })
    try {
      await deleteCaseImage(caseId, imageId, { fetchImpl: options.fetchImpl, signal: AbortSignal.timeout(30_000) })
      return finish()
    } catch (error) {
      if (error instanceof ImageDeleteError && ["ACCESS_DENIED", "SESSION_UNAVAILABLE", "REQUEST_NOT_ALLOWED"].includes(error.code)) return publish({ phase: "error", message: "accessDenied" })
      const uncertain = !(error instanceof ImageDeleteError) || error.uncertain
      try {
        if (!await read()) return finish()
        return publish({ phase: uncertain ? "uncertain" : "error", message: uncertain ? "unconfirmed" : error instanceof ImageDeleteError && error.code === "IMAGE_DELETE_NOT_ALLOWED" ? "blocked" : "stillPresent" })
      } catch { return publish({ phase: uncertain ? "uncertain" : "error", message: "unavailable" }) }
    }
  } catch (error) {
    return publish({ phase: before.phase === "uncertain" ? "uncertain" : "error", message: error instanceof ImageReadError && error.code === "INVALID_RESPONSE" ? "invalidResponse" : error instanceof ImageReadError && error.code === "ACCESS_DENIED" ? "accessDenied" : "unavailable" })
  }
}
export { canDeleteCaseImage, IDLE_DELETION, isImageDeletionLocked, requestImageDeletion }
export type { ImageDeletionState }
