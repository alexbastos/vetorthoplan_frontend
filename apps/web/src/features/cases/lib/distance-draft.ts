import type { QueryClient } from "@tanstack/react-query"

import { casesQueryKeys as keys } from "../hooks/cases-query-keys"
import type { ImagePlan } from "../schemas/image-plan.schema"
import { distanceEditorHasChanges, type DistanceEditor } from "./distance-editor"

function hasDistanceDraft(client: QueryClient, caseId: string, imageId?: string): boolean {
  return client.getQueryCache().findAll({ queryKey: ["cases", "image-distance-draft", caseId] }).some(query => {
    if (imageId && query.queryKey[3] !== imageId) return false
    const editor = query.state.data as DistanceEditor | null | undefined
    return Boolean(editor && distanceEditorHasChanges(editor, client.getQueryData<ImagePlan>(keys.imagePlan(caseId, String(query.queryKey[3])))))
  })
}

export { hasDistanceDraft }
