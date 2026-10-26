"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"

import { fetchCaseImages, ImageReadError } from "../services/image-read-api"
import type { IngestionReference } from "../types/ingestion-reference"
import type { IngestionJob } from "../types/ingestion-job"
import type { IngestionRetryState } from "../lib/ingestion-job-retry"
import { caseImagesPollInterval } from "../lib/ingestion-query-options"
import { casesQueryKeys } from "./cases-query-keys"

function useCaseImages(caseId: string, enabled = true, remembered: readonly IngestionReference[] = []) {
  const client = useQueryClient()
  const removed = useQuery<string[]>({ queryKey: casesQueryKeys.deletedImages(caseId), queryFn: async () => [], enabled: false, initialData: [], gcTime: Infinity })
  return useQuery({
    queryKey: casesQueryKeys.images(caseId),
    queryFn: async ({ signal }) => {
      const images = await fetchCaseImages(caseId, { signal })
      const deleted = client.getQueryData<string[]>(casesQueryKeys.deletedImages(caseId)) ?? []
      return images.filter(image => !deleted.includes(image.id))
    },
    select: images => images.filter(image => !removed.data.includes(image.id)),
    enabled: enabled && Boolean(caseId),
    retry: (count, error) => error instanceof ImageReadError && error.retryable && count < 1,
    refetchInterval: query => caseImagesPollInterval(caseId, query.state.data ?? [], remembered, Boolean(query.state.error), jobId => {
      const retry = client.getQueryData<IngestionRetryState>(casesQueryKeys.ingestionRetry(caseId, jobId))
      const job = client.getQueryData<IngestionJob>(casesQueryKeys.ingestionJob(caseId, jobId))
      return retry?.acknowledged === true && (job?.status === "QUEUED" || job?.status === "PROCESSING" || job?.status === "SUCCEEDED")
    }),
    refetchOnWindowFocus: false,
  })
}

export { useCaseImages }
