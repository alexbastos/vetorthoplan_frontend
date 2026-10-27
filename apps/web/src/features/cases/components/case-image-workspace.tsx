"use client"

import { RotateCcw } from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { toast } from "@/lib/notifications"

import { useUnsavedChangesGuard } from "@/components/shared/app-shell/unsaved-changes-guard"
import { useCaseImagePreview } from "../hooks/use-case-image-preview"
import { useImageCalibration } from "../hooks/use-image-calibration"
import { useImageDisplaySettings } from "../hooks/use-image-display-settings"
import { hasImagePlanDraft } from "../lib/image-quality-draft"
import { isCalibrationSaveLocked } from "../lib/calibration-save-state"
import type { CaseImage } from "../types/case-image"
import { CaseImageCalibrationPanel } from "./case-image-calibration-panel"
import { CaseImageOptionsPanel } from "./case-image-options-panel"
import { CaseImageToolsPanel } from "./case-image-tools-panel"
import { CalibrationIntroductionDialog } from "./calibration-introduction-dialog"
import { casesQueryKeys as keys } from "../hooks/cases-query-keys"
import { CasePreviewPanel } from "./case-preview-panel"
import { CaseWorkspacePanel, type WorkspacePanelSection } from "./case-workspace-panel"
import type { ViewerTool } from "./case-image-viewer"

