"use client"

import { useQuery } from "@tanstack/react-query"

import { fetchImagePreview, previewRefreshInterval } from "../services/image-preview-api"
import { casesQueryKeys } from "./cases-query-keys"

function useImagePreview(caseId: string, imageId: string | null, enabled = true) {
  return useQuery({
    queryKey: casesQueryKeys.preview(caseId, imageId ?? ""),
    queryFn: ({ signal }) => fetchImagePreview(caseId, imageId!, { signal }),
    enabled: enabled && Boolean(caseId && imageId),
    retry: false,
    gcTime: 0,
    // A signed URL stays fresh until its renewal window. Returning to the tab
    // should not replace an already decoded image while that URL is valid.
    staleTime: (query) => query.state.data && !query.state.error
      ? Math.max(0, Date.parse(query.state.data.expiresAt) - query.state.dataUpdatedAt - 10_000) : 0,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => previewRefreshInterval(query.state.data?.expiresAt, Boolean(query.state.error)),
  })
}

export { useImagePreview }
