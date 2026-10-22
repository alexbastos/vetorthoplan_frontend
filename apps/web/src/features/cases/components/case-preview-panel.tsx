"use client"

import { FileWarning, RefreshCw } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"

import { useImagePreview } from "../hooks/use-image-preview"
import { canPreviewCaseImage } from "../lib/case-image-state"
import { ImagePreviewError } from "../services/image-preview-api"
import type { CaseImage } from "../types/case-image"
import { CaseImageViewer } from "./case-image-viewer"

function CasePreviewPanel({ image }: { image: CaseImage }) {
  const t = useTranslations("cases.workspace.preview")
  const eligible = canPreviewCaseImage(image)
  const query = useImagePreview(image.caseId, image.id, eligible)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const renewalAttempted = useRef(false)
  const url = query.data?.url
  const displayFailed = Boolean(url && failedUrl === url)

  function refresh() {
    renewalAttempted.current = false
    setFailedUrl(null)
    void query.refetch()
  }

  function handleImageError() {
    if (!url) return
    setFailedUrl(url)
    if (!renewalAttempted.current) {
      renewalAttempted.current = true
      void query.refetch()
    }
  }

  if (!eligible) return <PreviewMessage title={t("unavailable")} description={t("unavailableDescription")} />
  if (query.isPending) {
    return <PreviewMessage title={t("loading")} description={t("loadingDescription")} />
  }
  if (query.isError || displayFailed) {
    const unavailable = query.error instanceof ImagePreviewError && query.error.code === "PREVIEW_UNAVAILABLE"
    return <PreviewMessage
      title={t(unavailable ? "unavailable" : "error")}
      description={t(unavailable ? "unavailableDescription" : "errorDescription")}
      onRetry={refresh}
      retryLabel={t("refresh")}
    />
  }
  if (!query.data) return null
  return (
    <CaseImageViewer
      brightness={100}
      contrast={100}
      inverted={false}
      marker={null}
      markerKind="line"
      name={image.originalFilename}
      onImageError={handleImageError}
      onMarkerChange={() => undefined}
      onToolChange={() => undefined}
      readOnly
      rendering={{
        url: query.data.url,
        widthPx: query.data.widthPx,
        heightPx: query.data.heightPx,
      }}
      tool="pan"
    />
  )
}

function PreviewMessage({ title, description, onRetry, retryLabel }: {
  title: string; description: string; onRetry?: () => void; retryLabel?: string
}) {
  return (
    <section className="order-2 flex min-h-[28rem] items-center justify-center overflow-hidden rounded-[var(--radius-token-md)] border border-border bg-[var(--case-viewer-shell)] px-6 text-center text-white lg:col-start-2 lg:row-start-1 lg:min-h-0 lg:order-none" role="status">
      <div className="max-w-sm">
        <FileWarning aria-hidden="true" className="mx-auto size-9 text-white/45" />
        <h2 className="mt-4 text-base font-semibold">{title}</h2>
        <p className="mt-2 text-[13px] leading-5 text-white/60">{description}</p>
        {onRetry ? (
          <Button className="mt-4" onClick={onRetry} size="sm" type="button" variant="secondary">
            <RefreshCw aria-hidden="true" />{retryLabel}
          </Button>
        ) : null}
      </div>
    </section>
  )
}

export { CasePreviewPanel }
