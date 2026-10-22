import type { CaseImage } from "../types/case-image"
import type { ImageIngestionIdentity, IngestionReference } from "../types/ingestion-reference"
import type { IngestionJob } from "../types/ingestion-job"
import { isTerminalCaseImageStatus } from "./case-image-state"
import type { IngestionRetryState } from "./ingestion-job-retry"

type CaseIngestionTarget = ImageIngestionIdentity & {
  jobId: string | null
  imageStatus?: CaseImage["status"]
  reportedJobStatus?: IngestionJob["status"]
}
type CaseIngestionEntry = CaseIngestionTarget & {
  job: IngestionJob | null | undefined
  error: unknown
  isPending: boolean
  retryAcknowledged?: boolean
  retryState?: IngestionRetryState
}

function caseIngestionTargets(caseId: string, images: readonly CaseImage[], remembered: readonly IngestionReference[]): CaseIngestionTarget[] {
  const confirmations = new Map(remembered.filter((item) => sameId(item.caseId, caseId))
    .map((item) => [item.imageId.toLowerCase(), item]))
  const targets = new Map<string, CaseIngestionTarget>()
  const persisted = new Set<string>()
  for (const image of images) {
    if (!sameId(image.caseId, caseId)) continue
    const id = image.id.toLowerCase()
    persisted.add(id)
    if (isTerminalCaseImageStatus(image.status) && image.status !== "FAILED") continue
    const candidate = confirmations.get(id)
    const confirmation = candidate && sameId(candidate.uploadId, image.uploadId) ? candidate : undefined
    const jobId = image.jobId ?? confirmation?.jobId ?? null
    if (image.status === "PENDING_UPLOAD" && jobId === null) continue
    targets.set(id, {
      caseId, imageId: image.id, uploadId: image.uploadId, jobId, imageStatus: image.status,
      reportedJobStatus: confirmation && jobId && sameId(confirmation.jobId, jobId) ? confirmation.jobStatus : undefined,
    })
  }
  for (const confirmation of confirmations.values()) {
    const id = confirmation.imageId.toLowerCase()
    if (!persisted.has(id)) targets.set(id, { ...confirmation, caseId, reportedJobStatus: confirmation.jobStatus })
  }
  return [...targets.values()]
}

function uniqueIngestionJobs(targets: readonly CaseIngestionTarget[]) {
  const jobs = new Map<string, CaseIngestionTarget & { jobId: string }>()
  for (const target of targets) {
    if (target.jobId && !jobs.has(target.jobId.toLowerCase())) {
      jobs.set(target.jobId.toLowerCase(), { ...target, jobId: target.jobId })
    }
  }
  return [...jobs.values()]
}

function matchesIngestionIdentity(job: IngestionJob, target: CaseIngestionTarget): boolean {
  return sameId(job.caseId, target.caseId) && sameId(job.imageId, target.imageId)
    && sameId(job.uploadId, target.uploadId) && (!target.jobId || sameId(job.id, target.jobId))
}

function terminalIngestionRefreshKey(entry: CaseIngestionEntry): string | null {
  const job = entry.job
  if (!job || entry.error || isTerminalCaseImageStatus(entry.imageStatus) && !(entry.imageStatus === "FAILED" && entry.retryAcknowledged)
    || (job.status !== "SUCCEEDED" && job.status !== "REJECTED" && job.status !== "FAILED")) return null
  return `${job.caseId}:${job.id}:${job.status}:${job.attempts}:${job.finishedAt ?? job.updatedAt}`
}

function sameId(a: string, b: string): boolean { return a.toLowerCase() === b.toLowerCase() }

export { caseIngestionTargets, matchesIngestionIdentity, terminalIngestionRefreshKey, uniqueIngestionJobs }
export type { CaseIngestionEntry, CaseIngestionTarget }
