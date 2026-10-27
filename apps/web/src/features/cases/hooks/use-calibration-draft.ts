"use client"

import type { CalibrationEditor } from "../lib/calibration-editor"
import { useWorkspaceDraft } from "./use-workspace-draft"

function useCalibrationDraft(caseId: string, imageId: string) {
  return useWorkspaceDraft<CalibrationEditor>("image-calibration-draft", caseId, imageId)
}

export { useCalibrationDraft }
