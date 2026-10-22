"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"

import { casesQueryKeys } from "../hooks/cases-query-keys"
import { IDLE_CANCELLATION, requestUploadCancellation } from "../lib/image-upload-cancellation"
import type { CaseImage } from "../types/case-image"

function CaseImageCancelAction({ image }: { image: CaseImage }) {
  const client = useQueryClient()
  const t = useTranslations("cases.uploadCancellation")
  const query = useQuery({ queryKey: casesQueryKeys.uploadCancellation(image.caseId, image.uploadId),
    queryFn: async () => IDLE_CANCELLATION, enabled: false, initialData: IDLE_CANCELLATION })
  if (image.status !== "PENDING_UPLOAD") return null
  const state = query.data
  const busy = state.phase === "cancelling" || state.phase === "checking"
  return <div className="mt-2 space-y-2">
    {state.message ? <p className="text-caption text-description" role={state.phase === "confirmed" ? "status" : "alert"}>{t(`messages.${state.message}`)}</p> : null}
    {state.phase === "cancelled" ? <p className="text-caption text-description" role="status">{t("cancelled")}</p> :
      <Button aria-busy={busy} disabled={busy || state.phase === "unavailable"} onClick={() => void requestUploadCancellation(client,
        { caseId: image.caseId, imageId: image.id, uploadId: image.uploadId })} size="sm" type="button" variant="secondary">
        {t(busy ? state.phase === "checking" ? "checking" : "cancelling" : state.phase === "uncertain" ? "check" : "action")}
      </Button>}
  </div>
}
export { CaseImageCancelAction }