function CaseImageWorkspace({ image, activeSection, onSectionChange, caseContext, imageList, imageActions, caseLocked }: {
  image: CaseImage; activeSection: WorkspacePanelSection; onSectionChange: (section: WorkspacePanelSection) => void;
  caseContext: ReactNode; imageList: ReactNode; imageActions: ReactNode; caseLocked: boolean
}) {
  const t = useTranslations("cases.workspace.calibration")
  const tImage = useTranslations("cases.workspace.image")
  const client = useQueryClient()
  const preview = useCaseImagePreview(image)
  const calibration = useImageCalibration(image, preview.ready, caseLocked)
  const display = useImageDisplaySettings(image.caseId, image.id)
  const discardCalibrationDraft = calibration.discard
  const { registerUnsavedChangesHandler } = useUnsavedChangesGuard()
  const [tool, setTool] = useState<ViewerTool>("pan")
  const [calibrationRequested, setCalibrationRequested] = useState(false)
  const [introductionRequested, setIntroductionRequested] = useState(false)
  const calibrationEditing = calibrationRequested || calibration.hasChanges
    || Boolean(calibration.receipt.draft && calibration.receipt.phase !== "idle" && calibration.receipt.phase !== "saved")
  const toolsAvailable = calibration.measurementEligible && !calibrationEditing
  // Guard the render immediately when changing image or losing a confirmed
  // scale; then synchronize the parent's selection so Tools cannot reopen itself.
  const panelSection = activeSection === "tools" && !toolsAvailable ? "calibration" : activeSection
  useEffect(() => {
    if (panelSection !== activeSection) onSectionChange(panelSection)
  }, [panelSection, activeSection, onSectionChange])
  const introductionConfirmed = useRef(false)
  const introductionKey = keys.imageCalibrationIntroduction(image.caseId, image.id)
  // Per-image guidance follows the organization's in-memory workspace session.
  const { data: introductionSeen } = useQuery({ queryKey: introductionKey, queryFn: async () => false,
    enabled: false, initialData: false, gcTime: Infinity })
  const mounted = useRef(true)
  const operationPending = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const discardCalibration = useCallback(() => {
    if (!discardCalibrationDraft()) return false
    setCalibrationRequested(false)
    setIntroductionRequested(false)
    setTool("pan")
    return true
  }, [discardCalibrationDraft])

  useEffect(() => registerUnsavedChangesHandler({
    discardChanges: discardCalibration,
    hasUnsavedChanges: () => hasImagePlanDraft(client, image.caseId, image.id) || calibration.hasChanges,
    isNavigationBlocked: () => isCalibrationSaveLocked(client, image.caseId, image.id),
    onNavigationBlocked: () => {
      onSectionChange("calibration")
      toast.info(t("remote.navigationBlockedTitle"), { description: t("remote.navigationBlockedDescription") })
    },
    getUnsavedChanges: () => [...(calibration.hasChanges ? [{ field: "calibration", label: t("title"),
      previousValue: calibration.plan?.document.calibration ? t("savedScale") : "",
      value: calibration.editor?.reference ? `${calibration.editor.reference} ${calibration.editor.unit}` : t("unsavedMarker") }] : [])],
  }), [discardCalibration, calibration.hasChanges, calibration.plan, calibration.editor, client, image.caseId, image.id, onSectionChange, registerUnsavedChangesHandler, t])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!hasImagePlanDraft(client, image.caseId, image.id) && !isCalibrationSaveLocked(client, image.caseId, image.id)) return
      event.preventDefault(); event.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [client, image.caseId, image.id])
  const notifiedReadError = useRef<unknown>(null)
  useEffect(() => {
    if (calibration.planQuery.error && calibration.planQuery.error !== notifiedReadError.current) {
      notifiedReadError.current = calibration.planQuery.error
      toast.error(t("remote.readErrorTitle"), {
        description: t("remote.readErrorDescription"),
      })
    }
  }, [calibration.planQuery.error, t])

  async function save(checkOnly = false) {
    if (operationPending.current || introductionRequested) return
    const input = checkOnly ? calibration.receipt.draft : calibration.command()
    if (!input) return
    operationPending.current = true
    let result
    try { result = await calibration.save.mutateAsync({ input, checkOnly }) }
    catch { if (mounted.current) toast.error(t("saveErrorTitle"), { description: t("saveErrorDescription") }); return }
    finally { operationPending.current = false }
    if (!mounted.current) return
    if (result.phase === "saved") { setCalibrationRequested(false); setTool("pan"); toast.success(t("savedTitle"), { description: t("savedDescription") }) }
    else if (result.phase === "conflict") toast.error(t("remote.conflictTitle"), { description: t("remote.conflictDescription") })
    else if (result.phase === "uncertain") toast.error(t("remote.uncertainTitle"), { description: t("remote.uncertainDescription") })
    else if (result.code === "CLINICAL_VALIDATION_INVALID") toast.error(t("remote.reviewBlockedTitle"), { description: t("remote.reviewBlockedDescription") })
    else toast.error(t("saveErrorTitle"), { description: t("saveErrorDescription") })
  }
  function selectSection(section: WorkspacePanelSection) {
    if (section === "tools" && !toolsAvailable) return
    if (section === activeSection) return
    if (introductionRequested) cancelIntroduction()
    setIntroductionRequested(false)
    onSectionChange(section)
    setTool(section === "calibration" && calibrationEditing ? "mark" : "pan")
  }
  function startCalibration() {
    if (!calibration.canEdit) return
    introductionConfirmed.current = false
    setCalibrationRequested(true)
    setIntroductionRequested(!calibration.hasChanges && (Boolean(calibration.plan?.document.calibration) || !introductionSeen))
    setTool("mark")
  }
  const recalibrating = Boolean(calibration.plan?.document.calibration)
  const introductionOpen = introductionRequested && activeSection === "calibration" && calibration.canEdit
    && (recalibrating || !introductionSeen)
  function confirmIntroduction() {
    if (!introductionOpen) return
    if (!recalibrating) {
      calibration.initializeMarker()
      client.setQueryData(introductionKey, true)
    }
    introductionConfirmed.current = true
    setIntroductionRequested(false)
    setTool("mark")
  }
  function cancelIntroduction() {
    introductionConfirmed.current = false
    discardCalibration()
  }
  const editing = activeSection === "calibration" && calibrationEditing && calibration.canEdit
  const conflict = calibration.receipt.phase === "conflict" || calibration.needsRebase
  const discardLabel = t(conflict ? "remote.loadSaved" : "reset")
  const imageActionLabel = calibrationEditing ? discardLabel : tImage("reset")
  return <>
    <CaseWorkspacePanel activeSection={panelSection} calibrationAvailable={preview.ready && !caseLocked && !calibration.deleting}
      calibrationEditing={calibrationEditing}
      toolsAvailable={toolsAvailable}
      toolsContent={toolsAvailable ? <CaseImageToolsPanel /> : null}
      calibrationUnavailableReason={tImage("unavailable")}
      calibrationActions={<button aria-label={imageActionLabel}
        className="motion-interactive flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-token-md)] text-content-secondary outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
        disabled={calibration.deleting || (calibrationEditing && calibration.locked)}
        onClick={calibrationEditing ? discardCalibration : display.reset} title={imageActionLabel} type="button">
        <RotateCcw aria-hidden="true" className="size-4" strokeWidth={1.5} />
      </button>}
      caseContext={caseContext} imageList={imageList} imageActions={imageActions} onSectionChange={selectSection}>
      {calibrationEditing ? <CaseImageCalibrationPanel calibration={calibration} interactionBlocked={introductionOpen} onSave={() => void save()} onCheck={() => void save(true)} onPlace={() => {
        calibration.placeMarker(); setTool("mark")
        requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-calibration-viewport]")?.focus({ preventScroll: true }))
      }} onCancel={discardCalibration} /> : <CaseImageOptionsPanel calibration={calibration} display={display} onCalibrate={startCalibration} />}
    </CaseWorkspacePanel>
    <CasePreviewPanel image={image} preview={preview} display={display.settings}
      interactionNotice={introductionOpen ? <CalibrationIntroductionDialog open recalibrating={recalibrating} onConfirm={confirmIntroduction} onCancel={cancelIntroduction}
        onRestoreFocus={() => {
          if (introductionConfirmed.current) document.querySelector<HTMLElement>("[data-calibration-viewport]")?.focus({ preventScroll: true })
          else document.querySelector<HTMLButtonElement>("nav button[aria-pressed=true]")?.focus({ preventScroll: true })
        }} /> : null} calibration={{
      editable: editing, marker: activeSection === "calibration" && calibrationEditing ? calibration.marker : null,
      markerKind: calibration.editor?.kind ?? "line", tool, onMarkerChange: calibration.changeMarker, onToolChange: setTool,
    }} />
  </>
}

export { CaseImageWorkspace }
