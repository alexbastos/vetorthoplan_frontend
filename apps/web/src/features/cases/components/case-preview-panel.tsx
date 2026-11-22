"use client"

import { FileWarning, RefreshCw } from "lucide-react"
import { useTranslations } from "next-intl"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"

import type { CaseImagePreviewState } from "../hooks/use-case-image-preview"
import { ImagePreviewError } from "../services/image-preview-api"
import type { CaseImage } from "../types/case-image"
import type { ViewerEditor, ViewerOverlayView } from "../lib/viewer-editor"
import type { ViewerTploSimulation } from "../lib/tplo-preview"
import { DEFAULT_IMAGE_DISPLAY, type ImageDisplaySettings } from "../hooks/use-image-display-settings"
import { CaseImageViewer } from "./case-image-viewer"
import { ViewerEditorControls, type ViewerContextControls } from "./viewer-toolbar"

function CasePreviewPanel({ image, preview, editor, interactionContext, renderOverlay, simulation, display = DEFAULT_IMAGE_DISPLAY, interactionNotice, editorControls, contextControls }: { image: CaseImage; preview: CaseImagePreviewState; editor: ViewerEditor; interactionContext?: object; renderOverlay?: (view: ViewerOverlayView) => ReactNode; simulation?: ViewerTploSimulation | null; display?: ImageDisplaySettings; interactionNotice?: ReactNode; editorControls?: ReactNode; contextControls?: ViewerContextControls }) {
  const t = useTranslations("cases.workspace.preview")
  const { eligible, query, displayFailed, refresh } = preview

  if (!eligible) return <PreviewMessage title={t("unavailable")} description={t("unavailableDescription")} editorControls={editorControls} contextControls={contextControls} />
  if (query.isPending) {
    return <PreviewMessage title={t("loading")} description={t("loadingDescription")} editorControls={editorControls} contextControls={contextControls} />
  }
  if (query.isError && !preview.textureFallback || displayFailed) {
    const unavailable = query.error instanceof ImagePreviewError && query.error.code === "PREVIEW_UNAVAILABLE"
    return <PreviewMessage
      title={t(unavailable ? "unavailable" : "error")}
      description={t(unavailable ? "unavailableDescription" : "errorDescription")}
      onRetry={refresh}
      retryLabel={t("refresh")}
      editorControls={editorControls}
      contextControls={contextControls}
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
      editorControls={editorControls}
      contextControls={contextControls}
      coordinateSpace="image-edges"
      editor={editor}
      interactionContext={interactionContext}
      interactionKey={JSON.stringify([image.caseId, image.id])}
      renderOverlay={renderOverlay}
      simulation={simulation} onTextureError={preview.onTextureError} onTextureRetry={preview.refreshTexture}
      name={image.displayName ?? image.originalFilename}
      onImageError={preview.onImageError}
      onImageLoad={preview.onImageLoad}
      rendering={{
        url: query.data.url,
        // Restore the original aspect ratio even when the thumbnail dimensions
        // were rounded. Overlay coordinates always belong to the original matrix.
        widthPx: image.widthPx ?? query.data.widthPx,
        heightPx: image.heightPx ?? query.data.heightPx,
      }}
    />
  )
}

function PreviewMessage({ title, description, onRetry, retryLabel, editorControls, contextControls }: {
  title: string; description: string; onRetry?: () => void; retryLabel?: string; editorControls?: ReactNode; contextControls?: ViewerContextControls
}) {
  return (
    <section data-image-viewer className={`relative order-2 flex min-h-[28rem] items-center justify-center overflow-hidden rounded-[var(--radius-token-md)] border border-border bg-[var(--case-viewer-shell)] px-6 text-center text-white lg:col-start-2 lg:row-start-1 lg:min-h-0 lg:order-none ${editorControls ? "pl-16" : ""}`}>
      <div className="max-w-sm" role="status">
        <FileWarning aria-hidden="true" className="mx-auto size-9 text-white/45" />
        <h2 className="mt-4 text-base font-semibold">{title}</h2>
        <p className="mt-2 text-[13px] leading-5 text-white/60">{description}</p>
        {onRetry ? (
          <Button className="mt-4" onClick={onRetry} size="sm" type="button" variant="secondary">
            <RefreshCw aria-hidden="true" />{retryLabel}
          </Button>
        ) : null}
      </div>
      {editorControls ? <ViewerEditorControls>{editorControls}</ViewerEditorControls> : null}
      {contextControls ? <div className="absolute right-3 bottom-3 z-30">{contextControls.content}</div> : null}
    </section>
  )
}

export { CasePreviewPanel }
