import type { QueryClient } from "@tanstack/react-query"

import { casesQueryKeys } from "../hooks/cases-query-keys"
import { fetchImageIngestionJob, fetchIngestionJob } from "../services/image-read-api"
import type { IngestionJob } from "../types/ingestion-job"
import type { CaseIngestionTarget } from "./case-ingestion"
import { ingestionJobPollInterval } from "./ingestion-job-polling"

function imageIngestionQueryOptions(target: CaseIngestionTarget, fetchImpl?: typeof fetch) {
  return {
    queryKey: casesQueryKeys.imageIngestionJob(target.caseId, target.imageId),
    queryFn: ({ signal }: { signal: AbortSignal }) => fetchImageIngestionJob(target, { signal, fetchImpl }),
    retry: false as const, staleTime: Infinity,
    refetchInterval: false as const, refetchOnMount: false as const, refetchOnWindowFocus: false as const,
    refetchOnReconnect: false as const,
  }
}

function ingestionJobQueryOptions(target: CaseIngestionTarget & { jobId: string }, options: {
  initialData?: IngestionJob; initialDataUpdatedAt?: number; fetchImpl?: typeof fetch
  retryAcknowledged?: boolean; onJobRead?: (job: IngestionJob) => void
} = {}) {
  return {
    queryKey: casesQueryKeys.ingestionJob(target.caseId, target.jobId),
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      const job = await fetchIngestionJob(target, { signal, fetchImpl: options.fetchImpl })
      if (!signal.aborted) options.onJobRead?.(job)
      return job
    },
    initialData: options.initialData, initialDataUpdatedAt: options.initialDataUpdatedAt,
    retry: false as const, staleTime: target.imageStatus === "FAILED" ? 0 : 2_000, refetchOnWindowFocus: false as const, refetchOnReconnect: false as const,
    refetchInterval: (query: { state: { data?: { status: string }; error: unknown } }) =>
      ingestionJobPollInterval(query.state.data?.status, Boolean(query.state.error), target.imageStatus, options.retryAcknowledged),
  }
}

async function refreshIngestionImages(client: QueryClient, caseId: string): Promise<void> {
  const filter = { queryKey: casesQueryKeys.images(caseId) }
  await client.cancelQueries(filter)
  await client.invalidateQueries(filter)
}

export { imageIngestionQueryOptions, ingestionJobQueryOptions, refreshIngestionImages }
