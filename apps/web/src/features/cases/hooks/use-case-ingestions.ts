"use client"

import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"

import { caseIngestionTargets, matchesIngestionIdentity, terminalIngestionRefreshKey, uniqueIngestionJobs, type CaseIngestionEntry } from "../lib/case-ingestion"
import { isTerminalCaseImageStatus } from "../lib/case-image-state"
import { imageIngestionQueryOptions, ingestionJobQueryOptions, refreshIngestionImages } from "../lib/ingestion-query-options"
import { canRetryIngestion, IDLE_RETRY_STATE, observeRetriedJob, requestIngestionRetry, type IngestionRetryState } from "../lib/ingestion-job-retry"
import { ImageReadError } from "../services/image-read-api"
import type { IngestionReference } from "../types/ingestion-reference"
import { casesQueryKeys } from "./cases-query-keys"
import { useCaseImages } from "./use-case-images"

function useCaseIngestions(caseId: string, enabled = true) {
  const client = useQueryClient()
  const imagesQuery = useCaseImages(caseId, enabled)
  const remembered = useQuery<IngestionReference[]>({
    queryKey: casesQueryKeys.activeIngestions(caseId), queryFn: async () => [], enabled: false,
  })
  const targets = caseIngestionTargets(caseId, imagesQuery.data ?? [], remembered.data ?? [])
  const lookupTargets = targets.filter((target) => target.jobId === null)
  const lookups = useQueries({ queries: lookupTargets.map((target) => ({ ...imageIngestionQueryOptions(target), enabled })) })
  const discoveries = new Map(lookupTargets.map((target, index) => [target.imageId, lookups[index]]))
  const resolved = targets.map((target) => ({ ...target,
    jobId: target.jobId ?? discoveries.get(target.imageId)?.data?.id ?? null,
  }))
  const jobTargets = uniqueIngestionJobs(resolved)
  const retryStates = useQueries({ queries: jobTargets.map((target) => ({
    queryKey: casesQueryKeys.ingestionRetry(caseId, target.jobId), queryFn: async () => IDLE_RETRY_STATE,
    enabled: false, initialData: IDLE_RETRY_STATE,
  })) })
  const retryByJob = new Map(jobTargets.map((target, index) => [target.jobId.toLowerCase(), retryStates[index].data as IngestionRetryState]))
  const jobs = useQueries({ queries: jobTargets.map((target) => {
    const discovery = discoveries.get(target.imageId)
    const retry = retryByJob.get(target.jobId.toLowerCase())
    return { ...ingestionJobQueryOptions(target, { initialData: discovery?.data ?? undefined,
      initialDataUpdatedAt: discovery?.dataUpdatedAt, retryAcknowledged: retry?.acknowledged,
      onJobRead: target.imageStatus === "FAILED" ? (job) => observeRetriedJob(client, target, job) : undefined,
    }), enabled: enabled && retry?.phase !== "checking" && retry?.phase !== "requesting" && retry?.phase !== "uncertain" }
  }) })
  const byJob = new Map(jobTargets.map((target, index) => [target.jobId.toLowerCase(), jobs[index]]))
  const entries: CaseIngestionEntry[] = resolved.map((target) => {
    const query = target.jobId ? byJob.get(target.jobId.toLowerCase()) : discoveries.get(target.imageId)
    const job = query?.data
    const mismatch = job && !matchesIngestionIdentity(job, target)
    const retry = target.jobId ? retryByJob.get(target.jobId.toLowerCase()) : undefined
    return { ...target, job: mismatch ? undefined : job,
      error: mismatch ? new ImageReadError("INVALID_RESPONSE", false) : query?.error,
      isPending: Boolean(enabled && query?.isPending),
      retryState: retry, retryAcknowledged: retry?.acknowledged,
    }
  })
  const refreshed = useRef(new Set<string>())
  useEffect(() => {
    if (!enabled) return
    let refreshImages = false
    for (const entry of entries) {
      const key = terminalIngestionRefreshKey(entry)
      if (!key || refreshed.current.has(key)) continue
      refreshed.current.add(key)
      refreshImages = true
    }
    if (refreshImages) void refreshIngestionImages(client, caseId)
  }, [caseId, client, enabled, entries])

  const missing = (entry: CaseIngestionEntry) => entry.error instanceof ImageReadError
    && (entry.error.code === "JOB_NOT_FOUND" || entry.error.code === "IMAGE_NOT_FOUND")
  const terminal = (entry: CaseIngestionEntry) => isTerminalCaseImageStatus(entry.imageStatus)
    && !(entry.imageStatus === "FAILED" && entry.retryAcknowledged)
  const jobActive = enabled && entries.some((entry) => !entry.error && entry.job !== null && !terminal(entry)
    && (entry.job?.status === "QUEUED" || entry.job?.status === "PROCESSING"
      || entry.isPending && (entry.imageStatus === "QUARANTINED" || entry.imageStatus === "PROCESSING"
        || entry.reportedJobStatus === "QUEUED" || entry.reportedJobStatus === "PROCESSING")))
  async function refresh() {
    await Promise.all([imagesQuery.refetch({ cancelRefetch: false }),
      ...lookups.filter((query) => !query.data).map((query) => query.refetch({ cancelRefetch: false })),
      ...jobs.map((query, index) => {
        const target = jobTargets[index]
        const retry = retryByJob.get(target.jobId.toLowerCase())
        return retry?.phase === "uncertain" || retry?.phase === "error"
          ? requestIngestionRetry(client, target, { checkOnly: true }) : query.refetch({ cancelRefetch: false })
      }),
    ])
  }
  function retryForImage(imageId: string): Promise<void> {
    const entry = entries.find((candidate) => candidate.imageId === imageId)
    if (!entry?.jobId || !canRetryIngestion(entry)) return Promise.resolve()
    return requestIngestionRetry(client, { ...entry, jobId: entry.jobId })
  }

  return {
    imagesQuery, entries, jobActive, refresh, retryForImage,
    hasMissingJob: entries.some(missing),
    hasUnscheduledJob: entries.some((entry) => entry.job === null),
    hasReadError: entries.some((entry) => Boolean(entry.error) && !missing(entry)),
    hasFailedJob: entries.some((entry) => entry.job?.status === "FAILED" || entry.imageStatus === "FAILED" && !entry.retryAcknowledged),
    needsImageRefresh: entries.some((entry) => entry.job?.status === "SUCCEEDED" && !terminal(entry)),
    isRefreshing: imagesQuery.isFetching || lookups.some((query) => query.isFetching) || jobs.some((query) => query.isFetching)
      || retryStates.some((query) => query.data.phase === "checking" || query.data.phase === "requesting"),
  }
}

type CaseIngestionMonitor = ReturnType<typeof useCaseIngestions>
export { useCaseIngestions }
export type { CaseIngestionMonitor }
