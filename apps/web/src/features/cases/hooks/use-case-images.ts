"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"

import { fetchCaseImages, ImageReadError } from "../services/image-read-api"
import { casesQueryKeys } from "./cases-query-keys"

function useCaseImages(caseId: string, enabled = true) {
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
    refetchOnWindowFocus: false,
  })
}

export { useCaseImages }
