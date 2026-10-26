"use client"

import { useRef, useState } from "react"

import { canPreviewCaseImage } from "../lib/case-image-state"
import type { CaseImage } from "../types/case-image"
import { useImagePreview } from "./use-image-preview"

function useCaseImagePreview(image: CaseImage) {
  const eligible = canPreviewCaseImage(image)
  const query = useImagePreview(image.caseId, image.id, eligible)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const renewalAttempted = useRef(false)
  const url = query.data?.url
  const displayFailed = Boolean(url && failedUrl === url)

  function refresh() {
    renewalAttempted.current = false
    setFailedUrl(null)
    setLoadedUrl(null)
    void query.refetch()
  }
  function onImageError() {
    if (!url) return
    setFailedUrl(url)
    setLoadedUrl(null)
    if (!renewalAttempted.current) {
      renewalAttempted.current = true
      void query.refetch()
    }
  }
  return { query, eligible, displayFailed, refresh, onImageError,
    onImageLoad: () => { if (url) { setLoadedUrl(url); setFailedUrl(null) } },
    ready: eligible && !query.isError && !displayFailed && Boolean(url && loadedUrl === url),
  }
}

export { useCaseImagePreview }
export type CaseImagePreviewState = ReturnType<typeof useCaseImagePreview>
