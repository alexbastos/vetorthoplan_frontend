import type { QueryClient } from "@tanstack/react-query"

import { casesQueryKeys as keys } from "../hooks/cases-query-keys"
import type { ImagePlan } from "../schemas/image-plan.schema"
import { angleEditorHasChanges, type AngleEditor } from "./angle-editor"

function hasAngleDraft(client: QueryClient, caseId: string, imageId?: string): boolean {
  return client.getQueryCache().findAll({ queryKey: ["cases", "image-angle-draft", caseId] }).some(query => {
    if (imageId && query.queryKey[3] !== imageId) return false
    const editor = query.state.data as AngleEditor | null | undefined
    return Boolean(editor && angleEditorHasChanges(editor, client.getQueryData<ImagePlan>(keys.imagePlan(caseId, String(query.queryKey[3])))))
  })
}

export { hasAngleDraft }
