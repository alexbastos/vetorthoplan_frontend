"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"

import { canPreviewCaseImage } from "../lib/case-image-state"
import type { CaseImage } from "../types/case-image"
import { useImagePreview } from "./use-image-preview"

function useCaseImagePreview(image: CaseImage) {
  const client = useQueryClient()
  const eligible = canPreviewCaseImage(image)
  const query = useImagePreview(image.caseId, image.id, eligible)
  const url = query.data?.url
  const scope = useRef({ client, caseId: image.caseId, imageId: image.id, url, eligible })
  if (scope.current.client !== client || scope.current.caseId !== image.caseId || scope.current.imageId !== image.id || scope.current.url !== url || scope.current.eligible !== eligible)
    scope.current = { client, caseId: image.caseId, imageId: image.id, url, eligible }
  const owner = scope.current
  // A cached image may finish before passive effects run.
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const [state, setState] = useState<{ owner: typeof owner; loaded: boolean; failed: boolean; textureRecovery: boolean } | null>(null)
  const renewalAttempted = useRef<typeof owner | null>(null)
  const current = state?.owner === owner ? state : null
  const displayFailed = Boolean(current?.failed)

  function update(change: Partial<Omit<NonNullable<typeof state>, "owner">>) {
    if (!mounted.current || scope.current !== owner || !eligible) return false
    setState(previous => ({ ...(previous?.owner === owner ? previous : { owner, loaded: false, failed: false, textureRecovery: false }), ...change }))
    return true
  }

  function refresh() {
    if (!update({ failed: false, loaded: false, textureRecovery: false })) return
    renewalAttempted.current = null
    void query.refetch()
  }
  function onImageError() {
    if (!url || !update({ failed: true, loaded: false })) return
    if (renewalAttempted.current !== owner) {
      renewalAttempted.current = owner
      void query.refetch()
    }
  }
  const textureFallback = Boolean(current?.textureRecovery && !displayFailed && url && current.loaded)
  return { query, eligible, displayFailed, refresh, onImageError, textureFallback,
    onTextureError: () => { if (url) update({ textureRecovery: true }) },
    refreshTexture: () => { if (url && update({ textureRecovery: true })) void query.refetch() },
    // Base and texture load independently. A late base load must not forget a
    // texture failure for this URL; a new image/client/URL gets a fresh owner.
    onImageLoad: () => { if (url) update({ loaded: true, failed: false }) },
    ready: eligible && (!query.isError || textureFallback) && !displayFailed && Boolean(url && current?.loaded),
  }
}

export { useCaseImagePreview }
export type CaseImagePreviewState = ReturnType<typeof useCaseImagePreview>
