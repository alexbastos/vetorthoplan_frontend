"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { FileWarning } from "lucide-react"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useState, type ReactNode } from "react"
import { toast } from "@/lib/notifications"

import { useUnsavedChangesGuard } from "@/components/shared/app-shell/unsaved-changes-guard"

import { calculateManualPixelSpacing } from "../lib/calculate-manual-calibration"
import { casesQueryKeys } from "../hooks/cases-query-keys"
import { CasesRepositoryError } from "../hooks/cases-repository-error"
import { casesRepository } from "../services/cases-repository"
import type { CalibrationMarker, CaseWorkspaceFile } from "../types/case-workspace"
import { CaseCalibrationPanel } from "./case-calibration-panel"
import { CaseImageViewer, type ViewerTool } from "./case-image-viewer"
import { CaseWorkspacePanel, type WorkspacePanelSection } from "./case-workspace-panel"

type WorkspaceImage = Extract<CaseWorkspaceFile, { kind: "image" }>

function CaseWorkspaceImage({ caseContext, caseId, image, imageList, imageActions }: { caseContext: ReactNode; caseId: string; image: WorkspaceImage; imageList: ReactNode; imageActions: ReactNode }) {
  const t = useTranslations("cases.workspace")
  const queryClient = useQueryClient()
  const { registerUnsavedChangesHandler } = useUnsavedChangesGuard()
  const [marker, setMarker] = useState<CalibrationMarker | null>(image.calibration?.marker ?? null)
  const [markerKind, setMarkerKind] = useState<CalibrationMarker["kind"]>(image.calibration?.marker.kind ?? "line")
  const [reference, setReference] = useState(image.calibration ? String(image.calibration.referenceSizeMm) : "")
  const [tool, setTool] = useState<ViewerTool>("pan")
  const [activeSection, setActiveSection] = useState<WorkspacePanelSection>("images")
  const referenceSizeMm = Number(reference.replace(",", "."))
  const scale = marker ? calculateManualPixelSpacing(image.rendering, marker, referenceSizeMm) : null
  const hasChanges = JSON.stringify(marker) !== JSON.stringify(image.calibration?.marker ?? null)
    || referenceSizeMm !== (image.calibration?.referenceSizeMm ?? 0)

  const save = useMutation({
    mutationFn: async () => {
      if (!marker || !scale) throw new CasesRepositoryError({ code: "VALIDATION_ERROR", retryable: false })
      const result = await casesRepository.saveImageCalibration({
        caseId,
        imageId: image.file.id,
        marker,
        referenceSizeMm,
        expectedRevision: image.calibration?.revision ?? null,
      })
      if (!result.ok) throw new CasesRepositoryError(result.error)
      return result.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: casesQueryKeys.all })
      toast.success(t("calibration.savedTitle"), { description: t("calibration.savedDescription") })
    },
    onError: (error) => {
      const code = error instanceof CasesRepositoryError ? error.code : undefined
      const key = code === "CALIBRATION_CONFLICT" ? "conflict"
        : code === "CALIBRATION_UNAVAILABLE" ? "unavailable" : "saveError"
      toast.error(t(`calibration.${key}Title`), { description: t(`calibration.${key}Description`) })
    },
  })

  function changeMarkerKind(kind: CalibrationMarker["kind"]) {
    setMarkerKind(kind)
    if (marker?.kind !== kind) setMarker(null)
    setTool("mark")
  }

  function changeSection(section: WorkspacePanelSection) {
    setActiveSection(section)
    setTool(section === "calibration" ? "mark" : "pan")
  }

  function changeViewerTool(nextTool: ViewerTool) {
    setTool(nextTool)
    if (nextTool === "mark") setActiveSection("calibration")
  }

  const discardChanges = useCallback(() => {
    setMarker(image.calibration?.marker ?? null)
    setMarkerKind(image.calibration?.marker.kind ?? "line")
    setReference(image.calibration ? String(image.calibration.referenceSizeMm) : "")
  }, [image.calibration])

  useEffect(() => registerUnsavedChangesHandler({
    discardChanges,
    hasUnsavedChanges: () => hasChanges,
    getUnsavedChanges: () => [{
      field: "calibration",
      label: t("calibration.title"),
      previousValue: image.calibration ? `${image.calibration.referenceSizeMm} mm` : "",
      value: reference ? `${reference} mm` : t("calibration.unsavedMarker"),
    }],
  }), [discardChanges, hasChanges, image.calibration, reference, registerUnsavedChangesHandler, t])

  useEffect(() => {
    if (!hasChanges) return
    function warn(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = "" }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [hasChanges])

  return (
    <>
      <CaseWorkspacePanel
        activeSection={activeSection}
        calibrationAvailable
        caseContext={caseContext}
        imageList={imageList}
        imageActions={imageActions}
        onSectionChange={changeSection}
      >
        <CaseCalibrationPanel
          hasChanges={hasChanges}
          image={image}
          isSaving={save.isPending}
          marker={marker}
          markerKind={markerKind}
          onMarkerKindChange={changeMarkerKind}
          onReferenceChange={setReference}
          onReset={discardChanges}
          onSave={() => void save.mutateAsync().catch(() => undefined)}
          reference={reference}
          scale={scale}
        />
      </CaseWorkspacePanel>
      {image.rendering.status === "ready" ? (
        <CaseImageViewer
          brightness={100}
          contrast={100}
          inverted={false}
          marker={marker}
          markerKind={markerKind}
          name={image.file.name}
          onMarkerChange={setMarker}
          onToolChange={changeViewerTool}
          rendering={image.rendering}
          tool={tool}
        />
      ) : (
        <section className="order-2 flex min-h-[28rem] items-center justify-center overflow-hidden rounded-[var(--radius-token-md)] border border-border bg-[var(--case-viewer-shell)] px-6 text-center text-white lg:col-start-2 lg:row-start-1 lg:min-h-0 lg:order-none">
          <div className="max-w-sm"><FileWarning aria-hidden="true" className="mx-auto size-9 text-white/45" /><h2 className="mt-4 text-base font-semibold">{t(image.rendering.status === "processing" ? "imageState.processingTitle" : "imageState.unavailableTitle")}</h2><p className="mt-2 text-[13px] leading-5 text-white/60">{t(image.rendering.status === "processing" ? "imageState.processingDescription" : image.rendering.reason === "renderer-unavailable" ? "imageState.dicomDescription" : "imageState.invalidDescription")}</p></div>
        </section>
      )}
    </>
  )
}

export { CaseWorkspaceImage }
