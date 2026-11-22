"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useSyncExternalStore } from "react"

import { hasOtherImagePlanDraft, type PlanDraftOwner } from "../lib/image-plan-draft"

function useOtherImagePlanDraft(caseId: string, imageId: string, owner: PlanDraftOwner) {
  const client = useQueryClient()
  const subscribe = useCallback((notify: () => void) => client.getQueryCache().subscribe(event => {
    const [scope, kind, queryCase, queryImage] = event.query.queryKey
    if (scope === "cases" && queryCase === caseId && queryImage === imageId
      && ["image-calibration-draft", "image-quality-draft", "image-distance-draft", "image-angle-draft", "image-circle-draft", "image-landmarks-draft", "image-tplo-draft", "image-plan-save", "image-plan"].includes(String(kind))) notify()
  }), [client, caseId, imageId])
  const snapshot = useCallback(() => hasOtherImagePlanDraft(client, caseId, imageId, owner), [client, caseId, imageId, owner])
  return useSyncExternalStore(subscribe, snapshot, () => false)
}

export { useOtherImagePlanDraft }
