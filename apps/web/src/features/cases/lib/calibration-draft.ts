import type { QueryClient } from "@tanstack/react-query"

import { casesQueryKeys as keys } from "../hooks/cases-query-keys"
import type { ImagePlan } from "../schemas/image-plan.schema"
import { editorHasChanges, type CalibrationEditor } from "./calibration-editor"

// This cache belongs to the organization's QueryClient. It is intentionally
// memory-only: invalid field text and exact units survive a workspace remount,
// but never cross an organization change, logout or browser reload.
function hasCalibrationDraft(client: QueryClient, caseId: string, imageId?: string): boolean {
  return client.getQueryCache().findAll({ queryKey: ["cases", "image-calibration-draft", caseId] }).some(query => {
    if (imageId && query.queryKey[3] !== imageId) return false
    const editor = query.state.data as CalibrationEditor | null | undefined
    if (!editor) return false
    const plan = client.getQueryData<ImagePlan>(keys.imagePlan(caseId, String(query.queryKey[3])))
    return !plan || editorHasChanges(editor, plan)
  })
}

export { hasCalibrationDraft }
