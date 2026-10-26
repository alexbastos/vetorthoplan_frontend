import type { QueryClient } from "@tanstack/react-query"

import { casesQueryKeys } from "../hooks/cases-query-keys"
import { completeImageUploadWithVisibilityRetry, ImageUploadCompleteError } from "../services/image-upload-complete-api"
import { createImageUploadSession, ImageUploadSessionError } from "../services/image-upload-session-api"
import { ImageUploadTransportError, transportImageUpload } from "../services/image-upload-transport"
import type { CompletedImageUpload } from "../types/completed-image-upload"
import type { ImageUploadIdentity, ImageUploadSession } from "../types/image-upload-session"
import type { ImageIngestionIdentity, IngestionReference } from "../types/ingestion-reference"
import { hashImageFile } from "./hash-image-file"
import { prepareImageUploadAttempt, type ImageUploadAttempt } from "./image-upload-attempt"
import { requestUploadCancellation, type UploadCancellationState } from "./image-upload-cancellation"
import { validateImageUploadFile } from "./image-upload-policy"

type FilePhase = "queued" | "hashing" | "creating" | "transporting" | "confirming" | "quarantined" | "stored" | "cancelling" | "cancel-error" | "error"
type QueuedFile = {
  id: string; file: File; phase: FilePhase; error: string | null
  identity: ImageUploadIdentity | null; completed: CompletedImageUpload | null
  persisted: ImageIngestionIdentity | null; progress: number | null; transportFailed: boolean
  sessionAttempt: ImageUploadAttempt | null; cancelRequested: boolean
  sha256: string | null
  retryMode: "confirm" | "restart"; cancellation?: UploadCancellationState
  restartAfterCancellation?: boolean
}
type QueueDependencies = {
  hash: typeof hashImageFile; createSession: typeof createImageUploadSession
  transport: typeof transportImageUpload; complete: typeof completeImageUploadWithVisibilityRetry
  cancel: (identity: ImageIngestionIdentity) => Promise<UploadCancellationState>
}
const NO_CREATED_SESSION = new Set(["CASE_NOT_FOUND", "IMAGE_UPLOAD_LIMIT_EXCEEDED", "IMAGE_UPLOAD_SESSION_CONFLICT",
  "IMAGE_UPLOAD_DUPLICATE", "REQUEST_VALIDATION_ERROR", "IMAGE_UPLOAD_VALIDATION_ERROR", "VALIDATION_ERROR", "ACCESS_DENIED", "REQUEST_NOT_ALLOWED"])

