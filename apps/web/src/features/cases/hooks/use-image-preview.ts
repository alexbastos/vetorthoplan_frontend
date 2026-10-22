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
    refetchOnWindowFocus: true,
    refetchInterval: (query) => previewRefreshInterval(query.state.data?.expiresAt, Boolean(query.state.error)),
  })
}

export { useImagePreview }
