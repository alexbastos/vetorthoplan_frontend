import type { QueryClient } from "@tanstack/react-query"

import { casesQueryKeys } from "../hooks/cases-query-keys"
import { fetchIngestionJob, ImageReadError } from "../services/image-read-api"
import { IngestionRetryError, retryIngestionJob } from "../services/ingestion-job-retry-api"
import type { IngestionJob } from "../types/ingestion-job"
import type { IngestionJobIdentity } from "../types/ingestion-reference"
import type { CaseIngestionEntry } from "./case-ingestion"
import { refreshIngestionImages } from "./ingestion-query-options"
import { isImageDeletionLocked } from "./image-deletion"

type RetryMessage = "notFound" | "notAllowed" | "unavailable" | "unconfirmed" | "failedAgain" | "accessDenied"
type IngestionRetryState = {
  phase: "idle" | "checking" | "requesting" | "uncertain" | "error"
  acknowledged?: boolean
  baseline?: IngestionJob
  message?: RetryMessage
}
const IDLE_RETRY_STATE: IngestionRetryState = { phase: "idle" }
// Scope commands to this browser's QueryClient, shared across views and remounts.
const pendingCommands = new WeakMap<QueryClient, Map<string, Promise<void>>>()

function canRetryIngestion(entry: CaseIngestionEntry): boolean {
  return !entry.error && entry.job?.status === "FAILED"
    && entry.imageStatus !== "READY" && entry.imageStatus !== "REJECTED" && entry.imageStatus !== "CANCELLED"
    && entry.imageStatus !== "PENDING_UPLOAD"
}

function retryState(client: QueryClient, identity: IngestionJobIdentity): IngestionRetryState {
  return client.getQueryData<IngestionRetryState>(casesQueryKeys.ingestionRetry(identity.caseId, identity.jobId)) ?? IDLE_RETRY_STATE
}

function observeRetriedJob(client: QueryClient, identity: IngestionJobIdentity, job: IngestionJob): void {
  const current = retryState(client, identity)
  // A fresh GET can recover a retry started in another view/browser, even if the
  // image still says FAILED until the worker starts. Never infer this from old cache.
  if ((job.status === "QUEUED" || job.status === "PROCESSING") && current.phase === "idle" && (!current.acknowledged || current.message)) {
    client.setQueryData(casesQueryKeys.ingestionRetry(identity.caseId, identity.jobId), { ...current, acknowledged: true, message: undefined })
  }
}

function requestIngestionRetry(
  client: QueryClient, target: IngestionJobIdentity & { imageStatus?: string },
  options: { fetchImpl?: typeof fetch; checkOnly?: boolean } = {},
): Promise<void> {
  let pending = pendingCommands.get(client)
  if (!pending) { pending = new Map(); pendingCommands.set(client, pending) }
  const key = JSON.stringify(casesQueryKeys.ingestionRetry(target.caseId, target.jobId))
  const previous = pending.get(key)
  if (previous) return previous
  const command = Promise.resolve().then(() => executeRetry(client, target, options)).finally(() => pending.delete(key))
  pending.set(key, command)
  return command
}