function createCaseFileUploadQueue(caseId: string, client: QueryClient, overrides: Partial<QueueDependencies> = {}) {
  const deps: QueueDependencies = { hash: hashImageFile, createSession: createImageUploadSession,
    transport: transportImageUpload, complete: completeImageUploadWithVisibilityRetry,
    cancel: identity => requestUploadCancellation(client, identity), ...overrides }
  const empty: readonly QueuedFile[] = []
  let items: readonly QueuedFile[] = empty
  let pending: string[] = [], disposed = false, pumping = false
  let active: { id: string; controller: AbortController } | null = null
  const listeners = new Set<() => void>()
  const creations = new Map<string, Promise<ImageUploadSession>>()
  const cancellations = new Map<string, Promise<void>>()
  const find = (id: string) => items.find(item => item.id === id)
  const update = (change: (current: readonly QueuedFile[]) => readonly QueuedFile[]) => {
    items = change(items)
    if (!disposed) listeners.forEach(listener => listener())
  }
  const patch = (id: string, change: Partial<QueuedFile>) => update(current => current.map(item => item.id === id ? { ...item, ...change } : item))
  const drop = (id: string) => update(current => current.filter(item => item.id !== id))
  const stopped = (id: string, signal: AbortSignal) => signal.aborted || !find(id) || find(id)!.cancelRequested

  async function confirm(id: string, identity: ImageUploadIdentity, signal: AbortSignal) {
    patch(id, { phase: "confirming", error: null })
    try {
      const completed = await deps.complete(identity, { signal })
      if (stopped(id, signal)) return
      patch(id, { phase: "quarantined", identity: null, completed, persisted: identityOf(completed), progress: 100, transportFailed: false })
      const reference: IngestionReference = { ...identityOf(completed), jobId: completed.jobId, jobStatus: completed.jobStatus }
      client.setQueryData<IngestionReference[]>(casesQueryKeys.activeIngestions(caseId), (current = []) =>
        current.some(existing => existing.jobId === reference.jobId) ? current : [...current, reference])
      void client.invalidateQueries({ queryKey: casesQueryKeys.images(caseId) })
    } catch (caught) {
      if (stopped(id, signal)) return
      const failure = caught instanceof ImageUploadCompleteError ? caught : null
      const canConfirm = failure?.code === "IMAGE_UPLOAD_OBJECT_INVALID" && failure.reason === "object_not_found" || failure?.retryable === true
      patch(id, { phase: "error", retryMode: canConfirm ? "confirm" : "restart", error: failure?.code === "IMAGE_UPLOAD_OBJECT_INVALID"
        ? failure.reason === "object_not_found" ? "OBJECT_NOT_FOUND" : "OBJECT_MISMATCH"
          : failure?.code === "IMAGE_UPLOAD_EXPIRED" ? "EXPIRED" : failure?.code === "IMAGE_UPLOAD_NOT_FOUND" ? "IMAGE_UPLOAD_NOT_FOUND"
            : failure?.retryable ? "CONFIRM_NETWORK" : "OTHER" })
    }
  }

  async function process(id: string, controller: AbortController) {
    const item = find(id)
    if (!item || item.cancelRequested) return
    const signal = controller.signal
    if (item.identity && item.retryMode === "confirm") return confirm(id, item.identity, signal)
    const validation = validateImageUploadFile(item.file)
    if (!validation.ok) { patch(id, { phase: "error", error: validation.error }); return }
    try {
      patch(id, { phase: "hashing", error: null })
      const sha256 = item.sessionAttempt?.input.sha256 ?? await deps.hash(item.file, signal)
      if (stopped(id, signal)) return
      // Serial processing reserves a checksum before the next file is examined.
      // Keep uncertain sessions reserved until cancellation is confirmed.
      const duplicate = items.some(candidate => candidate.id !== id && candidate.sha256 === sha256
        && (candidate.phase !== "error" || candidate.identity || candidate.sessionAttempt || candidate.persisted))
      if (duplicate) {
        patch(id, { phase: "error", error: "DUPLICATE_FILE", sha256, progress: null })
        return
      }
      patch(id, { sha256 })
      const attempt = prepareImageUploadAttempt(item.sessionAttempt, caseId, { original_filename: item.file.name,
        media_type: validation.mediaType, size_bytes: item.file.size, sha256 })
      // Keep creation alive when cancelled: its response supplies the ID we must cancel.
      let creating: Promise<ImageUploadSession> | undefined = Promise.resolve().then(() => deps.createSession(caseId, attempt.input, attempt.key,
        { signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]) }))
      creations.set(id, creating)
      patch(id, { phase: "creating", sessionAttempt: attempt })
      let session: ImageUploadSession | null
      try { session = await creating } finally { creations.delete(id); creating = undefined }
      const identity: ImageUploadIdentity = { ...identityOf(session), kind: session.kind, mediaType: session.mediaType,
        sizeBytes: session.sizeBytes, sha256: session.sha256 }
      patch(id, { identity, sessionAttempt: null })
      if (stopped(id, signal)) { session = null; return }
      patch(id, { phase: "transporting", progress: 0 })
      try {
        const transport = deps.transport(session, item.file, { signal, onProgress: progress => {
          if (!stopped(id, signal) && find(id)?.progress !== progress) patch(id, { progress })
        } })
        session = null // Never retain the signed form in queue state or during confirmation/cancellation.
        await transport
      } catch (caught) {
        session = null
        if (stopped(id, signal)) return
        if (caught instanceof ImageUploadTransportError && caught.code === "NETWORK_AMBIGUOUS") {
          patch(id, { transportFailed: true }); await confirm(id, identity, signal); return
        }
        throw caught
      }
      if (!stopped(id, signal)) await confirm(id, identity, signal)
    } catch (caught) {
      const sessionError = caught instanceof ImageUploadSessionError ? caught.code : null
      const transportError = caught instanceof ImageUploadTransportError ? caught.code : null
      if (sessionError && NO_CREATED_SESSION.has(sessionError)) patch(id, { sessionAttempt: null })
      if (stopped(id, signal)) return
      // The backend can detect persisted content that is absent from this queue
      // after a refresh. Reuse local duplicate feedback without claiming its image.
      patch(id, { phase: "error", retryMode: "restart", error: sessionError === "IMAGE_UPLOAD_DUPLICATE" ? "DUPLICATE_FILE"
        : sessionError ?? transportError ?? (find(id)?.phase === "creating" ? "NETWORK_ERROR" : "checksum"),
        ...(sessionError && NO_CREATED_SESSION.has(sessionError) ? { sessionAttempt: null } : {}) })
    }
  }

  async function pump() {
    if (pumping || disposed) return
    pumping = true
    try {
      while (!disposed && pending.length) {
        const id = pending.shift()!
        if (!find(id) || find(id)!.cancelRequested) continue
        const controller = new AbortController()
        active = { id, controller }
        await process(id, controller)
        active = null
      }
    } finally { pumping = false }
  }

  function addFiles(files: readonly File[]): string[] {
    if (disposed || !files.length) return []
    const added = files.map((file): QueuedFile => ({ id: crypto.randomUUID(), file, phase: "queued", error: null,
      identity: null, completed: null, persisted: null, progress: null, transportFailed: false,
      sessionAttempt: null, cancelRequested: false, sha256: null, retryMode: "restart" }))
    update(current => [...current, ...added]); pending.push(...added.map(item => item.id)); void pump()
    return added.map(item => item.id)
  }

  function removeFile(id: string, restart = false): Promise<void> {
    const previous = cancellations.get(id)
    if (previous) return previous
    const item = find(id)
    if (!item || item.completed || item.phase === "stored") return Promise.resolve()
    pending = pending.filter(candidate => candidate !== id)
    if (item.cancellation?.phase === "unavailable") { drop(id); return Promise.resolve() }
    if (!item.identity && !item.sessionAttempt && !item.persisted) {
      if (active?.id === id) active.controller.abort()
      drop(id); return Promise.resolve()
    }
    let creating = creations.get(id)
    patch(id, { cancelRequested: true, phase: "cancelling", error: null, restartAfterCancellation: restart || item.restartAfterCancellation })
    // Aborting creation could orphan a committed session; hashing/transport/complete may be interrupted.
    if (!creating && active?.id === id) active.controller.abort()
    const action = Promise.resolve().then(async () => {
      try {
        if (creating) { try { await creating } catch { /* Recover an ambiguous create using its original command below. */ } }
        creating = undefined
        let current = find(id)
        if (!current) return
        let identity = current.identity ? identityOf(current.identity) : current.persisted
        if (!identity && current.sessionAttempt) {
          const attempt = current.sessionAttempt
          let recovered: ImageUploadSession | null = await deps.createSession(caseId, attempt.input, attempt.key,
            { allowExpiredForCancellation: true, signal: AbortSignal.timeout(30_000) })
          identity = identityOf(recovered); recovered = null
          patch(id, { persisted: identity, sessionAttempt: null })
        }
        if (!identity) { drop(id); return }
        patch(id, { persisted: identity })
        const result = await deps.cancel(identity)
        current = find(id)
        if (!current) return
        if (result.phase === "cancelled") {
          if (!(restart || current.restartAfterCancellation) || disposed) drop(id)
          else {
            patch(id, { phase: "queued", cancelRequested: false, identity: null, persisted: null, completed: null,
              sessionAttempt: null, cancellation: undefined, restartAfterCancellation: false, progress: null, transportFailed: false, error: null, retryMode: "restart" })
            pending.push(id); void pump()
          }
        } else if (result.phase === "confirmed") {
          patch(id, { phase: "stored", cancelRequested: false, identity: null, sessionAttempt: null, cancellation: result, error: null })
        } else {
          patch(id, { phase: "cancel-error", cancellation: result, error: null })
        }
      } catch {
        patch(id, { phase: "cancel-error", cancellation: { phase: "uncertain", message: "unavailable" }, error: null })
      }
    }).finally(() => cancellations.delete(id))
    cancellations.set(id, action)
    return action
  }

  function retry(id: string): Promise<void> {
    const item = find(id)
    if (!item || item.completed || item.phase === "stored") return Promise.resolve()
    if (item.phase === "cancel-error") return removeFile(id)
    if (item.phase !== "error" || item.error === "IMAGE_UPLOAD_SESSION_CONFLICT" || item.error === "DUPLICATE_FILE") return Promise.resolve()
    if (item.retryMode === "restart" && (item.identity || item.error === "EXPIRED" && item.sessionAttempt)) return removeFile(id, true)
    patch(id, { phase: "queued", error: null, progress: null, transportFailed: Boolean(item.identity) && item.transportFailed })
    pending.push(id); void pump(); return Promise.resolve()
  }

  return { addFiles, removeFile: (id: string) => removeFile(id), retry,
    forgetDeletedImages: (deleted: readonly string[]) => {
      update(current => current.filter(item => {
        const imageId = item.completed?.imageId ?? item.persisted?.imageId
        return !imageId || !deleted.includes(imageId)
      }))
    },
    getSnapshot: () => items, getServerSnapshot: () => empty,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    activate: () => { disposed = false },
    dispose: () => { disposed = true; items.forEach(item => { if (!item.completed && item.phase !== "stored") void removeFile(item.id) }) },
  }
}

function identityOf(value: ImageIngestionIdentity): ImageIngestionIdentity {
  return { caseId: value.caseId, imageId: value.imageId, uploadId: value.uploadId }
}

export { createCaseFileUploadQueue }
export type { QueuedFile }
