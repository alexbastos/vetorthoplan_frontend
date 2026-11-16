import type { QueryClient } from "@tanstack/react-query"

import { casesQueryKeys as keys } from "../hooks/cases-query-keys"
import type { ImagePlan } from "../schemas/image-plan.schema"
import { landmarksEditorHasChanges, type LandmarksEditor } from "./landmarks-editor"

function hasLandmarksDraft(client: QueryClient, caseId: string, imageId?: string): boolean {
  return client.getQueryCache().findAll({ queryKey: ["cases", "image-landmarks-draft", caseId] }).some(query => {
    if (imageId && query.queryKey[3] !== imageId) return false
    const editor = query.state.data as LandmarksEditor | null | undefined
    return Boolean(editor && landmarksEditorHasChanges(editor, client.getQueryData<ImagePlan>(keys.imagePlan(caseId, String(query.queryKey[3])))))
  })
}

export { hasLandmarksDraft }
