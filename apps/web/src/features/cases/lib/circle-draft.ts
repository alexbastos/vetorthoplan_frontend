import type { QueryClient } from "@tanstack/react-query"

import { casesQueryKeys as keys } from "../hooks/cases-query-keys"
import type { ImagePlan } from "../schemas/image-plan.schema"
import { circleEditorHasChanges, type CircleEditor } from "./circle-editor"

function hasCircleDraft(client: QueryClient, caseId: string, imageId?: string): boolean {
  return client.getQueryCache().findAll({ queryKey: ["cases", "image-circle-draft", caseId] }).some(query => {
    if (imageId && query.queryKey[3] !== imageId) return false
    const editor = query.state.data as CircleEditor | null | undefined
    return Boolean(editor && circleEditorHasChanges(editor, client.getQueryData<ImagePlan>(keys.imagePlan(caseId, String(query.queryKey[3])))))
  })
}

export { hasCircleDraft }
