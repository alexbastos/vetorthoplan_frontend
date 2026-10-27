"use client"

import { FileWarning, RefreshCw } from "lucide-react"
import { useTranslations } from "next-intl"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"

import type { CaseImagePreviewState } from "../hooks/use-case-image-preview"
import { ImagePreviewError } from "../services/image-preview-api"
import type { CaseImage } from "../types/case-image"
import type { CalibrationMarker } from "../types/case-workspace"
import { DEFAULT_IMAGE_DISPLAY, type ImageDisplaySettings } from "../hooks/use-image-display-settings"
import { CaseImageViewer, type ViewerTool } from "./case-image-viewer"

type CalibrationView = { marker: CalibrationMarker | null; markerKind: CalibrationMarker["kind"]; tool: ViewerTool;
  editable: boolean; onMarkerChange: (marker: CalibrationMarker) => void; onToolChange: (tool: ViewerTool) => void }

function CasePreviewPanel({ image, preview, calibration, display = DEFAULT_IMAGE_DISPLAY, interactionNotice }: { image: CaseImage; preview: CaseImagePreviewState; calibration: CalibrationView; display?: ImageDisplaySettings; interactionNotice?: ReactNode }) {
  const t = useTranslations("cases.workspace.preview")
  const { eligible, query, displayFailed, refresh } = preview

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
      brightness={display.brightness}
      contrast={display.contrast}
      inverted={display.inverted}
      mirrored={display.mirrored}
      interactionNotice={interactionNotice}
      coordinateSpace="image-edges"
      marker={calibration.marker}
      markerKind={calibration.markerKind}
      name={image.displayName ?? image.originalFilename}
      onImageError={preview.onImageError}
      onImageLoad={preview.onImageLoad}
      onMarkerChange={calibration.onMarkerChange}
      onToolChange={calibration.onToolChange}
      readOnly={!calibration.editable}
      rendering={{
        url: query.data.url,
        // Restore the original aspect ratio even when the thumbnail dimensions
        // were rounded. Overlay coordinates always belong to the original matrix.
        widthPx: image.widthPx ?? query.data.widthPx,
        heightPx: image.heightPx ?? query.data.heightPx,
      }}
      tool={calibration.tool}
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
