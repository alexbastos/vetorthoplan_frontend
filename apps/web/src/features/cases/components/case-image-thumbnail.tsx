"use client"

import { useTranslations } from "next-intl"

import { useImagePreview } from "../hooks/use-image-preview"
import { canPreviewCaseImage } from "../lib/case-image-state"
import type { CaseImage } from "../types/case-image"
import { CasePreview } from "./case-card"

function CaseImageThumbnail({ image }: { image: CaseImage }) {
  const t = useTranslations("cases.workspace.preview")
  const eligible = canPreviewCaseImage(image)
  const query = useImagePreview(image.caseId, image.id, eligible)
  const url = eligible && !query.isError ? query.data?.url : undefined

  return (
    <CasePreview
      alt=""
      key={url ?? "unavailable"}
      label={t(eligible && query.isPending ? "loading" : "unavailable")}
      thumbnailUrl={url}
    />
  )
}

export { CaseImageThumbnail }