async function executeRetry(client: QueryClient, target: IngestionJobIdentity & { imageStatus?: string }, options: {
  fetchImpl?: typeof fetch; checkOnly?: boolean
}): Promise<void> {
  if (isImageDeletionLocked(client, target.caseId, target.imageId)) return
  const stateKey = casesQueryKeys.ingestionRetry(target.caseId, target.jobId)
  const before = retryState(client, target)
  const publish = (state: IngestionRetryState) => client.setQueryData(stateKey, state)
  if (target.imageStatus === "READY" || target.imageStatus === "REJECTED" || target.imageStatus === "CANCELLED"
    || target.imageStatus === "PENDING_UPLOAD") return
  const checkOnly = options.checkOnly || before.phase === "uncertain" || before.phase === "error"
  publish({ ...before, phase: "checking", message: undefined })
  await cancelJobReads(client, target)
  let current: IngestionJob
  try {
    current = await fetchIngestionJob(target, { fetchImpl: options.fetchImpl, signal: AbortSignal.timeout(30_000) })
    cacheJob(client, target, current)
  } catch (error) {
    publish({ ...before, phase: before.phase === "uncertain" ? "uncertain" : "error", message: readErrorMessage(error) })
    void refreshIngestionImages(client, target.caseId)
    return
  }
  if (checkOnly || current.status !== "FAILED") {
    publish(reconciledState(before, current))
    void refreshIngestionImages(client, target.caseId)
    return
  }
  publish({ ...before, phase: "requesting", baseline: current, message: undefined })
  try {
    const job = await retryIngestionJob(target, { fetchImpl: options.fetchImpl, signal: AbortSignal.timeout(30_000) })
    await cancelJobReads(client, target)
    cacheJob(client, target, job)
    publish({ phase: "idle", acknowledged: true, message: job.status === "FAILED" ? "failedAgain" : undefined })
  } catch (error) {
    const uncertain = !(error instanceof IngestionRetryError) || error.uncertain
    // Conflicts and ambiguous transport results are READ, never repeated automatically.
    if (uncertain || error instanceof IngestionRetryError && error.code === "JOB_RETRY_NOT_ALLOWED") {
      const unresolved: IngestionRetryState = { phase: uncertain ? "uncertain" : "error", baseline: current,
        acknowledged: before.acknowledged, message: uncertain ? "unconfirmed" : "notAllowed" }
      publish({ ...unresolved, phase: "checking" })
      try {
        const actual = await fetchIngestionJob(target, { fetchImpl: options.fetchImpl, signal: AbortSignal.timeout(30_000) })
        await cancelJobReads(client, target)
        cacheJob(client, target, actual)
        publish(reconciledState(unresolved, actual))
      } catch (readError) { publish({ ...unresolved, message: readErrorMessage(readError) }) }
    } else {
      publish({ ...before, phase: "error", message: error.code === "JOB_NOT_FOUND" ? "notFound"
        : error.code === "ACCESS_DENIED" ? "accessDenied" : "notAllowed" })
    }
  }
  void refreshIngestionImages(client, target.caseId)
}

function reconciledState(before: IngestionRetryState, job: IngestionJob): IngestionRetryState {
  if (job.status !== "FAILED") return { phase: "idle", acknowledged: true }
  if (before.phase === "uncertain" && before.baseline && jobVersion(job) === jobVersion(before.baseline)) {
    return { ...before, phase: "uncertain", message: "unconfirmed" }
  }
  return { phase: "idle", acknowledged: before.acknowledged || Boolean(before.baseline),
    message: before.baseline && jobVersion(job) !== jobVersion(before.baseline) ? "failedAgain" : undefined }
}

function jobVersion(job: IngestionJob): string {
  return `${job.status}:${job.attempts}:${job.updatedAt}:${job.startedAt}:${job.finishedAt}`
}

function readErrorMessage(error: unknown): RetryMessage {
  return error instanceof ImageReadError && error.code === "JOB_NOT_FOUND" ? "notFound"
    : error instanceof ImageReadError && error.code === "ACCESS_DENIED" ? "accessDenied" : "unavailable"
}

async function cancelJobReads(client: QueryClient, identity: IngestionJobIdentity): Promise<void> {
  await Promise.all([
    client.cancelQueries({ queryKey: casesQueryKeys.ingestionJob(identity.caseId, identity.jobId), exact: true }),
    client.cancelQueries({ queryKey: casesQueryKeys.imageIngestionJob(identity.caseId, identity.imageId), exact: true }),
  ])
}

function cacheJob(client: QueryClient, identity: IngestionJobIdentity, job: IngestionJob): void {
  client.setQueryData(casesQueryKeys.ingestionJob(identity.caseId, identity.jobId), job)
  client.setQueryData(casesQueryKeys.imageIngestionJob(identity.caseId, identity.imageId), job)
}

export { canRetryIngestion, IDLE_RETRY_STATE, observeRetriedJob, requestIngestionRetry }
export type { IngestionRetryState }
