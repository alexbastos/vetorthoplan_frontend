"use client"

import { RotateCcw } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"

import { useUnsavedChangesGuard } from "@/components/shared/app-shell/unsaved-changes-guard"
import { useCaseImagePreview } from "../hooks/use-case-image-preview"
import { useImageCalibration } from "../hooks/use-image-calibration"
import type { CaseImage } from "../types/case-image"
import { CaseImageCalibrationPanel } from "./case-image-calibration-panel"
import { CasePreviewPanel } from "./case-preview-panel"
import { CaseWorkspacePanel, type WorkspacePanelSection } from "./case-workspace-panel"
import type { ViewerTool } from "./case-image-viewer"

function CaseImageWorkspace({ image, activeSection, onSectionChange, caseContext, imageList, imageActions, caseLocked }: {
  image: CaseImage; activeSection: WorkspacePanelSection; onSectionChange: (section: WorkspacePanelSection) => void;
  caseContext: ReactNode; imageList: ReactNode; imageActions: ReactNode; caseLocked: boolean
}) {
  const t = useTranslations("cases.workspace.calibration")
  const preview = useCaseImagePreview(image)
  const calibration = useImageCalibration(image, preview.ready, caseLocked)
  const { registerUnsavedChangesHandler } = useUnsavedChangesGuard()
  const [tool, setTool] = useState<ViewerTool>("pan")
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  useEffect(() => registerUnsavedChangesHandler({
    discardChanges: calibration.discard,
    hasUnsavedChanges: () => calibration.hasChanges,
    getUnsavedChanges: () => [{ field: "calibration", label: t("title"),
      previousValue: calibration.plan?.document.calibration ? t("savedScale") : "",
      value: calibration.editor?.reference ? `${calibration.editor.reference} ${calibration.editor.unit}` : t("unsavedMarker") }],
  }), [calibration.discard, calibration.hasChanges, calibration.plan, calibration.editor, registerUnsavedChangesHandler, t])
  useEffect(() => {
    if (!calibration.hasChanges && !calibration.locked) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [calibration.hasChanges, calibration.locked])

  async function save() {
    const input = calibration.command()
    if (!input) return
    let result
    try { result = await calibration.save.mutateAsync({ input }) }
    catch { if (mounted.current) toast.error(t("saveError")); return }
    if (!mounted.current) return
    if (result.phase === "saved") { setTool("pan"); toast.success(t("saved")) }
    else if (result.phase === "conflict") toast.error(t("remote.conflict"))
    else if (result.phase === "uncertain") toast.error(t("remote.uncertain"))
    else toast.error(t("saveError"))
  }
  function selectSection(section: WorkspacePanelSection) {
    onSectionChange(section)
    setTool(section === "calibration" ? "mark" : "pan")
  }
  const editing = activeSection === "calibration" && calibration.canEdit
  const conflict = calibration.receipt.phase === "conflict" || calibration.needsRebase
  const discardLabel = t(conflict ? "remote.loadSaved" : "reset")
  return <>
    <CaseWorkspacePanel activeSection={activeSection} calibrationAvailable={preview.ready && !calibration.issue && !caseLocked && !calibration.deleting}
      calibrationUnavailableReason={t(calibration.issue === "anisotropy" ? "remote.anisotropy" : calibration.issue === "dimensions" ? "remote.dimensions" : "notReady")}
      calibrationActions={<button aria-label={discardLabel}
        className="motion-interactive flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-token-md)] text-content-secondary outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
        disabled={(!calibration.hasChanges && !conflict) || calibration.locked || calibration.deleting}
        onClick={() => { calibration.discard(); setTool("pan") }} title={discardLabel} type="button">
        <RotateCcw aria-hidden="true" className="size-4" strokeWidth={1.5} />
      </button>}
      caseContext={caseContext} imageList={imageList} imageActions={imageActions} onSectionChange={selectSection}>
      <CaseImageCalibrationPanel calibration={calibration} onSave={() => void save()} onPlace={() => {
        calibration.placeMarker(); setTool("mark")
        requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-calibration-viewport]")?.focus({ preventScroll: true }))
      }} />
    </CaseWorkspacePanel>
    <CasePreviewPanel image={image} preview={preview} calibration={{
      editable: editing, marker: activeSection === "calibration" ? calibration.marker : calibration.savedMarker,
      markerKind: calibration.editor?.kind ?? "line", tool, onMarkerChange: calibration.changeMarker, onToolChange: setTool,
    }} />
  </>
}

export { CaseImageWorkspace }
