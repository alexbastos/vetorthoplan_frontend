"use client"

import { RotateCcw } from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type KeyboardEvent } from "react"
import { toast } from "@/lib/notifications"

import { useUnsavedChangesGuard } from "@/components/shared/app-shell/unsaved-changes-guard"
import { useCaseImagePreview } from "../hooks/use-case-image-preview"
import { useImageCalibration } from "../hooks/use-image-calibration"
import { useImageDistance } from "../hooks/use-image-distance"
import { useImageAngle } from "../hooks/use-image-angle"
import { useImageCircle } from "../hooks/use-image-circle"
import { useImageLandmarks } from "../hooks/use-image-landmarks"
import { useImageTplo } from "../hooks/use-image-tplo"
import { useTploParameterSaveActions } from "../hooks/use-tplo-parameter-save-actions"
import { useTploGeometrySaveActions, type TploGeometryConfirmation } from "../hooks/use-tplo-geometry-save-actions"
import { useTploDeletion } from "../hooks/use-tplo-deletion"
import { useDistanceSaveActions } from "../hooks/use-distance-save-actions"
import { useAngleSaveActions } from "../hooks/use-angle-save-actions"
import { useCircleSaveActions } from "../hooks/use-circle-save-actions"
import { useLandmarksSaveActions } from "../hooks/use-landmarks-save-actions"
import { useAngleDeletion } from "../hooks/use-angle-deletion"
import { useCircleDeletion } from "../hooks/use-circle-deletion"
import { useLandmarksDeletion } from "../hooks/use-landmarks-deletion"
import { useImageDisplaySettings } from "../hooks/use-image-display-settings"
import { hasImagePlanDraft } from "../lib/image-plan-draft"
import { hasConfirmedImageScale } from "../lib/calibration-product-state"
import { selectSavedDistances } from "../lib/distance-result"
import { selectSavedAngles } from "../lib/angle-result"
import { circleMeasureFor, selectSavedCircles } from "../lib/circle-result"
import { selectSavedLandmarks } from "../lib/landmarks-result"
import { selectSavedTplo } from "../lib/tplo-result"
import { tploInPixels, tploRadiusMm, type TploGeometry } from "../lib/tplo-geometry"
import { tploEditorPlacement } from "../lib/tplo-placement"
import { tploValuesPreview, type ViewerTploSimulation } from "../lib/tplo-preview"
import { tploParameterFields } from "../lib/tplo-parameters"
import { landmarksValuesPreview, type LandmarksPreview } from "../lib/landmarks-preview"
import type { LandmarksGeometry } from "../lib/landmarks-geometry"
import type { LandmarksAdjustmentTarget } from "../lib/landmarks-interaction"
import { LANDMARK_POINT_NAMES } from "../lib/landmarks-editor"
import { tploClinicalProtocolQueryOptions } from "../lib/tplo-reference-query-options"
import { circleValuesPreview, type CirclePreview } from "../lib/circle-preview"
import { circleHasValidRadius, type CircleGeometry } from "../lib/circle-geometry"
import { angleDegreesPreview, type AnglePreview } from "../lib/angle-preview"
import type { AngleGeometry } from "../lib/angle-geometry"
import { calibrationDistanceLine } from "../lib/calibration-distance"
import { distanceLengthPreview, type DistancePreview } from "../lib/distance-preview"
import { distanceIntersections } from "../lib/distance-placement"
import type { DistanceGeometry } from "../lib/distance-editor"
import { segmentMeasureFor, type SegmentMeasure } from "../lib/segment-measure"
import { calibrationMatches, type ImagePlan } from "../schemas/image-plan.schema"
import { hasUniquePlanObjectIds, isDistanceCommand, planCommandMatches, type SaveLandmarksInput } from "../schemas/image-plan-command.schema"
import { imagePlanSaveOwner, imagePlanSaveSection, isCalibrationSaveLocked, type ImagePlanSaveState } from "../lib/calibration-save-state"
import type { CaseImage } from "../types/case-image"
import { CaseImageCalibrationPanel } from "./case-image-calibration-panel"
import { CaseImageOptionsPanel } from "./case-image-options-panel"
import { CaseImageToolsPanel } from "./case-image-tools-panel"
import { CaseImageDistanceValues } from "./case-image-distance-values"
import { CaseImageDistanceToolbar } from "./case-image-distance-toolbar"
import { CaseImageDistanceActions } from "./case-image-distance-actions"
import { CaseImageDistanceDeleteDialog } from "./case-image-distance-delete-dialog"
import { CaseImageAngleRecovery } from "./case-image-angle-recovery"
import { CaseImageCircleRecovery } from "./case-image-circle-recovery"
import { CaseImageLandmarksRecovery } from "./case-image-landmarks-recovery"
import { CaseImageTploRecovery } from "./case-image-tplo-recovery"
import { CaseImageTploSaved } from "./case-image-tplo-saved"
import { CaseImageTploValues } from "./case-image-tplo-values"
import { CaseImageTploActions } from "./case-image-tplo-actions"
import { CaseImageTploDeleteDialog } from "./case-image-tplo-delete-dialog"
import { CaseImageTploDeleteButton, CaseImageTploNewAction } from "./case-image-tplo-menu-actions"
import { CaseImageTploParameters } from "./case-image-tplo-parameters"
import { CaseImageTploCutControls } from "./case-image-tplo-cut-controls"
import { CaseImageTploFragmentControls } from "./case-image-tplo-fragment-controls"
import { CaseImageTploFragmentActions, CaseImageTploFragmentDrawing } from "./case-image-tplo-fragment-drawing"
import { CaseImageTploRotationControls, CaseImageTploComparison } from "./case-image-tplo-rotation-controls"
import { TploOverlay } from "./tplo-overlay"
import { CaseImageLandmarksValues } from "./case-image-landmarks-values"
import { CaseImageLandmarksCreationControls } from "./case-image-landmarks-creation-controls"
import { CaseImageLandmarksAdjustmentControls } from "./case-image-landmarks-adjustment-controls"
import { CaseImageLandmarksActions } from "./case-image-landmarks-actions"
import { CaseImageLandmarksProtocol } from "./case-image-landmarks-protocol"
import { CaseImageLandmarksDeleteDialog } from "./case-image-landmarks-delete-dialog"
import { CaseImageLandmarksMethodDialog } from "./case-image-landmarks-method-dialog"
import { LandmarksOverlay } from "./landmarks-overlay"
import { CaseImageCircleValues } from "./case-image-circle-values"
import { CaseImageCircleCreationControls } from "./case-image-circle-creation-controls"
import { CaseImageCircleToolbar } from "./case-image-circle-toolbar"
import { CaseImageCircleActions } from "./case-image-circle-actions"
import { CaseImageCircleDeleteDialog } from "./case-image-circle-delete-dialog"
import { CircleOverlay } from "./circle-overlay"
import { CaseImageAngleValues } from "./case-image-angle-values"
import { CaseImageAngleCreationControls } from "./case-image-angle-creation-controls"
import { CaseImageAngleToolbar } from "./case-image-angle-toolbar"
import { CaseImageAngleActions } from "./case-image-angle-actions"
import { CaseImageAngleDeleteDialog } from "./case-image-angle-delete-dialog"
import { AngleOverlay } from "./angle-overlay"
import type { DistanceAdjustmentTarget } from "../lib/distance-line-interaction"
import type { AngleAdjustmentTarget } from "../lib/angle-interaction"
import type { CircleAdjustmentTarget } from "../lib/circle-interaction"
import type { TploAdjustmentTarget } from "../lib/tplo-interaction"
import { DistanceOverlay } from "./distance-overlay"
import { CalibrationIntroductionDialog } from "./calibration-introduction-dialog"
import { casesQueryKeys as keys } from "../hooks/cases-query-keys"
import { CasePreviewPanel } from "./case-preview-panel"
import { CaseWorkspacePanel, type WorkspacePanelSection } from "./case-workspace-panel"
import type { ViewerTool } from "./case-image-viewer"

type DistanceDeletionRequest = { id: string; baseRevision: number; name: string; caseId: string; imageId: string; client: ReturnType<typeof useQueryClient> }
type MeasurementChoice = { tool: "distance" | "angle" | "circle" | "landmarks" | "tplo"; caseId: string; imageId: string; client: ReturnType<typeof useQueryClient> }

function CaseImageWorkspace({ image, activeSection, onSectionChange, caseContext, imageList, imageActions, caseLocked }: {
  image: CaseImage; activeSection: WorkspacePanelSection; onSectionChange: (section: WorkspacePanelSection) => void;
  caseContext: ReactNode; imageList: ReactNode; imageActions: ReactNode; caseLocked: boolean
}) {
  const t = useTranslations("cases.workspace.calibration")
  const tImage = useTranslations("cases.workspace.image")
  const tDistance = useTranslations("cases.workspace.distance")
  const tAngle = useTranslations("cases.workspace.angle")
  const tCircle = useTranslations("cases.workspace.circle")
  const tLandmarks = useTranslations("cases.workspace.landmarks")
  const tTplo = useTranslations("cases.workspace.tplo")
  const client = useQueryClient()
  const preview = useCaseImagePreview(image)
  const calibration = useImageCalibration(image, preview.ready, caseLocked)
  const display = useImageDisplaySettings(image.caseId, image.id)
  const discardCalibrationDraft = calibration.discard
  const { registerUnsavedChangesHandler } = useUnsavedChangesGuard()
  const [tool, setTool] = useState<ViewerTool>("pan")
  const [distanceRequested, setDistanceRequested] = useState(false)
  const [nextDistanceAfterGuide, setNextDistanceAfterGuide] = useState<{ id: string; revision: number; entry: number; client: typeof client } | null>(null)
  const [measurementChoice, setMeasurementChoice] = useState<MeasurementChoice | null>(null)
  const [distanceTarget, setDistanceTarget] = useState<DistanceAdjustmentTarget>("body")
  const [angleTarget, setAngleTarget] = useState<AngleAdjustmentTarget>("body")
  const [circleTarget, setCircleTarget] = useState<CircleAdjustmentTarget>("body")
  const [landmarksTarget, setLandmarksTarget] = useState<LandmarksAdjustmentTarget>("body")
  const [landmarksMethodRequest, setLandmarksMethodRequest] = useState<{
    generation: number; revision: number; trigger: HTMLElement | null
  } | null>(null)
  const [landmarksGesture, setLandmarksGesture] = useState<{ owner: string; client: typeof client; geometry: LandmarksGeometry } | null>(null)
  const [distanceGesture, setDistanceGesture] = useState<{ owner: string; client: typeof client; geometry: DistanceGeometry } | null>(null)
  const [angleGesture, setAngleGesture] = useState<{ owner: string; client: typeof client; geometry: AngleGeometry } | null>(null)
  const [circleGesture, setCircleGesture] = useState<{ owner: string; client: typeof client; geometry: CircleGeometry } | null>(null)
  const [tploGesture, setTploGesture] = useState<{ owner: string; client: typeof client; geometry: TploGeometry } | null>(null)
  const [tploRotationGesture, setTploRotationGesture] = useState<{ owner: string; client: typeof client; degrees: number } | null>(null)
  const [tploHandoff, setTploHandoff] = useState<{
    client: typeof client; caseId: string; imageId: string; id: string | null; selectionId?: string; revision: number; comparison: "original" | "simulated"
    queries: readonly unknown[]; command?: TploGeometryConfirmation["command"]
  } | null>(null)
  const [requestedDistanceDeletion, setRequestedDistanceDeletion] = useState<DistanceDeletionRequest | null>(null)
  const distanceDeletionPending = useRef(false)
  const scope = useRef({ client, caseId: image.caseId, imageId: image.id })
  scope.current = { client, caseId: image.caseId, imageId: image.id }
  const [calibrationRequested, setCalibrationRequested] = useState(false)
  const [calibrationHandoff, setCalibrationHandoff] = useState<{
    id: string | null; revision: number; createFirst: boolean; caseId: string; imageId: string; client: typeof client
  } | null>(null)
  const [introductionRequested, setIntroductionRequested] = useState(false)
  const calibrationEditing = calibrationRequested || calibration.hasChanges
    || Boolean(calibration.receipt.draft && calibration.receipt.phase !== "idle" && calibration.receipt.phase !== "saved")
  const requestedMeasurement = measurementChoice?.client === client && measurementChoice.caseId === image.caseId && measurementChoice.imageId === image.id
    ? measurementChoice.tool : null
  const distance = useImageDistance(image, preview.ready, caseLocked, calibrationEditing)
  const angle = useImageAngle(image, preview.ready, caseLocked, { active: activeSection === "tools", calibrationEditing })
  const angleRecovery = angle.recovery
  const circle = useImageCircle(image, preview.ready, caseLocked, {
    active: activeSection === "tools", toolActive: requestedMeasurement === "circle", calibrationEditing,
  })
  const circleRecovery = circle.recovery
  const landmarks = useImageLandmarks(image, preview.ready, caseLocked, {
    active: activeSection === "tools", toolActive: requestedMeasurement === "landmarks", calibrationEditing,
  })
  const landmarksRecovery = landmarks.recovery
  const tplo = useImageTplo(image, preview.ready, caseLocked, {
    active: activeSection === "tools", toolActive: requestedMeasurement === "tplo", calibrationEditing,
  })
  const tploRecovery = tplo.recovery
  const tploIntent = Boolean(tplo.editor || tploRecovery.active)
  const landmarksIntent = Boolean(landmarks.editor || landmarksRecovery.active)
  const circleIntent = Boolean(circle.editor || circleRecovery.active)
  const angleIntent = Boolean(angle.editor || angleRecovery.active)
  const distanceIntent = Boolean(distance.editor || isDistanceCommand(distance.receipt.edit) && distance.receipt.phase !== "idle" && distance.receipt.phase !== "saved")
  const activeMeasurement = tploIntent ? "tplo" : landmarksIntent ? "landmarks" : circleIntent ? "circle" : angleIntent ? "angle" : distanceIntent ? "distance" : requestedMeasurement
    ?? (circle.selectedId ? "circle" : angle.selectedId ? "angle" : distance.selectedId || distanceRequested ? "distance" : null)
  const clinicalProtocol = useQuery({ ...tploClinicalProtocolQueryOptions({ enabled: activeSection === "tools" && activeMeasurement === "landmarks"
    && preview.ready && !caseLocked && !landmarks.deleting }), staleTime: Infinity, gcTime: Infinity })
  const measurementIntent = distanceIntent || angleIntent || circleIntent || landmarksIntent || tploIntent
  useEffect(() => {
    if (tploIntent && requestedMeasurement !== "tplo") {
      setMeasurementChoice({ tool: "tplo", client, caseId: image.caseId, imageId: image.id })
    }
  }, [tploIntent, requestedMeasurement, client, image.caseId, image.id])
  useEffect(() => {
    if (!tploIntent && landmarksIntent && requestedMeasurement !== "landmarks") {
      setMeasurementChoice({ tool: "landmarks", client, caseId: image.caseId, imageId: image.id })
    }
  }, [tploIntent, landmarksIntent, requestedMeasurement, client, image.caseId, image.id])
  // Keep a restored circle's recovery controls selected when returning to Tools.
  useEffect(() => {
    if (!tploIntent && !landmarksIntent && circleIntent && requestedMeasurement && requestedMeasurement !== "circle") {
      setMeasurementChoice({ tool: "circle", client, caseId: image.caseId, imageId: image.id })
    }
  }, [tploIntent, landmarksIntent, circleIntent, requestedMeasurement, client, image.caseId, image.id])
  const cachedTools = preview.ready && !distance.deleting && distance.planQuery.isError && hasConfirmedImageScale(distance.plan, image.id)
  const toolsAvailable = Boolean(tploIntent || !calibrationEditing && (calibration.measurementEligible || measurementIntent || cachedTools || distance.recoveringSaved
    || preview.ready && !caseLocked && (requestedMeasurement === "tplo" || tplo.plan?.document.objects.some(object => object.type === "TPLO" && object.visible !== false))))
  const distanceActions = useDistanceSaveActions(distance, onDistanceSaved)
  const cancelDistanceAutosave = distanceActions.cancelAutosave
  const angleActions = useAngleSaveActions(angle, { caseId: image.caseId, imageId: image.id }, onAngleSaved)
  const circleActions = useCircleSaveActions(circle, { caseId: image.caseId, imageId: image.id }, onCircleSaved)
  const landmarksActions = useLandmarksSaveActions(landmarks, { caseId: image.caseId, imageId: image.id }, onLandmarksSaved)
  const angleDeletion = useAngleDeletion(image, angle, angleActions, onAngleSaved)
  const circleDeletion = useCircleDeletion(image, circle, circleActions, onCircleSaved)
  const landmarksDeletion = useLandmarksDeletion(image, landmarks, landmarksActions, onLandmarksSaved)
  useEffect(() => {
    if (landmarksDeletion.committed && activeSection !== "tools") onSectionChange("tools")
  }, [landmarksDeletion.committed, activeSection, onSectionChange])
  useEffect(() => {
    if (!angleDeletion.committed) return
    if (activeSection !== "tools") onSectionChange("tools")
  }, [angleDeletion.committed, activeSection, onSectionChange])
  useEffect(() => {
    if (!circleDeletion.committed) return
    if (activeSection !== "tools") onSectionChange("tools")
  }, [circleDeletion.committed, activeSection, onSectionChange])
  const distances = useMemo(() => selectSavedDistances(distance.plan, { readError: distance.planQuery.isError }),
    [distance.plan, distance.planQuery.isError])
  const angles = selectSavedAngles(angle.plan, { readError: angle.planQuery.isError })
  const circleDrawingAvailable = Boolean(image.widthPx && image.heightPx)
  const circles = selectSavedCircles(circle.plan, { readError: circle.planQuery.isError, dimensionsAvailable: circleDrawingAvailable })
  const landmarksDimensionsAvailable = typeof image.widthPx === "number" && Number.isFinite(image.widthPx) && image.widthPx > 0
    && typeof image.heightPx === "number" && Number.isFinite(image.heightPx) && image.heightPx > 0
  const landmarksReadUnverified = landmarks.planQuery.isError || !landmarks.plan
    || landmarks.plan.imageId.toLowerCase() !== image.id.toLowerCase()
    || ["saving", "checking", "uncertain", "conflict"].includes(landmarks.receipt.phase)
  const savedLandmarks = selectSavedLandmarks(landmarks.plan, {
    expectedImageId: image.id, dimensionsAvailable: landmarksDimensionsAvailable,
    readError: landmarksReadUnverified,
  })
  // Guard the render immediately when changing image or losing a confirmed
  // scale; then synchronize the parent's selection so Tools cannot reopen itself.
  const panelSection = activeSection === "tools" && !toolsAvailable ? "calibration" : activeSection
  const tploVisible = panelSection === "tools" && activeMeasurement === "tplo"
  const tploDrawingAvailable = tplo.issue !== "dimensions"
  // Normal writes keep the editor in place. Interrupted receipts still expose
  // GET-only verification, including saving/checking restored without a request.
  const tploRecoveryVisible = tploRecovery.active && (!tploRecovery.pending
    || ["uncertain", "conflict", "error"].includes(tploRecovery.receipt.phase))
  const tploReadUnverified = tplo.planQuery.isError || ["saving", "checking", "uncertain", "conflict"].includes(tplo.receipt.phase)
  const savedTplo = useMemo(() => selectSavedTplo(tplo.plan, {
    dimensions: landmarksDimensionsAvailable ? { widthPx: image.widthPx!, heightPx: image.heightPx! } : null,
    expectedImageId: image.id, geometryIssue: tplo.issue,
    readError: tploReadUnverified,
  }), [tplo.plan, image.widthPx, image.heightPx, image.id, landmarksDimensionsAvailable, tplo.issue, tploReadUnverified])
  const tploSelectionVisible = savedTplo.find(item => item.object.id.toLowerCase() === tplo.selectedId?.toLowerCase())?.object.visible !== false
  const visibleTploEditor = tploVisible && !tploRecoveryVisible && tplo.editor
    && tploSelectionVisible
    && (tplo.editor.kind === "tplo-create" || tplo.editor.kind === "tplo-update") ? tplo.editor : null
  const tploPreviewOwner = visibleTploEditor ? JSON.stringify([image.caseId, image.id, visibleTploEditor.id,
    visibleTploEditor.baseRevision, tplo.contextGeneration, tplo.originGeometry]) : null
  const onTploGeometryPreview = useCallback((geometry: TploGeometry | null) => {
    setTploGesture(current => geometry && tploPreviewOwner
      ? { owner: tploPreviewOwner, client, geometry }
      : current?.owner === tploPreviewOwner && current.client === client ? null : current)
  }, [tploPreviewOwner, client])
  const onTploRotationPreview = useCallback((degrees: number | null) => {
    setTploRotationGesture(current => degrees !== null && tploPreviewOwner ? { owner: tploPreviewOwner, client, degrees }
      : current?.owner === tploPreviewOwner && current.client === client ? null : current)
  }, [tploPreviewOwner, client])
  const tploGestureActive = tploPreviewOwner !== null && tploGesture?.owner === tploPreviewOwner && tploGesture.client === client
  const rotationGestureDegrees = tploPreviewOwner !== null && tploRotationGesture?.owner === tploPreviewOwner && tploRotationGesture.client === client ? tploRotationGesture.degrees : null
  const tploPlacement = tploEditorPlacement(visibleTploEditor)
  const tploFragmentDrawing = visibleTploEditor?.fragmentComplete === false && !tploPlacement
  const tploCutRadius = tplo.originGeometry && landmarksDimensionsAvailable && tplo.plan?.document.calibration?.result
    ? tploRadiusMm(tploInPixels(tplo.originGeometry, { widthPx: image.widthPx!, heightPx: image.heightPx! }), tplo.plan.document.calibration.result.mm_per_pixel) : null
  const tploCutDiameter = tploCutRadius !== null && Number.isFinite(tploCutRadius * 2) ? tploCutRadius * 2 : null
  const dirtyTploId = visibleTploEditor && (tplo.hasChanges || tploGestureActive || rotationGestureDegrees !== null) ? visibleTploEditor.id : null
  const selectedSavedTplo = savedTplo.find(item => item.object.id.toLowerCase() === tplo.selectedId?.toLowerCase() && item.object.visible !== false)
  const currentTploGeometry = tploGestureActive ? tploGesture.geometry : tplo.originGeometry ?? selectedSavedTplo?.origin ?? null
  const currentRotationDegrees = rotationGestureDegrees ?? visibleTploEditor?.rotation_degrees ?? selectedSavedTplo?.object.rotation_degrees ?? 0
  const tploLocal = tploValuesPreview(currentTploGeometry, currentRotationDegrees,
    landmarksDimensionsAvailable ? { widthPx: image.widthPx!, heightPx: image.heightPx! } : null, tplo.plan?.document.calibration,
    { issue: tplo.issue, unverified: tplo.planQuery.isError || tploRecoveryVisible || tplo.needsRebase })
  const useTploLocal = Boolean(dirtyTploId)
  const tploMeasure = useTploLocal ? tploLocal.measurement : selectedSavedTplo?.measurement
  const tploSimulationResult = useTploLocal ? tploLocal.simulation : selectedSavedTplo?.simulation
  const tploResultSource = tploMeasure?.status === "available" ? useTploLocal ? "preview" as const : "official" as const : "unavailable" as const
  const simulationReason = tploSimulationResult?.status === "unavailable" ? tploSimulationResult.reason : null
  const tploStatusText = tploResultSource === "preview" ? tTplo("simulation.preview") : tploResultSource === "official" ? tTplo("simulation.official") : tTplo("read.unavailable")
  const tploSimulation: ViewerTploSimulation | null = tploVisible && tplo.ui.comparison === "simulated" && tploSimulationResult?.status === "available"
    && currentTploGeometry?.fragment && tplo.selectedId && landmarksDimensionsAvailable ? {
      id: tplo.selectedId, source: useTploLocal ? "preview" : "official", matrix: tploSimulationResult.matrix,
      pointsPx: tploSimulationResult.pointsPx,
      originPointsPx: tploInPixels(currentTploGeometry, { widthPx: image.widthPx!, heightPx: image.heightPx! }).fragment!,
    } : null
  const tploParameterActions = useTploParameterSaveActions(tplo, { caseId: image.caseId, imageId: image.id }, focusViewerViewport)
  const tploGeometryActions = useTploGeometrySaveActions(tplo, { caseId: image.caseId, imageId: image.id }, onTploGeometrySaved)
  const tploDeletion = useTploDeletion(image, tplo, tploGeometryActions, restoreTploAfterDeletion)
  const tploDialogOpen = Boolean(tploDeletion.request)
  const tploComparison = { value: tplo.ui.comparison, enabled: tplo.canSelect && !tploDialogOpen && !tploGestureActive && rotationGestureDegrees === null,
    canSimulate: tploSimulationResult?.status === "available", onChange: tplo.setComparison }
  const parameterEditor = tploVisible && !tploRecoveryVisible && tplo.editor?.kind === "tplo-parameters-set" ? tplo.editor : null
  const tploTarget: TploAdjustmentTarget = tplo.ui.activeVertex !== null ? { vertex: tplo.ui.activeVertex }
    : tplo.ui.activePoint ?? tplo.ui.area ?? "body"
  const tploPicking = {
    objects: savedTplo.filter(item => item.origin !== null && !item.ambiguous).map(({ object, origin }) => ({
      id: object.id, center: origin!.center, edge: origin!.edge, fragment: origin!.fragment, visible: object.visible, locked: object.locked,
    })), selectedId: tplo.selectedId, enabled: tploVisible && tploDrawingAvailable && tplo.canSelect && !tplo.hasChanges && !tploRecovery.active && !tploDialogOpen,
    baseRevision: tplo.plan?.revision ?? 0, contextGeneration: tplo.contextGeneration,
    onSelect: (id: string) => {
      const editing = tplo.beginUpdate(id)
      if (!(editing || tplo.select(id)) || !chooseMeasurement("tplo")) return
      setTool(editing ? "mark" : "pan")
    },
  }
  useEffect(() => {
    const handoff = tploHandoff
    if (!handoff) return
    const current = client.getQueryData<ImagePlan>(keys.imagePlan(image.caseId, image.id))
    const receipt = client.getQueryData<ImagePlanSaveState>(keys.imagePlanSave(image.caseId, image.id))
    const sameQueries = tploHandoffQueries().every((query, index) => query === handoff.queries[index])
    if (handoff.client !== client || handoff.caseId !== image.caseId || handoff.imageId !== image.id || !tploVisible || tplo.deleting
      || !sameQueries || client.getQueryData(keys.imageTploDraft(image.caseId, image.id)) || !current || current.revision !== handoff.revision
      || (tplo.ui.selectedId?.toLowerCase() ?? null) !== ((handoff.selectionId ?? handoff.id)?.toLowerCase() ?? null)
      || handoff.command && (receipt?.phase !== "saved" || JSON.stringify(receipt.edit) !== JSON.stringify(handoff.command) || !planCommandMatches(current, handoff.command))) {
      setTploHandoff(null); return
    }
    if (tplo.editor || !tplo.canOpen || tplo.planQuery.isFetching) return
    // Wait for a fresh observer after the writer unlocks. A newer intent,
    // selection or revision is never replaced by this completed operation.
    const opened = handoff.id ? tplo.reopenSaved(handoff.id, handoff.revision, handoff.comparison) || tplo.select(handoff.id, handoff.comparison) : tplo.select(null)
    setTploHandoff(null)
    if (opened) { setTool("pan"); focusViewerViewport() }
  }, [tploHandoff, tplo, tploVisible, client, image.caseId, image.id, tploHandoffQueries, focusViewerViewport])
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
  const calibrationEntry = useRef(0)
  const focusAfterDistanceCancel = useRef(false)
  const distanceBeforeCalibration = useRef<{ id: string; caseId: string; imageId: string; client: typeof client } | null>(null)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const discardCalibration = useCallback(() => {
    if (!discardCalibrationDraft()) return false
    setCalibrationRequested(false)
    setIntroductionRequested(false)
    setTool("pan")
    return true
  }, [discardCalibrationDraft])
  const discardChanges = useCallback(() => {
    if (isCalibrationSaveLocked(client, image.caseId, image.id)) return false
    if (!tplo.discard()) return false
    if (!landmarks.discard()) return false
    if (!circle.discard()) return false
    if (!angle.discard()) return false
    if (!distance.discard() || !discardCalibration()) return false
    cancelDistanceAutosave()
    return !hasImagePlanDraft(client, image.caseId, image.id)
  }, [client, image.caseId, image.id, tplo.discard, landmarks.discard, circle.discard, angle.discard, distance.discard, discardCalibration, cancelDistanceAutosave])

  useEffect(() => registerUnsavedChangesHandler({
    discardChanges,
    hasUnsavedChanges: () => hasImagePlanDraft(client, image.caseId, image.id) || calibration.hasChanges,
    isNavigationBlocked: () => isCalibrationSaveLocked(client, image.caseId, image.id),
    onNavigationBlocked: () => {
      const receipt = client.getQueryData<ImagePlanSaveState>(keys.imagePlanSave(image.caseId, image.id))
      const section = imagePlanSaveSection(receipt)
      const owner = imagePlanSaveOwner(receipt)
      const measurementTranslations = owner === "tplo" ? tTplo : owner === "landmarks" ? tLandmarks : owner === "circle" ? tCircle : owner === "angle" ? tAngle : tDistance
      onSectionChange(section)
      toast.info(section === "tools" ? measurementTranslations("navigationBlockedTitle") : t("remote.navigationBlockedTitle"), {
        description: section === "tools" ? measurementTranslations("navigationBlockedDescription") : t("remote.navigationBlockedDescription"),
      })
    },
    getUnsavedChanges: () => [...(calibration.hasChanges ? [{ field: "calibration", label: t("title"),
      previousValue: calibration.plan?.document.calibration ? t("savedScale") : "",
      value: calibration.editor?.reference ? `${calibration.editor.reference} ${calibration.editor.unit}` : t("unsavedMarker") }] : []),
      ...(distance.hasChanges ? [{ field: "distance", label: tDistance("title"), previousValue: "",
        value: tDistance(distance.editor?.kind === "distance-delete" ? "deleteDraft" : "unsavedDraft") }] : []),
      ...(angle.hasChanges || angleRecovery.active ? [{ field: "angle", label: tAngle("title"), previousValue: "",
        value: tAngle(angle.editor?.kind === "angle-delete" ? "deleteDraft" : "unsavedDraft") }] : []),
      ...(circle.hasChanges || circleRecovery.active ? [{ field: "circle", label: tCircle("title"), previousValue: "",
        value: tCircle(circle.editor?.kind === "circle-delete" ? "deleteDraft" : "unsavedDraft") }] : []),
      ...(landmarks.hasChanges || landmarksRecovery.active ? [{ field: "landmarks", label: tLandmarks("title"), previousValue: "",
        value: tLandmarks(landmarks.editor?.kind === "landmarks-clear" ? "deleteDraft" : "unsavedDraft") }] : []),
      ...(tplo.hasChanges || tploRecovery.active ? [{ field: "tplo", label: tTplo("title"), previousValue: "",
        value: tTplo(tplo.editor?.kind === "tplo-delete" ? "deleteDraft" : "unsavedDraft") }] : [])],
  }), [discardChanges, calibration.hasChanges, calibration.plan, calibration.editor, distance.hasChanges, distance.editor,
    angle.hasChanges, angle.editor, angleRecovery.active, circle.hasChanges, circle.editor, circleRecovery.active,
    landmarks.hasChanges, landmarks.editor, landmarksRecovery.active, tplo.hasChanges, tplo.editor, tploRecovery.active, client, image.caseId, image.id, onSectionChange, registerUnsavedChangesHandler, t, tDistance, tAngle, tCircle, tLandmarks, tTplo])
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
    const noticeId = `calibration-read-error:${image.caseId}:${image.id}`
    if (calibration.planQuery.error && calibration.planQuery.error !== notifiedReadError.current) {
      notifiedReadError.current = calibration.planQuery.error
      const measurementRead = activeSection === "tools" || measurementIntent
      const measurementTranslations = activeMeasurement === "tplo" ? tTplo : activeMeasurement === "landmarks" ? tLandmarks : activeMeasurement === "circle" ? tCircle : activeMeasurement === "angle" ? tAngle : tDistance
      toast.error(measurementRead ? measurementTranslations("readErrorTitle") : t("remote.readErrorTitle"), {
        id: noticeId,
        description: measurementRead ? measurementTranslations("readErrorDescription") : t("remote.readErrorDescription"),
      })
    } else if (calibration.planQuery.isSuccess && !calibration.planQuery.isFetching && notifiedReadError.current) {
      toast.dismiss(noticeId)
      notifiedReadError.current = null
    }
  }, [calibration.planQuery.error, calibration.planQuery.isSuccess, calibration.planQuery.isFetching, image.caseId, image.id, activeSection, measurementIntent, activeMeasurement, t, tDistance, tAngle, tCircle, tLandmarks, tTplo])

  function chooseMeasurement(next: MeasurementChoice["tool"]) {
    if (scope.current.client !== client || scope.current.caseId !== image.caseId || scope.current.imageId !== image.id) return false
    if (tploDialogOpen) return false
    if (next !== "tplo" && client.getQueryData(keys.imageTploDraft(image.caseId, image.id)) && !tplo.closeCleanEditor()) return false
    setMeasurementChoice({ tool: next, client, caseId: image.caseId, imageId: image.id })
    return true
  }

  async function save(checkOnly = false) {
    if (operationPending.current || introductionRequested) return
    const entry = calibrationEntry.current
    const target = distanceBeforeCalibration.current
    const targetId = target?.client === client && target.caseId === image.caseId && target.imageId === image.id ? target.id : null
    const input = checkOnly ? calibration.receipt.draft : calibration.command()
    if (!input) return
    operationPending.current = true
    let result
    try { result = await calibration.save.mutateAsync({ input, checkOnly }) }
    catch { if (mounted.current) toast.error(t("saveErrorTitle"), { description: t("saveErrorDescription") }); return }
    finally { operationPending.current = false }
    if (!mounted.current || scope.current.client !== client || scope.current.caseId !== image.caseId || scope.current.imageId !== image.id) return
    if (result.phase === "saved") {
      if (hasImagePlanDraft(client, image.caseId, image.id)) return
      setCalibrationRequested(false)
      setTool("pan")
      const saved = client.getQueryData<ImagePlan>(keys.imagePlan(image.caseId, image.id))
      const reference = result.draft?.calibration
      if (entry === calibrationEntry.current && reference && saved?.document.calibration?.result
        && calibrationMatches(saved.document.calibration, reference)) {
        const createFirst = !saved.document.objects.some(object => object.type === "LINE")
        setCalibrationHandoff({ id: calibrationDistanceLine(saved, targetId)?.id ?? null,
          revision: saved.revision, createFirst, caseId: image.caseId, imageId: image.id, client })
      }
      toast.success(t("savedTitle"), { description: t("savedDescription") })
    }
    else if (result.phase === "conflict") toast.error(t("remote.conflictTitle"), { description: t("remote.conflictDescription") })
    else if (result.phase === "uncertain") toast.error(t("remote.uncertainTitle"), { description: t("remote.uncertainDescription") })
    else if (result.code === "CLINICAL_VALIDATION_INVALID") toast.error(t("remote.reviewBlockedTitle"), { description: t("remote.reviewBlockedDescription") })
    else toast.error(t("saveErrorTitle"), { description: t("saveErrorDescription") })
  }
  function selectSection(section: WorkspacePanelSection) {
    if (tploDialogOpen) return
    setCalibrationHandoff(null)
    focusAfterDistanceCancel.current = false
    if (section === "tools" && !toolsAvailable) {
      onSectionChange("calibration")
      if (!calibrationEditing) void startCalibration()
      else if (calibration.canEdit) setTool("mark")
      return
    }
    if (section === activeSection) return
    calibrationEntry.current += 1
    if (introductionRequested) cancelIntroduction()
    setIntroductionRequested(false)
    onSectionChange(section)
    setTool((section === "calibration" && calibrationEditing) || (section === "tools" &&
      (landmarks.editor && landmarks.editor.kind === "landmarks-set" || angle.editor && angle.editor.kind !== "angle-delete"
        || distance.editor && distance.editor.kind !== "distance-delete")) ? "mark" : "pan")
  }
  async function startCalibration() {
    if (tploDialogOpen || circleDeletion.request || landmarksDeletion.request) return
    if (!tplo.closeCleanEditor()) {
      toast.info(tTplo("finishEditingTitle"), { description: tTplo("finishEditingDescription") })
      return
    }
    if (!landmarks.closeCleanEditor()) {
      toast.info(tLandmarks("finishEditingTitle"), { description: tLandmarks("finishEditingDescription") })
      return
    }
    if (!circle.closeCleanEditor()) {
      toast.info(tCircle("finishEditingTitle"), { description: tCircle("finishEditingDescription") })
      return
    }
    if (!angle.closeCleanEditor()) {
      toast.info(tAngle("finishEditingTitle"), { description: tAngle("finishEditingDescription") })
      return
    }
    let hasSavedCalibration = Boolean(calibration.plan?.document.calibration)
    if (calibration.planQuery.isError) {
      if (operationPending.current || !calibration.canRetryRead) return
      operationPending.current = true
      const entry = ++calibrationEntry.current
      try {
        const recovered = await calibration.planQuery.refetch()
        if (!mounted.current || entry !== calibrationEntry.current || !recovered.isSuccess) return
        hasSavedCalibration = Boolean(recovered.data.document.calibration)
      } finally { operationPending.current = false }
    } else if (!calibration.canEdit) return
    const selectedId = distance.selectedId
    if (distance.editor && !distance.hasChanges && !distance.discard()) return
    setCalibrationHandoff(null)
    distanceBeforeCalibration.current = selectedId ? { id: selectedId, caseId: image.caseId, imageId: image.id, client } : null
    introductionConfirmed.current = false
    setCalibrationRequested(true)
    setIntroductionRequested(!calibration.hasChanges && (hasSavedCalibration || !introductionSeen))
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
  function focusViewerViewport() {
    const entry = calibrationEntry.current
    requestAnimationFrame(() => {
      if (mounted.current && entry === calibrationEntry.current && scope.current.client === client
        && scope.current.caseId === image.caseId && scope.current.imageId === image.id) {
        document.querySelector<HTMLElement>("[data-calibration-viewport]")?.focus({ preventScroll: true })
      }
    })
  }

  function tploHandoffQueries() {
    return [keys.imagePlan(image.caseId, image.id), keys.imageTploDraft(image.caseId, image.id),
      keys.imageTploEditorUi(image.caseId, image.id), keys.imagePlanSave(image.caseId, image.id)]
      .map(queryKey => client.getQueryCache().find({ queryKey, exact: true }))
  }
  function onTploGeometrySaved({ command, revision }: TploGeometryConfirmation) {
    if (!mounted.current || scope.current.client !== client || scope.current.caseId !== image.caseId || scope.current.imageId !== image.id) return
    if (command.kind === "tplo-delete") { restoreTploAfterDeletion(command.id, revision, true, command); return }
    setTploHandoff({ client, caseId: image.caseId, imageId: image.id, id: command.id, revision, comparison: tplo.ui.comparison,
      queries: tploHandoffQueries(), command })
  }
  function restoreTploAfterDeletion(id: string, revision: number, removed: boolean, command?: TploGeometryConfirmation["command"]) {
    if (!mounted.current || scope.current.client !== client || scope.current.caseId !== image.caseId || scope.current.imageId !== image.id) return
    const plan = client.getQueryData<ImagePlan>(keys.imagePlan(image.caseId, image.id))
    const nextId = removed ? plan?.document.objects.find(object => object.type === "TPLO" && object.visible !== false && object.id.toLowerCase() !== id.toLowerCase())?.id ?? null : id
    setTploHandoff({ client, caseId: image.caseId, imageId: image.id, id: nextId, selectionId: id, revision, comparison: "original", queries: tploHandoffQueries(), command })
    setTool("pan")
  }
  function enterTplo(create = false) {
    if (tploDialogOpen || angleDeletion.request || circleDeletion.request || landmarksDeletion.request || deleteRequest || !tplo.canOpen) return
    const opened = create ? tplo.canCreate && tplo.beginNew(index => tTplo("entry.defaultName", { index })) ? "create" : null
      : tplo.open(index => tTplo("entry.defaultName", { index }))
    if (!opened || !chooseMeasurement("tplo")) return
    setTool(opened === "create" || opened === "edit" ? "mark" : "pan")
    focusViewerViewport()
  }
  function cancelTploGeometry(recovery = false) {
    const source = recovery ? tplo.recovery.command : visibleTploEditor
    if (!source || source.kind !== "tplo-create" && source.kind !== "tplo-update") return
    const revision = client.getQueryData<ImagePlan>(keys.imagePlan(image.caseId, image.id))?.revision
    if (!(recovery ? tplo.recovery.discard() : tplo.discard())) return
    setTool("pan")
    if (source.kind === "tplo-update" && revision !== undefined) setTploHandoff({ client, caseId: image.caseId, imageId: image.id,
      id: source.id, revision, comparison: "original", queries: tploHandoffQueries() })
    else focusViewerViewport()
  }

  function cancelLandmarksPlacement(): boolean {
    if (!landmarks.discard()) return false
    setLandmarksTarget("body")
    setTool("pan")
    focusViewerViewport()
    return true
  }
  function openLandmarks(intent: "edit" | "view" | "create" = "edit"): boolean {
    if (landmarksDeletion.request || circleDeletion.request || angleDeletion.request) return false
    if (intent === "create" && !landmarks.canOpen) return false
    const editing = intent !== "view" && landmarks.canOpen
    if (!(editing ? landmarks.open({ newOnly: intent === "create" }) : landmarks.selectSaved()) || !chooseMeasurement("landmarks")) return false
    setLandmarksTarget("body")
    setDistanceRequested(false)
    setTool(editing ? "mark" : "pan")
    if (intent !== "create") focusViewerViewport()
    return true
  }
  const canIntroduceLandmarks = toolsAvailable && landmarks.canOpen && landmarks.plan
    && !landmarks.plan.document.tplo_landmarks && !landmarks.editor
    && !landmarksDeletion.request && !circleDeletion.request && !angleDeletion.request
  const landmarksMethodDialog = landmarksMethodRequest && canIntroduceLandmarks
    && landmarksMethodRequest.generation === landmarks.contextGeneration
    && landmarksMethodRequest.revision === landmarks.plan?.revision ? landmarksMethodRequest : null
  useEffect(() => {
    if (landmarksMethodRequest && !landmarksMethodDialog) setLandmarksMethodRequest(null)
  }, [landmarksMethodRequest, landmarksMethodDialog])

  function enterLandmarks() {
    if (landmarks.editor) {
      openLandmarks()
    } else if (landmarks.plan?.document.tplo_landmarks) {
      openLandmarks("view")
    } else if (canIntroduceLandmarks && landmarks.plan) {
      setLandmarksMethodRequest({ generation: landmarks.contextGeneration, revision: landmarks.plan.revision,
        trigger: document.activeElement instanceof HTMLElement ? document.activeElement : null })
    }
  }
  function onLandmarksSaved(command: SaveLandmarksInput) {
    const saved = client.getQueryData<ImagePlan>(keys.imagePlan(image.caseId, image.id))
    if (!saved || saved.imageId.toLowerCase() !== image.id.toLowerCase() || hasImagePlanDraft(client, image.caseId, image.id)
      || !chooseMeasurement("landmarks")) return
    setLandmarksTarget("body")
    setDistanceRequested(false)
    setTool("pan")
    onSectionChange("tools")
    if (command.kind === "landmarks-clear") {
      requestAnimationFrame(() => {
        if (!mounted.current || scope.current.client !== client || scope.current.caseId !== image.caseId || scope.current.imageId !== image.id) return
        (document.querySelector<HTMLButtonElement>("[data-landmarks-tool]:not(:disabled):not([aria-disabled=true])")
          ?? document.querySelector<HTMLElement>("[data-calibration-viewport]"))?.focus({ preventScroll: true })
      })
    } else focusViewerViewport()
  }
  useEffect(() => {
    const handoff = calibrationHandoff
    if (!handoff) return
    if (handoff.client !== client || handoff.caseId !== image.caseId || handoff.imageId !== image.id || distance.deleting) {
      setCalibrationHandoff(null)
      return
    }
    // Wait for both observers to settle before opening Tools. Its availability
    // guard can send the user back to Calibration while the writer is unlocking.
    if (calibrationEditing || calibration.save.isPending || distance.planQuery.isFetching || !distance.plan) return
    if (distance.plan.revision !== handoff.revision || hasImagePlanDraft(client, image.caseId, image.id)) {
      setCalibrationHandoff(null)
      return
    }
    if (!toolsAvailable || !distance.canSelect) return

    let editingDistance = false
    if (handoff.createFirst && !distance.planQuery.isError) {
      if (distance.plan.document.objects.length >= 500) {
        toast.info(t("remote.distanceLimitTitle"), { description: t("remote.distanceLimitDescription") })
      } else {
        if (!distance.canCreate || !distance.beginCreate(index => tDistance("defaultName", { index }), handoff.revision)) return
        editingDistance = true
      }
    } else if (handoff.id && distance.select(handoff.id)) {
      display.setSegmentMeasure(handoff.id, "length")
      editingDistance = distance.canEdit && distance.beginUpdate(handoff.id)
    }
    setCalibrationHandoff(null)
    if (!chooseMeasurement("distance")) return
    setDistanceRequested(true)
    setDistanceTarget("body")
    setTool(editingDistance ? "mark" : "pan")
    onSectionChange("tools")
    if (editingDistance) focusViewerViewport()
  }, [calibrationHandoff, calibrationEditing, calibration.save.isPending, toolsAvailable, distance, client, image.caseId, image.id, onSectionChange, t, tDistance])
  function openDistance(measure: SegmentMeasure = "length") {
    if (!circle.closeCleanEditor()) return
    if (!distance.canSelect) return
    if (!angle.closeCleanEditor()) {
      toast.info(tAngle("finishEditingTitle"), { description: tAngle("finishEditingDescription") })
      return
    }
    const saved = client.getQueryData<ImagePlan>(keys.imagePlan(image.caseId, image.id))
    if (measure === "length" && distance.editor?.kind === "distance-create") {
      if (!chooseMeasurement("distance")) return
      setDistanceRequested(true)
      setTool("mark")
      focusViewerViewport()
      return
    }
    const target = saved && calibrationDistanceLine(saved, distance.selectedId)
    if (!target) {
      if (measure !== "length" || distance.editor || !chooseMeasurement("distance")) return
      const started = Boolean(saved && !saved.document.objects.some(object => object.type === "LINE")
        && distance.beginCreate(index => tDistance("defaultName", { index }), saved.revision))
      setDistanceRequested(true)
      setDistanceTarget("body")
      setTool(started ? "mark" : "pan")
      focusViewerViewport()
      return
    }
    if (distance.editor && distance.editor.id !== target.id) return
    if (!distance.editor) {
      if (distance.canEdit && !target.locked) {
        if (!distance.beginUpdate(target.id)) return
      } else if (!distance.select(target.id)) return
    }
    if (!chooseMeasurement("distance")) return
    display.setSegmentMeasure(target.id, measure)
    setDistanceRequested(true)
    setDistanceTarget("body")
    setTool("mark")
    focusViewerViewport()
  }
  function placeDistance() {
    if (!distance.placeLine()) return
    distanceActions.queueAutosave("pointer")
    setTool("mark")
    focusViewerViewport()
  }
  function newDistance() {
    if (deleteRequest || angleDeletion.request || circleDeletion.request || landmarksDeletion.request) return
    if (distance.editor?.kind === "distance-create" && distance.editor.untouched) {
      if (!distance.acceptGuideForNewDistance()) return
      const id = distance.editor.id, entry = calibrationEntry.current
      distanceActions.queueAutosave("pointer", revision => {
        if (mounted.current && entry === calibrationEntry.current && scope.current.client === client
          && scope.current.caseId === image.caseId && scope.current.imageId === image.id) {
          setNextDistanceAfterGuide({ id, revision, entry, client })
        }
      })
      return
    }
    if (!distance.beginCreate(index => tDistance("defaultName", { index })) || !chooseMeasurement("distance")) return
    distanceActions.queueAutosave("pointer")
    setDistanceRequested(true)
    setDistanceTarget("body")
    setTool("mark")
    focusViewerViewport()
  }
  function refreshDistanceRead() {
    const request = distance.refreshRead()
    if (!request) return
    focusAfterDistanceCancel.current = true
    void request
  }
  function cancelDistance() {
    if (!distance.discard()) return false
    cancelDistanceAutosave()
    setDistanceRequested(distance.editor?.kind === "distance-create")
    focusAfterDistanceCancel.current = true
    setTool("pan")
    setDistanceTarget("body")
    return true
  }
  useEffect(() => {
    if (!focusAfterDistanceCancel.current) return
    if (activeSection !== "tools") { focusAfterDistanceCancel.current = false; return }
    requestAnimationFrame(() => {
      if (mounted.current && focusAfterDistanceCancel.current) {
        (document.querySelector<HTMLButtonElement>("[data-distance-tool]:not(:disabled):not([aria-disabled=true])")
          ?? document.querySelector<HTMLButtonElement>("nav button[aria-pressed=true]:not(:disabled)"))?.focus({ preventScroll: true })
        if (!distance.loadingSaved && (!distance.recoveringSaved || distance.planQuery.isError)) focusAfterDistanceCancel.current = false
      }
    })
  }, [distance.editor, distance.loadingSaved, distance.recoveringSaved, distance.planQuery.isError, activeSection])
  function onDistanceSaved(id: string, deleted: boolean) {
    if (hasImagePlanDraft(client, image.caseId, image.id)) return
    if (!chooseMeasurement("distance")) return
    setTool("pan")
    setDistanceTarget("body")
    setDistanceRequested(deleted)
    onSectionChange("tools")
    requestAnimationFrame(() => {
      if (!mounted.current || scope.current.client !== client || scope.current.caseId !== image.caseId || scope.current.imageId !== image.id) return
      const rowSelector = deleted ? '[data-distance-row][aria-pressed="true"]' : `[data-distance-row="${id}"]`
      const focusTarget = document.querySelector<HTMLButtonElement>(`${rowSelector}:not(:disabled)`)
        ?? document.querySelector<HTMLButtonElement>("[data-distance-tool]:not(:disabled)")
        ?? document.querySelector<HTMLButtonElement>("nav button[aria-pressed=true]:not(:disabled)")
      focusTarget?.focus({ preventScroll: true })
    })
  }
  function selectDistance(id: string | null) {
    if (!circle.closeCleanEditor()) return
    if (!angle.closeCleanEditor()) return
    if (!distance.select(id)) return
    if (!chooseMeasurement("distance")) return
    if (!id) setDistanceRequested(false)
    setDistanceTarget("body")
    setTool("pan")
  }
  function selectAngle(id: string) {
    if (!angle.select(id) || !chooseMeasurement("angle")) return
    setDistanceRequested(false)
    setAngleTarget("body")
    setTool("pan")
  }
  function selectCircle(id: string) {
    if (!circle.select(id) || !chooseMeasurement("circle")) return
    const editable = circle.beginUpdate(id)
    setDistanceRequested(false)
    setCircleTarget("body")
    setTool(editable ? "mark" : "pan")
  }
  function onAngleSaved(id: string) {
    if (hasImagePlanDraft(client, image.caseId, image.id) || !chooseMeasurement("angle")) return
    setDistanceRequested(false)
    setAngleTarget("body")
    setTool("pan")
    onSectionChange("tools")
    requestAnimationFrame(() => {
      if (mounted.current && scope.current.client === client && scope.current.caseId === image.caseId && scope.current.imageId === image.id) {
        (document.querySelector<HTMLButtonElement>(`[data-angle-row="${id}"]:not(:disabled)`)
          ?? document.querySelector<HTMLButtonElement>("[data-angle-tool]:not(:disabled):not([aria-disabled=true])")
          ?? document.querySelector<HTMLElement>("[data-calibration-viewport]"))?.focus({ preventScroll: true })
      }
    })
  }
  function editAngle() {
    if (!angle.selectedId || !angle.beginUpdate(angle.selectedId)) return false
    setTool("mark")
    return true
  }
  function refreshAngleRead() {
    void angle.refreshRead()
  }
  function openAngle() {
    const result = angle.open(index => tAngle("defaultName", { index }))
    if (!result || !chooseMeasurement("angle")) return
    setDistanceRequested(false)
    setAngleTarget("body")
    setTool(result === "select" ? "pan" : "mark")
    focusViewerViewport()
  }
  function newAngle() {
    if (!angle.beginNew(index => tAngle("defaultName", { index })) || !chooseMeasurement("angle")) return
    setDistanceRequested(false)
    setAngleTarget("body")
    setTool("mark")
    focusViewerViewport()
  }
  function placeAngleCentered() {
    const editor = angle.editor
    if (!editor || editor.kind !== "angle-create" || editor.placement.step === "complete"
      || !angle.placeCentered(editor.id, editor.placement.step)) return
    setAngleTarget("body")
    setTool("mark")
    focusViewerViewport()
  }
  function cancelAngle() {
    if (!angle.discard()) return
    setAngleTarget("body")
    setTool("pan")
    focusViewerViewport()
  }
  function openSavedCircles() {
    // Preserve standalone objects and unfinished drafts from the earlier flow.
    // This entry must never create another independent circle.
    const saved = client.getQueryData<ImagePlan>(keys.imagePlan(image.caseId, image.id))
    if (!circle.editor && !saved?.document.objects.some(object => object.type === "CIRCLE" && object.visible !== false)) return
    const result = circle.open(index => tCircle("defaultName", { index }))
    if (!result || !chooseMeasurement("circle")) return
    setDistanceRequested(false)
    setCircleTarget("body")
    setTool(result === "select" ? "pan" : "mark")
    focusViewerViewport()
  }
  function placeCircleCentered() {
    const editor = circle.editor
    if (!editor || editor.kind !== "circle-create" || editor.placement.step === "complete"
      || !circle.placeCentered(editor.id, editor.placement.step)) return
    setCircleTarget("body")
    setTool("mark")
    focusViewerViewport()
  }
  function restoreCircleFocus(id: string | null) {
    const entry = calibrationEntry.current
    requestAnimationFrame(() => {
      if (!mounted.current || entry !== calibrationEntry.current || scope.current.client !== client
        || scope.current.caseId !== image.caseId || scope.current.imageId !== image.id || hasImagePlanDraft(client, image.caseId, image.id)) return
      const row = id ? document.querySelector<HTMLButtonElement>(`[data-circle-row="${id}"]:not(:disabled)`) : null
      const target = row ?? document.querySelector<HTMLButtonElement>("[data-circle-tool]:not(:disabled):not([aria-disabled=true])")
        ?? document.querySelector<HTMLElement>("[data-calibration-viewport]")
      target?.focus({ preventScroll: true })
    })
  }
  function cancelCircle(): boolean {
    if (!circle.discard()) return false
    setCircleTarget("body")
    setTool("pan")
    restoreCircleFocus(client.getQueryData<string | null>(keys.imageCircleSelection(image.caseId, image.id)) ?? null)
    return true
  }
  function onCircleSaved(id: string) {
    if (hasImagePlanDraft(client, image.caseId, image.id) || !chooseMeasurement("circle")) return
    setDistanceRequested(false)
    setCircleTarget("body")
    setTool("pan")
    onSectionChange("tools")
    restoreCircleFocus(client.getQueryData<string | null>(keys.imageCircleSelection(image.caseId, image.id)) ?? id)
  }
  function editCircle(): boolean {
    if (!circle.selectedId || !circle.beginUpdate(circle.selectedId)) return false
    setTool("mark")
    return true
  }
  function refreshCircleRead() {
    void circle.refreshRead()
  }
  function editDistance() {
    if (!distance.selectedId || !distance.beginUpdate(distance.selectedId)) return
    setDistanceTarget("body")
    setTool("mark")
    focusViewerViewport()
  }
  const distanceEditor = distance.editor && distance.editor.kind !== "distance-delete" ? distance.editor : null
  const selectedIndex = distances.findIndex(item => item.line.id === distance.selectedId)
  const selectedDistance = distances[selectedIndex]?.line
  const distanceName = distanceEditor?.kind === "distance-create" ? distanceEditor.label || tDistance("title")
    : selectedDistance?.label?.trim() || (selectedIndex >= 0 ? tDistance("defaultName", { index: selectedIndex + 1 }) : tDistance("title"))
  const segmentValueId = distanceEditor?.id ?? selectedDistance?.id
  const segmentMeasure = segmentMeasureFor(segmentValueId ?? "", display.settings.segmentMeasures)
  const canChangeSegmentMeasure = Boolean(segmentValueId) && !distance.locked && !distance.deleting
    && !distance.planQuery.isError && !caseLocked
  const angleActive = activeMeasurement === "angle"
  const circleActive = activeMeasurement === "circle"
  const landmarksVisible = panelSection === "tools" && toolsAvailable && activeMeasurement === "landmarks"
  const visibleLandmarksEditor = landmarksVisible && !landmarksRecovery.active && landmarks.editor?.kind === "landmarks-set" ? landmarks.editor : null
  const landmarksPlacement = visibleLandmarksEditor && !landmarks.geometry
    ? { landmarks: visibleLandmarksEditor.landmarks, activePoint: visibleLandmarksEditor.activePoint } : null
  const canEditLandmarks = landmarks.canEdit && !landmarks.needsRebase && landmarksDimensionsAvailable && !landmarksRecovery.active
  const canPlaceLandmarks = Boolean(landmarksPlacement) && canEditLandmarks
  const canAdjustLandmarks = Boolean(visibleLandmarksEditor && landmarks.geometry) && canEditLandmarks
  const landmarksPreviewOwner = visibleLandmarksEditor && !landmarksPlacement ? JSON.stringify([image.caseId, image.id,
    visibleLandmarksEditor.baseRevision, landmarks.contextGeneration, visibleLandmarksEditor.landmarks, canAdjustLandmarks, display.settings.mirrored, tool]) : null
  const onLandmarksGeometryPreview = useCallback((geometry: LandmarksGeometry | null) => {
    setLandmarksGesture(current => geometry && landmarksPreviewOwner ? { owner: landmarksPreviewOwner, client, geometry }
      : current?.owner === landmarksPreviewOwner && current.client === client ? null : current)
  }, [landmarksPreviewOwner, client])
  const landmarksGestureGeometry = landmarksGesture?.owner === landmarksPreviewOwner && landmarksGesture.client === client ? landmarksGesture.geometry : null
  const landmarksPreviewGeometry = visibleLandmarksEditor && !landmarksPlacement && (landmarks.hasChanges || landmarksGestureGeometry)
    ? landmarksGestureGeometry ?? landmarks.geometry : null
  const landmarksPreview: LandmarksPreview | null = landmarksPreviewGeometry ? { geometry: landmarksPreviewGeometry,
    values: canAdjustLandmarks && !landmarksReadUnverified ? landmarksValuesPreview(landmarksPreviewGeometry,
      { widthPx: image.widthPx ?? 0, heightPx: image.heightPx ?? 0 }, landmarks.plan?.document.calibration) : null } : null
  const landmarksActionEditor = landmarks.editor?.kind === "landmarks-set" ? landmarks.editor : null
  const landmarksActionGeometry = landmarksGestureGeometry ?? landmarks.geometry
  const landmarksActionAnchor = landmarksActionGeometry ? landmarksTarget === "body"
    ? { x: (landmarksActionGeometry.plateau_cranial.x + landmarksActionGeometry.plateau_caudal.x) / 2,
      y: (landmarksActionGeometry.plateau_cranial.y + landmarksActionGeometry.plateau_caudal.y) / 2 } : landmarksActionGeometry[landmarksTarget]
    : landmarksActionEditor ? landmarksActionEditor.landmarks[landmarksActionEditor.activePoint]
      ?? LANDMARK_POINT_NAMES.map(name => landmarksActionEditor.landmarks[name]).filter(point => Boolean(point)).at(-1) ?? null : null
  const showLandmarksActions = landmarksVisible && !landmarksDeletion.request && Boolean(landmarksActionEditor)
    && (!landmarksPlacement || landmarks.needsRebase || landmarks.planQuery.isError || landmarksRecovery.active)
    && (landmarks.hasChanges || landmarks.needsRebase || landmarks.planQuery.isError || landmarksRecovery.active)
  const canPresentLandmarks = Boolean(savedLandmarks || landmarks.geometry) && !landmarks.deleting && !caseLocked && !landmarksRecovery.active
  const landmarksMethod = visibleLandmarksEditor?.landmarks.method ?? savedLandmarks?.landmarks.method
  const circleVisible = panelSection === "tools" && toolsAvailable && circleActive
  const visibleCircleEditor = circleVisible && circle.editor && circle.editor.kind !== "circle-delete" ? circle.editor : null
  const circleCreating = visibleCircleEditor?.kind === "circle-create"
  const circlePlacing = Boolean(circle.placement && circle.placement.step !== "complete")
  const selectedCircleIndex = circles.findIndex(item => item.circle.id.toLowerCase() === circle.selectedId?.toLowerCase())
  const selectedCircleEntry = circles[selectedCircleIndex]
  const selectedCircle = selectedCircleEntry?.circle
  const circleValueId = visibleCircleEditor?.id ?? selectedCircle?.id
  const circleMeasure = circleMeasureFor(circleValueId ?? "", display.settings.circleMeasures)
  const circleValueVisible = !display.settings.hiddenCircleValues?.some(id => id.toLowerCase() === circleValueId?.toLowerCase())
  const circleName = visibleCircleEditor?.kind === "circle-create" ? visibleCircleEditor.label || tCircle("title")
    : selectedCircle?.label?.trim() || (selectedCircleIndex >= 0 ? tCircle("defaultName", { index: selectedCircleIndex + 1 }) : tCircle("title"))
  const circleGeometry = circle.geometry ?? selectedCircle
  const canAdjustCircle = circle.canEdit && !circle.needsRebase && Boolean(circleGeometry && circleHasValidRadius(circleGeometry)) && !selectedCircle?.locked
  const canPresentCircle = Boolean(circleValueId) && !selectedCircleEntry?.ambiguous && !circle.deleting && !caseLocked
  const circlePreviewOwner = visibleCircleEditor ? JSON.stringify([image.caseId, image.id, visibleCircleEditor.kind,
    visibleCircleEditor.id, visibleCircleEditor.baseRevision, circle.contextGeneration, circle.geometry]) : null
  const onCircleGeometryPreview = useCallback((geometry: CircleGeometry | null) => {
    setCircleGesture(current => geometry && circlePreviewOwner ? { owner: circlePreviewOwner, client, geometry }
      : current?.owner === circlePreviewOwner && current.client === client ? null : current)
  }, [circlePreviewOwner, client])
  const circleGestureGeometry = circleGesture?.owner === circlePreviewOwner && circleGesture.client === client ? circleGesture.geometry : null
  const circlePreviewGeometry = visibleCircleEditor && (circle.hasChanges || circleGestureGeometry) ? circleGestureGeometry ?? circle.geometry : null
  const previewCircleValues = circlePreviewGeometry && circle.plan?.imageId === image.id && circle.plan.revision === visibleCircleEditor?.baseRevision
    && preview.ready && !circle.deleting && !caseLocked && !circle.issue && !circle.planQuery.isError
    && hasConfirmedImageScale(circle.plan, image.id) && hasUniquePlanObjectIds(circle.plan.document) && !circle.needsRebase && circle.receipt.phase !== "conflict"
    ? circleValuesPreview(circlePreviewGeometry, { widthPx: image.widthPx ?? 0, heightPx: image.heightPx ?? 0 }, circle.plan.document.calibration) : null
  const circlePreview: CirclePreview | null = visibleCircleEditor && circlePreviewGeometry
    ? { id: visibleCircleEditor.id, geometry: circlePreviewGeometry, values: previewCircleValues } : null
  const circleActionGeometry = circleGestureGeometry ?? circle.geometry
  const circleActionAnchor = circleActionGeometry ? circleActionGeometry[circleTarget === "body" ? "center" : "edge"] : null
  const showCircleActions = Boolean(visibleCircleEditor && !circlePlacing && (circle.hasChanges || circle.needsRebase || circle.planQuery.isError || circleRecovery.active))
  const angleVisible = panelSection === "tools" && toolsAvailable && angleActive
  const distanceActive = activeMeasurement === "distance" && (distanceRequested || Boolean(distance.editor || distance.selectedId))
  const distanceVisible = panelSection === "tools" && toolsAvailable && distanceActive
  // Keep an editable saved selection ready for direct dragging after selecting,
  // saving or discarding. A clean editor performs no write and has no changes.
  // An explicit Pan choice remains intact while that editor is already open.
  useEffect(() => {
    if (caseLocked || tploDialogOpen || angleDeletion.request || circleDeletion.request || landmarksDeletion.request
      || requestedDistanceDeletion?.client === client && requestedDistanceDeletion.caseId === image.caseId && requestedDistanceDeletion.imageId === image.id
      || hasImagePlanDraft(client, image.caseId, image.id)) return
    const ready = distanceVisible && !distance.editor && distance.canEdit && distance.selectedId
      ? distance.beginUpdate(distance.selectedId)
      : angleVisible && !angle.editor && angle.canEdit && angle.selectedId ? angle.beginUpdate(angle.selectedId)
      : circleVisible && !circle.editor && circle.canEdit && circle.selectedId ? circle.beginUpdate(circle.selectedId) : false
    if (ready) setTool("mark")
  }, [caseLocked, tploDialogOpen, angleDeletion.request, circleDeletion.request, landmarksDeletion.request, requestedDistanceDeletion, client, image.caseId, image.id,
    distanceVisible, angleVisible, circleVisible, distance, angle, circle])
  const distanceEditing = distanceVisible && Boolean(distanceEditor)
  const visibleDistanceEditor = distanceEditing ? distanceEditor : null
  const visibleAngleEditor = angleVisible && angle.editor && angle.editor.kind !== "angle-delete" ? angle.editor : null
  const selectedAngleEntry = angles.find(item => item.angle.id.toLowerCase() === angle.selectedId?.toLowerCase())
  const selectedAngle = selectedAngleEntry?.angle
  const anglePlacing = Boolean(angle.placement && angle.placement.step !== "complete")
  const angleValueId = visibleAngleEditor?.id ?? selectedAngle?.id
  const angleValueVisible = !display.settings.hiddenAngleValues?.some(id => id.toLowerCase() === angleValueId?.toLowerCase())
  const angleName = visibleAngleEditor?.kind === "angle-create" ? visibleAngleEditor.label || tAngle("title") : selectedAngle?.label?.trim() || tAngle("title")
  const canStartNewAngle = angle.canEdit && !angle.hasChanges && !angleRecovery.active && Boolean(angle.plan && angle.plan.document.objects.length < 500)
  const anglePreviewOwner = visibleAngleEditor ? JSON.stringify([image.caseId, image.id, visibleAngleEditor.kind,
    visibleAngleEditor.id, visibleAngleEditor.baseRevision, angle.contextGeneration, angle.geometry]) : null
  const onAngleGeometryPreview = useCallback((geometry: AngleGeometry | null) => {
    setAngleGesture(current => geometry && anglePreviewOwner ? { owner: anglePreviewOwner, client, geometry }
      : current?.owner === anglePreviewOwner && current.client === client ? null : current)
  }, [anglePreviewOwner, client])
  const angleGestureGeometry = angleGesture?.owner === anglePreviewOwner && angleGesture?.client === client ? angleGesture.geometry : null
  const anglePreviewGeometry = visibleAngleEditor && (angle.hasChanges || angleGestureGeometry) ? angleGestureGeometry ?? angle.geometry : null
  const previewDegrees = anglePreviewGeometry && angle.plan?.imageId === image.id && angle.plan.revision === visibleAngleEditor?.baseRevision
    && preview.ready && !angle.deleting && !caseLocked && !angle.issue && !angle.planQuery.isError
    && hasConfirmedImageScale(angle.plan, image.id) && !angle.needsRebase && angle.receipt.phase !== "conflict"
    ? angleDegreesPreview(anglePreviewGeometry) : null
  const anglePreview: AnglePreview | null = visibleAngleEditor && anglePreviewGeometry
    ? { id: visibleAngleEditor.id, geometry: anglePreviewGeometry, degrees: previewDegrees } : null
  const angleActionGeometry = angleGestureGeometry ?? angle.geometry
  const angleActionAnchor = angleActionGeometry ? angleActionGeometry[angleTarget === "body" ? "vertex" : angleTarget] : null
  const showAngleActions = Boolean(visibleAngleEditor && !anglePlacing && (angle.hasChanges || angle.needsRebase || angle.planQuery.isError || angleRecovery.active))
  const anglePicking = { angles: angles.map(item => item.angle), selectedId: angle.selectedId,
    enabled: angleVisible && angle.canSelect && !angle.hasChanges && !angleRecovery.active, onSelect: selectAngle }
  const circlePicking = { circles: circles.map(item => item.circle), selectedId: circle.selectedId,
    enabled: circleVisible && circleDrawingAvailable && circle.canSelect && !circle.hasChanges && !circleRecovery.active, onSelect: selectCircle }
  const distancePreviewOwner = visibleDistanceEditor ? JSON.stringify([image.caseId, image.id, visibleDistanceEditor.kind,
    visibleDistanceEditor.id, visibleDistanceEditor.baseRevision, visibleDistanceEditor.geometry]) : null
  const onDistanceGeometryPreview = useCallback((geometry: DistanceGeometry | null) => {
    setDistanceGesture(current => geometry && distancePreviewOwner ? { owner: distancePreviewOwner, client, geometry }
      : current?.owner === distancePreviewOwner && current.client === client ? null : current)
  }, [distancePreviewOwner, client])
  const gestureGeometry = distanceGesture?.owner === distancePreviewOwner && distanceGesture?.client === client ? distanceGesture.geometry : null
  const previewGeometry = visibleDistanceEditor && (visibleDistanceEditor.kind === "distance-create" || distance.hasChanges || gestureGeometry)
    ? gestureGeometry ?? visibleDistanceEditor.geometry : null
  const previewLength = previewGeometry && distance.plan?.imageId === image.id && distance.plan.revision === visibleDistanceEditor?.baseRevision
    && !distance.issue && !distance.planQuery.isError && distance.receipt.phase !== "conflict" && image.widthPx && image.heightPx
    ? distanceLengthPreview(previewGeometry, { widthPx: image.widthPx, heightPx: image.heightPx }, distance.plan.document.calibration) : null
  const distancePreview: DistancePreview | null = visibleDistanceEditor && previewGeometry && previewLength !== null
    ? { id: visibleDistanceEditor.id, geometry: previewGeometry, lengthMm: previewLength } : null
  const showDistanceIntersections = distanceVisible && segmentMeasure === "length" && !distance.issue && !distance.planQuery.isError
  const savedIntersections = useMemo(() => showDistanceIntersections && image.widthPx && image.heightPx
    ? distanceIntersections(distances.map(item => item.line), { widthPx: image.widthPx, heightPx: image.heightPx }) : [],
  [showDistanceIntersections, distances, image.widthPx, image.heightPx])
  const activeDistanceId = visibleDistanceEditor?.id ?? distance.selectedId
  const activeIntersections = showDistanceIntersections && distancePreview && image.widthPx && image.heightPx
    ? distanceIntersections(distances.map(item => item.line), { widthPx: image.widthPx, heightPx: image.heightPx },
      { id: distancePreview.id, ...distancePreview.geometry }) : []
  const replacingActive = Boolean(visibleDistanceEditor && (previewGeometry || distance.hasChanges))
  const orderedSavedIntersections = useMemo(() => {
    const selected = [], other = []
    for (const intersection of savedIntersections) {
      if (intersection.firstId !== activeDistanceId && intersection.secondId !== activeDistanceId) other.push(intersection)
      else if (!replacingActive) selected.push(intersection)
    }
    return selected.length ? [...selected, ...other] : other
  }, [activeDistanceId, replacingActive, savedIntersections])
  const intersections = activeIntersections.length ? [...activeIntersections, ...orderedSavedIntersections] : orderedSavedIntersections
  const actionGeometry = gestureGeometry ?? visibleDistanceEditor?.geometry
  const actionAnchor = actionGeometry ? distanceTarget === "body"
    ? visibleDistanceEditor?.kind === "distance-create" && distances.length ? actionGeometry.start
      : { x: (actionGeometry.start.x + actionGeometry.end.x) / 2, y: (actionGeometry.start.y + actionGeometry.end.y) / 2 }
    : actionGeometry[distanceTarget] : null
  const showDistanceActions = distanceEditing && !distance.save.isPending && (distance.needsRebase || distance.planQuery.isError
    || ["uncertain", "error", "conflict"].includes(distance.receipt.phase))
  const deleteDraft = distance.editor?.kind === "distance-delete" ? distance.editor : null
  useEffect(() => {
    if (deleteDraft) {
      if (activeSection !== "tools") onSectionChange("tools")
    }
  }, [deleteDraft?.id, activeSection, onSectionChange])
  const scopedDeleteRequest = requestedDistanceDeletion?.client === client && requestedDistanceDeletion.caseId === image.caseId
    && requestedDistanceDeletion.imageId === image.id ? requestedDistanceDeletion : null
  const deleteRequest: DistanceDeletionRequest | null = deleteDraft ? { id: deleteDraft.id, baseRevision: deleteDraft.baseRevision,
    name: distances.find(item => item.line.id === deleteDraft.id)?.line.label?.trim()
      || (scopedDeleteRequest?.id === deleteDraft.id ? scopedDeleteRequest.name : null) || tDistance("title"),
    caseId: image.caseId, imageId: image.id, client } : scopedDeleteRequest
  const deletePhase = deleteDraft ? distance.receipt.phase : "idle"
  const deleteConflict = Boolean(deleteRequest && (distance.needsRebase || deletePhase === "conflict"
    || distance.plan && distance.plan.revision !== deleteRequest.baseRevision))
  const deletePending = distance.save.isPending || deletePhase === "saving" || deletePhase === "checking"
  useEffect(() => {
    if (!nextDistanceAfterGuide) return
    const next = nextDistanceAfterGuide
    if (next.client !== client || next.entry !== calibrationEntry.current || activeSection !== "tools"
      || activeMeasurement !== "distance" || distance.deleting) {
      setNextDistanceAfterGuide(null)
      return
    }
    if (distance.save.isPending || distance.planQuery.isFetching || !distance.plan) return
    if (distance.plan.revision !== next.revision || hasImagePlanDraft(client, image.caseId, image.id) || distance.planQuery.isError
      || !distances.some(({ line }) => line.id === next.id)) {
      setNextDistanceAfterGuide(null)
      return
    }
    if (!distance.canCreate || deleteRequest || angleDeletion.request || circleDeletion.request || landmarksDeletion.request) return
    setNextDistanceAfterGuide(null)
    newDistance()
  }, [nextDistanceAfterGuide, client, image.caseId, image.id, activeSection, activeMeasurement, distance, distances, deleteRequest,
    angleDeletion.request, circleDeletion.request, landmarksDeletion.request])
  function canDeleteDistance(id: string) {
    const line = distances.find(item => item.line.id === id)?.line
    return Boolean(line && !line.locked && distance.canEdit && !distance.hasChanges && !distanceDeletionPending.current
      && (!distance.editor || distance.editor.kind === "distance-update" && distance.editor.id === id))
  }
  function requestDistanceDeletion(id: string) {
    if (!canDeleteDistance(id) || !distance.plan) return
    const latest = client.getQueryData<ImagePlan>(keys.imagePlan(image.caseId, image.id))
    if (latest?.revision !== distance.plan.revision) return
    setRequestedDistanceDeletion({ id, baseRevision: distance.plan.revision,
      name: distances.find(item => item.line.id === id)?.line.label?.trim() || tDistance("title"),
      caseId: image.caseId, imageId: image.id, client })
  }
  function cancelDistanceDeletion() {
    if (distanceDeletionPending.current || distance.locked || distance.deleting) return
    if (deleteDraft && !cancelDistance()) return
    setRequestedDistanceDeletion(null)
    requestAnimationFrame(() => {
      if (mounted.current) (document.querySelector<HTMLButtonElement>(`[data-distance-delete="${deleteRequest?.id}"]:not(:disabled)`)
        ?? document.querySelector<HTMLButtonElement>("[data-distance-tool]:not(:disabled)")
        ?? document.querySelector<HTMLButtonElement>("nav button[aria-pressed=true]:not(:disabled)"))?.focus({ preventScroll: true })
    })
  }
  async function confirmDistanceDeletion() {
    const request = deleteRequest
    if (!request || distanceDeletionPending.current || !mounted.current || distance.deleting
      || scope.current.client !== request.client || scope.current.caseId !== request.caseId || scope.current.imageId !== request.imageId) return
    if (deletePhase !== "uncertain") {
      if (distance.planQuery.isError) { await distance.refreshRead(); return }
      const latest = client.getQueryData<ImagePlan>(keys.imagePlan(image.caseId, image.id))
      if (!latest || client.getQueryState(keys.imagePlan(image.caseId, image.id))?.fetchStatus === "fetching") return
      if (latest.revision > request.baseRevision && !latest.document.objects.some(object => object.id.toLowerCase() === request.id.toLowerCase())) {
        if (!distance.discard()) return
        setRequestedDistanceDeletion(null)
        onDistanceSaved(request.id, true)
        toast.info(tDistance("alreadyRemovedTitle"), { description: tDistance("alreadyRemovedDescription") })
        return
      }
      if (deleteConflict || latest.revision !== request.baseRevision) {
        if (cancelDistance()) setRequestedDistanceDeletion(null)
        return
      }
      if (!deleteDraft && !distance.beginDelete(request.id, request.baseRevision)) return
    }
    setDistanceRequested(true)
    distanceDeletionPending.current = true
    try {
      const result = await (deletePhase === "uncertain" ? distanceActions.check() : distanceActions.save())
      if (mounted.current && scope.current.client === request.client && scope.current.caseId === request.caseId && scope.current.imageId === request.imageId
        && result?.phase === "saved") setRequestedDistanceDeletion(null)
    } finally { distanceDeletionPending.current = false }
  }
  const picking = { lines: distances.map(item => item.line), selectedId: distance.selectedId,
    enabled: distanceVisible && distance.canSelect && !distance.hasChanges, onSelect: (id: string) => selectDistance(id) }
  function nudgeDistance(event: KeyboardEvent<HTMLButtonElement>, target: DistanceAdjustmentTarget) {
    if (!distanceEditor || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return
    event.preventDefault()
    if (distance.nudge(target, event, display.settings.mirrored, distanceEditor.id)) distanceActions.queueAutosave("keyboard")
  }
  function nudgeAngle(event: KeyboardEvent<HTMLButtonElement>, target: AngleAdjustmentTarget) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return
    event.preventDefault()
    const id = visibleAngleEditor?.id ?? selectedAngle?.id
    if (!id || (!visibleAngleEditor && !angle.beginUpdate(id))) return
    if (angle.nudge(target, event, display.settings.mirrored, id)) { setAngleTarget(target); setTool("mark") }
  }
  function nudgeCircle(event: KeyboardEvent<HTMLButtonElement>, target: CircleAdjustmentTarget) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return
    event.preventDefault()
    const id = visibleCircleEditor?.id ?? selectedCircle?.id
    if (!id || (!visibleCircleEditor && !circle.beginUpdate(id))) return
    if (circle.nudge(target, event, display.settings.mirrored, id)) { setCircleTarget(target); setTool("mark") }
  }
  function selectLandmarksAdjustmentTarget(target: LandmarksAdjustmentTarget) {
    if (!canAdjustLandmarks || !visibleLandmarksEditor || !landmarks.selectPoint(target === "body" ? visibleLandmarksEditor.activePoint : target)) return
    setLandmarksTarget(target)
    setTool("mark")
    focusViewerViewport()
  }
  function nudgeLandmarks(event: KeyboardEvent<HTMLButtonElement>, target: LandmarksAdjustmentTarget) {
    if (!canAdjustLandmarks || event.ctrlKey || event.metaKey || event.altKey || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return
    event.preventDefault()
    if (landmarks.nudge(target, event, display.settings.mirrored)) { setLandmarksTarget(target); setTool("mark") }
  }
  function setAngleDegrees(degrees: number) {
    const id = visibleAngleEditor?.id ?? selectedAngle?.id
    if (!id || (!visibleAngleEditor && !angle.beginUpdate(id)) || !angle.setDegrees(degrees, id)) return false
    setAngleTarget("end")
    setTool("mark")
    focusViewerViewport()
    return true
  }
  const circleValues = <CaseImageCircleValues circles={circles} selectedId={circle.selectedId} creating={circleCreating} preview={circlePreview} measures={display.settings.circleMeasures}
    selectionDisabled={!circle.canSelect || circle.hasChanges || circleRecovery.active} onSelect={selectCircle} />
  const angleValues = <CaseImageAngleValues angles={angles} selectedId={angle.selectedId} preview={anglePreview} placing={Boolean(angle.placement && angle.placement.step !== "complete")}
    selectionDisabled={!angle.canSelect || angle.hasChanges || angleRecovery.active} onSelect={selectAngle} />
  const editing = activeSection === "calibration" && calibrationEditing && calibration.canEdit
  const conflict = calibration.receipt.phase === "conflict" || calibration.needsRebase
  const discardLabel = t(conflict ? "remote.loadSaved" : "reset")
  const imageActionLabel = calibrationEditing ? discardLabel : tImage("reset")
  const landmarksProtocol = <CaseImageLandmarksProtocol data={clinicalProtocol.data} error={clinicalProtocol.isError}
    loading={clinicalProtocol.isFetching} canRetry={!clinicalProtocol.isFetching && !landmarks.deleting && !caseLocked}
    onRetry={() => { if (!clinicalProtocol.isFetching && !landmarks.deleting && !caseLocked) void clinicalProtocol.refetch() }} />
  const tploDeleteButton = tplo.selectedId && (tplo.editor?.kind === "tplo-update" || !tplo.editor) ? <CaseImageTploDeleteButton id={tplo.selectedId}
    enabled={!tploDialogOpen && !tploGestureActive && rotationGestureDegrees === null && tploDeletion.canRequest(tplo.selectedId)} onRequest={() => tploDeletion.open(tplo.selectedId!)} /> : null
  const tploNewAction = <CaseImageTploNewAction enabled={tplo.canCreate && !tploDialogOpen && !tploGestureActive && rotationGestureDegrees === null} onCreate={() => enterTplo(true)} />
  return <>
    <CaseWorkspacePanel activeSection={panelSection} calibrationAvailable={(preview.ready || measurementIntent) && !caseLocked && !calibration.deleting}
      calibrationEditing={calibrationEditing && !calibration.planQuery.isError}
      toolsDisabled={!measurementIntent && !distance.recoveringSaved && (calibration.planQuery.isPending || (calibration.planQuery.isFetching && !calibration.measurementEligible))}
      toolsContent={toolsAvailable ? <CaseImageToolsPanel
        tploActive={tploVisible} tploEntry={{ disabled: !tplo.canOpen || tploDialogOpen || Boolean(angleDeletion.request || circleDeletion.request || landmarksDeletion.request || deleteRequest), onOpen: () => enterTplo() }}
        readError={!angleActive && !circleActive && distance.planQuery.isError && !distanceEditor} canRetryRead={distance.canRetryRead} onRetryRead={refreshDistanceRead} loading={distance.loadingSaved}
        distanceActive={distanceActive && segmentMeasure === "length"} angleActive={angleActive}
        landmarksActive={activeMeasurement === "landmarks"} landmarksEntry={{ disabled: !(landmarks.canOpen || landmarks.canSelect && Boolean(savedLandmarks))
          || tploDialogOpen || Boolean(landmarksDeletion.request || angleDeletion.request || circleDeletion.request), onOpen: enterLandmarks }}
        circleActive={circleActive || distanceActive && segmentMeasure !== "length"}
        angleEntry={{ disabled: tploDialogOpen || !angle.canEdit || angleRecovery.active || Boolean(angleDeletion.request || circleDeletion.request || landmarksDeletion.request), onOpen: openAngle }}
        circleEntry={{ disabled: circle.hasChanges || circleRecovery.active || angle.hasChanges || angleRecovery.active
          || tploDialogOpen || !distance.canSelect || !distances.length || Boolean(circleDeletion.request || angleDeletion.request || landmarksDeletion.request),
          onOpen: () => openDistance(segmentMeasure === "length" ? "diameter" : segmentMeasure) }}
        savedCircleEntry={circles.length ? { disabled: tploDialogOpen || !circle.canSelect || circleRecovery.active || Boolean(circleDeletion.request || angleDeletion.request || landmarksDeletion.request), onOpen: openSavedCircles } : undefined}
        openDisabled={tploDialogOpen || circle.hasChanges || circleRecovery.active || angle.hasChanges || angleRecovery.active || !distance.canSelect || Boolean(landmarksDeletion.request)} onOpen={() => openDistance()} /> : null}
      calibrationUnavailableReason={tImage("unavailable")}
      calibrationActions={<button aria-label={imageActionLabel}
        className="motion-interactive flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-token-md)] text-content-secondary outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
        disabled={calibration.deleting || (calibrationEditing && calibration.locked)}
        onClick={calibrationEditing ? discardCalibration : display.reset} title={imageActionLabel} type="button">
        <RotateCcw aria-hidden="true" className="size-4" strokeWidth={1.5} />
      </button>}
      caseContext={caseContext} imageList={imageList} imageActions={imageActions} onSectionChange={selectSection}>
      {calibrationEditing && !calibration.planQuery.isError ? <CaseImageCalibrationPanel calibration={calibration} interactionBlocked={introductionOpen} onSave={() => void save()} onCheck={() => void save(true)} onPlace={() => {
        calibration.placeMarker(); setTool("mark")
        requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-calibration-viewport]")?.focus({ preventScroll: true }))
      }} onCancel={discardCalibration} /> : <CaseImageOptionsPanel calibration={calibration} display={display} onCalibrate={() => void startCalibration()} />}
    </CaseWorkspacePanel>
    <CasePreviewPanel image={image} preview={preview} display={display.settings} interactionContext={client} simulation={tploSimulation}
      editorControls={panelSection === "tools" && tploRecoveryVisible && !tploDeletion.committed ? <CaseImageTploRecovery recovery={tploRecovery}
        onCheck={tploRecovery.command?.kind === "tplo-create" || tploRecovery.command?.kind === "tplo-update" ? () => void tploGeometryActions.check() : undefined}
        onDiscard={tploRecovery.command?.kind === "tplo-create" || tploRecovery.command?.kind === "tplo-update" ? () => cancelTploGeometry(true) : undefined} />
        : parameterEditor ? <CaseImageTploParameters fields={parameterEditor.parameterFields ?? tploParameterFields(tplo.plan?.document.tplo, parameterEditor.parameters)}
          canEdit={tplo.canEdit} canSave={tplo.canSave} canCancel={!tplo.locked && !tplo.deleting} stale={tplo.needsRebase}
          readFailure={tplo.planQuery.isError ? { canRetry: tplo.canRetryRead, onRetry: () => { void tplo.refreshRead() } } : undefined}
          onChange={tplo.changeParameterFields} onSave={() => void tploParameterActions.save()} onCancel={() => { if (tplo.discard()) { setTool("pan"); focusViewerViewport() } }} />
        : visibleTploEditor && tploFragmentDrawing ? <CaseImageTploFragmentDrawing
          name={visibleTploEditor.kind === "tplo-create" ? visibleTploEditor.label?.trim() || tTplo("read.title") : selectedSavedTplo?.object.label?.trim() || tTplo("read.title")}
          count={visibleTploEditor.fragment?.points.length ?? 0} canEdit={tplo.canEdit && !tploDialogOpen && !tploGestureActive} marking={tool === "mark"}
          stale={tplo.needsRebase}
          onMark={() => { if (tplo.canEdit) { setTool("mark"); focusViewerViewport() } }}
          onUndo={() => { if (tplo.undoFragmentPoint(visibleTploEditor.id)) focusViewerViewport() }}
          onCancel={() => { if (tplo.cancelFragment(visibleTploEditor.id)) focusViewerViewport() }}
          readFailure={tplo.planQuery.isError ? { canRetry: tplo.canRetryRead, onRetry: () => { void tplo.refreshRead() } } : undefined} />
        : visibleTploEditor ? <CaseImageTploCutControls key={JSON.stringify([image.caseId, image.id, visibleTploEditor.id,
          visibleTploEditor.baseRevision, tplo.contextGeneration, tplo.originGeometry, tploCutDiameter])} placement={tploPlacement} target={tploTarget}
          canEdit={tplo.canEdit && !tploDialogOpen && !tploGestureActive} canCancel={!tplo.locked && !tplo.deleting && !tploDialogOpen} marking={tool === "mark"}
          diameterMm={tploCutDiameter} fragmentMissing={visibleTploEditor.fragment === null}
          name={visibleTploEditor.kind === "tplo-create" ? visibleTploEditor.label?.trim() || tTplo("read.title") : selectedSavedTplo?.object.label?.trim() || tTplo("read.title")}
          headerAction={tploDeleteButton}
          values={!tploPlacement ? <CaseImageTploValues measurement={tploMeasure} source={tploResultSource} /> : undefined}
          valuesDescription={simulationReason ? <p>{tTplo("read.simulationState", {
            state: simulationReason === "incomplete" ? tTplo("simulation.incomplete") : tTplo(`read.reasons.${simulationReason}`),
          })}</p> : undefined}
          footerAction={!tploPlacement && !tplo.hasChanges ? tploNewAction : undefined}
          showCancel={Boolean(tploPlacement)}
          previewDiameterMm={tploGestureActive && tploLocal.measurement.status === "available" ? tploLocal.measurement.radiusMm * 2 : undefined}
          stale={tplo.needsRebase} fragmentDrawing={tploFragmentDrawing}
          onMark={() => { if (tplo.canEdit) { setTool("mark"); focusViewerViewport() } }}
          onTargetChange={target => { if (tplo.canEdit && tplo.selectTarget(target)) { setTool("mark"); focusViewerViewport() } }}
          onDiameterChange={value => tplo.setCutDiameter(value, visibleTploEditor.id)}
          onCancel={() => cancelTploGeometry()}
          readFailure={tplo.planQuery.isError ? { canRetry: tplo.canRetryRead, onRetry: () => { void tplo.refreshRead() } } : undefined}>
          {!tploPlacement ? <CaseImageTploFragmentControls points={visibleTploEditor.fragment?.points ?? null}
            activeVertex={tplo.ui.activeVertex} canEdit={tplo.canEdit && !tploDialogOpen && !tploGestureActive}
            onBegin={() => { if (tplo.beginFragment(visibleTploEditor.id)) { setTool("mark"); focusViewerViewport() } }}
            onSelect={index => { if (tplo.selectVertex(index)) { setTool("mark"); focusViewerViewport() } }}
            onInsert={() => { if (tplo.ui.activeVertex !== null && tplo.insertFragmentVertex(tplo.ui.activeVertex, visibleTploEditor.id)) { setTool("mark"); focusViewerViewport() } }}
            onRemoveVertex={() => { if (tplo.ui.activeVertex !== null && tplo.removeFragmentVertex(tplo.ui.activeVertex, visibleTploEditor.id)) focusViewerViewport() }}
            onClear={() => { if (tplo.clearFragment(visibleTploEditor.id)) focusViewerViewport() }} /> : null}
          {!tploPlacement && !tploFragmentDrawing ? <CaseImageTploRotationControls showValue={false} collapsed={visibleTploEditor.fragment === null} degrees={visibleTploEditor.rotation_degrees}
            previewDegrees={rotationGestureDegrees} canEdit={tplo.canEdit && !tploDialogOpen && !tploGestureActive}
            canRotate={tplo.canEdit && !tploDialogOpen && !tploGestureActive && tploLocal.simulation.status === "available"} active={Boolean(tplo.ui.rotationActive)}
            source={tploResultSource} statusText={`${tploStatusText}${simulationReason ? ` · ${simulationReason === "incomplete" ? tTplo("simulation.incomplete") : tTplo(`read.reasons.${simulationReason}`)}` : ""}`}
            comparison={tploComparison} onApply={degrees => tplo.changeRotation(degrees, visibleTploEditor.id)}
            onRotate={() => { if (tplo.setRotationActive(!tplo.ui.rotationActive)) { setTool("mark"); focusViewerViewport() } }} /> : null}
        </CaseImageTploCutControls>
        : tploVisible ? <CaseImageTploSaved key={`${image.caseId}:${image.id}`} objects={savedTplo} selectedId={tplo.selectedId}
          headerAction={tploDeleteButton}
          dirtyId={dirtyTploId} selectionDisabled={!tplo.canSelect || tplo.hasChanges || tploGestureActive}
          onSelect={tploPicking.onSelect} readError={tplo.planQuery.isError} canRetryRead={tplo.canRetryRead}
          refreshing={tplo.planQuery.isFetching} onRetryRead={() => { void tplo.refreshRead() }}>
          {selectedSavedTplo ? <CaseImageTploComparison {...tploComparison} /> : null}
          {tploNewAction}
        </CaseImageTploSaved>
        : landmarksVisible ? <section aria-label={tLandmarks("title")} className="flex max-h-full flex-col items-start gap-2">
        {clinicalProtocol.isError && !landmarksDeletion.request && !landmarksRecovery.active ?
          <div className="w-56 max-w-full rounded-[var(--radius-token-md)] bg-[var(--color-obsidian)]">{landmarksProtocol}</div> : null}
        {!landmarksDeletion.request && (landmarks.needsRebase || landmarks.planQuery.isError || landmarks.receipt.phase === "error") ?
          <p className="w-56 max-w-full rounded-[var(--radius-token-md)] bg-[var(--color-obsidian)] p-3 text-xs text-white/85" role="status">
            {tLandmarks(landmarks.needsRebase ? "recovery.conflict" : landmarks.planQuery.isError ? "readErrorDescription" : "saveErrorDescription")}
          </p> : null}
        {landmarksPlacement ? <CaseImageLandmarksCreationControls placement={landmarksPlacement}
          canPlace={canPlaceLandmarks} marking={tool === "mark"} canCancel={!landmarks.locked && !landmarks.deleting}
          protocol={clinicalProtocol.isError ? undefined : landmarksProtocol}
          onSelectPoint={point => { if (landmarks.selectPoint(point)) { setTool("mark"); focusViewerViewport() } }}
          onMark={() => { if (canPlaceLandmarks) { setTool("mark"); focusViewerViewport() } }} onCancel={cancelLandmarksPlacement}
          readFailure={landmarks.planQuery.isError ? { canRetry: landmarks.canRetryRead, onRetry: () => { void landmarks.refreshRead() } } : undefined} />
          : landmarksMethod && (visibleLandmarksEditor && landmarks.geometry || savedLandmarks) && !landmarksRecovery.active ? <CaseImageLandmarksAdjustmentControls target={landmarksTarget} canAdjust={canAdjustLandmarks}
            method={landmarksMethod} editing={Boolean(visibleLandmarksEditor)}
            canOpen={landmarks.canOpen} onEdit={() => openLandmarks()} canPresent={canPresentLandmarks}
            valueVisible={!display.settings.hiddenLandmarksValue} onToggleValue={() => { if (canPresentLandmarks) display.setLandmarksValueVisible(Boolean(display.settings.hiddenLandmarksValue)) }}
            deletion={{ enabled: landmarksDeletion.canRequest(), onRequest: landmarksDeletion.open }}
            onTargetChange={selectLandmarksAdjustmentTarget} onNudge={nudgeLandmarks}
            readFailure={landmarks.planQuery.isError ? { canRetry: landmarks.canRetryRead, onRetry: () => { void landmarks.refreshRead() } } : undefined}>
            <CaseImageLandmarksValues saved={savedLandmarks} preview={landmarksPreview} compact readUnverified={landmarksReadUnverified} />
          </CaseImageLandmarksAdjustmentControls>
            : <CaseImageLandmarksValues saved={savedLandmarks} readUnverified={landmarksReadUnverified} loading={!landmarks.plan && landmarks.planQuery.isFetching}
              readFailure={landmarks.planQuery.isError ? { canRetry: landmarks.canRetryRead, onRetry: () => { void landmarks.refreshRead() } } : undefined}
              emptyAction={!landmarks.editor && !landmarksRecovery.active && !landmarksDeletion.request ?
                <button type="button" disabled={!landmarks.canOpen} onClick={enterLandmarks}
                  className="min-h-9 w-full rounded-[var(--radius-token-sm)] bg-white/10 px-3 text-left text-xs font-medium text-white outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-40">
                  {tLandmarks("startMarking")}
                </button> : null} />}
        {landmarksRecovery.active && !landmarksDeletion.request ? <CaseImageLandmarksRecovery recovery={{ ...landmarksRecovery, check: landmarksActions.check, discard: cancelLandmarksPlacement }} /> : null}
      </section>
        : circleVisible ? <section aria-label={tCircle("title")} className="flex max-h-full flex-col items-start gap-2">
        {circlePlacing || circleRecovery.active && !visibleCircleEditor || circleDeletion.request && circleDeletion.committed ? circleValues : null}
        {circleDeletion.request && circleDeletion.committed ? null : circleRecovery.active && !visibleCircleEditor ? <CaseImageCircleRecovery recovery={{ ...circleRecovery, check: circleActions.check, discard: cancelCircle }} />
          : circlePlacing ? <CaseImageCircleCreationControls
          placement={circle.placement}
          canPlace={circle.canEdit && !circle.needsRebase} canCancel={circleCreating && !circle.locked && !circle.deleting}
          onPlaceCentered={placeCircleCentered} onCancel={cancelCircle}
          readFailure={circle.planQuery.isError ? { canRetry: circle.canRetryRead, onRetry: refreshCircleRead } : undefined} /> : <CaseImageCircleToolbar
          key={circleValueId ?? "circle-empty"} name={circleName} editing={Boolean(visibleCircleEditor)} dirty={circle.hasChanges}
          canAdjust={canAdjustCircle} canPresent={canPresentCircle} hasGeometry={Boolean(circleGeometry)} target={circleTarget} measure={circleMeasure}
          valueVisible={circleValueVisible} readError={circle.planQuery.isError} canRetryRead={circle.canRetryRead}
          deletion={selectedCircle ? { id: selectedCircle.id, enabled: circleDeletion.canRequest(selectedCircle.id), onRequest: () => circleDeletion.open(selectedCircle.id) } : null}
          onRetryRead={refreshCircleRead} onEdit={editCircle} onTargetChange={part => { setCircleTarget(part); setTool("mark") }} onNudge={nudgeCircle}
          onMeasureChange={measure => { if (circleValueId && canPresentCircle) display.setCircleMeasure(circleValueId, measure) }}
          onToggleValue={() => { if (circleValueId && canPresentCircle) display.setCircleValueVisible(circleValueId, !circleValueVisible) }}>
          {circleValues}
          <span className="sr-only">{tCircle("viewer.adjustHint")}</span>
        </CaseImageCircleToolbar>}
      </section> : angleVisible ? <section aria-label={tAngle("title")} className="flex max-h-full flex-col items-start gap-2">
        {anglePlacing || angleRecovery.active && !visibleAngleEditor || angleDeletion.request && angleDeletion.committed ? angleValues : null}
        {angleDeletion.request && angleDeletion.committed ? null : angleRecovery.active && !visibleAngleEditor ? <CaseImageAngleRecovery recovery={angleRecovery} /> : anglePlacing ? <CaseImageAngleCreationControls placement={angle.placement}
          canStartNew={canStartNewAngle}
          canPlace={angle.canEdit && !angle.needsRebase} canCancel={!angle.locked && !angle.deleting}
          onNew={newAngle} onPlaceCentered={placeAngleCentered} onCancel={cancelAngle} /> : <CaseImageAngleToolbar
          key={angleValueId ?? "angle-empty"} name={angleName} editing={Boolean(visibleAngleEditor)} dirty={angle.hasChanges}
          canAdjust={angle.canEdit && !angle.needsRebase && !selectedAngle?.locked} target={angleTarget}
          hasGeometry={Boolean(angle.geometry || selectedAngle)} valueVisible={angleValueVisible} canStartNew={canStartNewAngle}
          currentDegrees={angle.geometry ? angleDegreesPreview(angle.geometry) : selectedAngleEntry?.result.status === "available" ? selectedAngleEntry.result.degrees : null}
          deletion={selectedAngle ? { id: selectedAngle.id, enabled: angleDeletion.canRequest(selectedAngle.id), onRequest: () => angleDeletion.open(selectedAngle.id) } : null}
          readError={angle.planQuery.isError} canRetryRead={angle.canRetryRead} onRetryRead={refreshAngleRead}
          onEdit={editAngle} onTargetChange={part => { setAngleTarget(part); setTool("mark") }} onNudge={nudgeAngle} onSetDegrees={setAngleDegrees} onNew={newAngle}
          onToggleValue={() => { if (angleValueId) display.setAngleValueVisible(angleValueId, !angleValueVisible) }}>
          {angleValues}
          <span className="sr-only">{tAngle("viewer.adjustHint")}</span>
        </CaseImageAngleToolbar>}
      </section>
        : distanceVisible ? <CaseImageDistanceToolbar name={distanceName} hasGeometry={Boolean(distanceEditor?.geometry ?? selectedDistance)} editing={Boolean(distanceEditor)}
        measure={segmentMeasure} canChangeMeasure={canChangeSegmentMeasure}
        onMeasureChange={measure => { if (segmentValueId && canChangeSegmentMeasure) display.setSegmentMeasure(segmentValueId, measure) }}
        selection={selectedDistance ? { id: selectedDistance.id, locked: selectedDistance.locked, canEdit: distance.canEdit,
          canDelete: canDeleteDistance(selectedDistance.id), valueVisible: !display.settings.hiddenDistanceValues?.includes(selectedDistance.id),
          onEdit: editDistance, onToggleValue: () => display.setDistanceValueVisible(selectedDistance.id, Boolean(display.settings.hiddenDistanceValues?.includes(selectedDistance.id))),
          onDelete: () => requestDistanceDeletion(selectedDistance.id) } : null}
        editable={distance.canEdit && !distance.needsRebase} dirty={distance.hasChanges}
        creating={distanceEditor?.kind === "distance-create"}
        canStartNew={distance.canCreate && !nextDistanceAfterGuide
          && (!(distanceEditor?.kind === "distance-create" && distanceEditor.untouched) || (distance.plan?.document.objects.length ?? 500) < 499)
          && !deleteRequest && !angleDeletion.request && !circleDeletion.request && !landmarksDeletion.request} onNew={newDistance}
        target={distanceTarget} onTargetChange={part => { setDistanceTarget(part); setTool("mark") }} onNudge={nudgeDistance} onPlace={placeDistance}>
        <CaseImageDistanceValues distances={distances} selectedId={distance.selectedId} preview={distancePreview} showLineNames={segmentMeasure === "length"}
          intersections={intersections} measures={display.settings.segmentMeasures}
          dirtyId={distanceEditor?.kind === "distance-update" && distance.hasChanges ? distanceEditor.id : null}
          selectionDisabled={!distance.canSelect || distance.hasChanges} onSelect={selectDistance} />
      </CaseImageDistanceToolbar> : undefined}
      contextControls={visibleTploEditor && tploFragmentDrawing && !tploDialogOpen && !tploRecovery.active && !tplo.needsRebase && !tplo.planQuery.isError ? {
        anchor: visibleTploEditor.fragment?.points.at(-1) ?? currentTploGeometry?.edge ?? null,
        avoidPoints: visibleTploEditor.fragment?.points.length ? visibleTploEditor.fragment.points
          : currentTploGeometry ? [currentTploGeometry.edge] : undefined,
        content: <CaseImageTploFragmentActions count={visibleTploEditor.fragment?.points.length ?? 0}
          canEdit={tplo.canEdit && !tploGestureActive}
          onFinish={() => { if (tplo.finishFragment(visibleTploEditor.id)) focusViewerViewport() }}
          onCancel={() => { if (tplo.cancelFragment(visibleTploEditor.id)) focusViewerViewport() }} />,
      } : visibleTploEditor && !tploPlacement && !tploDialogOpen && !tploRecovery.active
        && (tplo.hasChanges || tplo.needsRebase || tplo.planQuery.isError) ? { anchor: currentTploGeometry?.edge ?? null,
          content: <CaseImageTploActions creating={visibleTploEditor.kind === "tplo-create"} canSave={tplo.canSave && !tploGestureActive && rotationGestureDegrees === null}
            canCancel={!tplo.locked && !tplo.deleting} stale={tplo.needsRebase} fragmentDrawing={tploFragmentDrawing}
            onSave={() => void tploGeometryActions.save()} onCancel={() => cancelTploGeometry()} /> }
        : showLandmarksActions && landmarksActionEditor ? { anchor: landmarksActionAnchor, content: <CaseImageLandmarksActions
        creating={!savedLandmarks} needsRebase={landmarks.needsRebase} receipt={landmarks.receipt}
        pending={landmarksRecovery.pending || landmarks.save.isPending} canSave={landmarks.canSave} canCheck={landmarksRecovery.canCheck}
        canCancel={!landmarks.locked && !landmarks.deleting && (!landmarksRecovery.active || landmarksRecovery.canDiscard)}
        readError={landmarks.planQuery.isError} canRetryRead={landmarks.canRetryRead} onRetryRead={() => { void landmarks.refreshRead() }}
        onCancel={cancelLandmarksPlacement} onSave={() => { void landmarksActions.save() }} onCheck={() => { void landmarksActions.check() }} /> }
        : showCircleActions && visibleCircleEditor ? { anchor: circleActionAnchor, content: <CaseImageCircleActions
        creating={circleCreating} needsRebase={circle.needsRebase} receipt={circle.receipt} pending={circleRecovery.pending || circle.save.isPending}
        canSave={circle.canSave} canCheck={circleRecovery.canCheck}
        canCancel={!circle.locked && !circle.deleting && (!circleRecovery.active || circleRecovery.canDiscard)}
        readError={circle.planQuery.isError} canRetryRead={circle.canRetryRead} onRetryRead={refreshCircleRead}
        onCancel={cancelCircle} onSave={() => void circleActions.save()} onCheck={() => void circleActions.check()} /> }
        : showAngleActions && visibleAngleEditor ? { anchor: angleActionAnchor, content: <CaseImageAngleActions
        creating={visibleAngleEditor.kind === "angle-create"} needsRebase={angle.needsRebase} receipt={angle.receipt} pending={angleRecovery.pending || angle.save.isPending}
        canSave={angle.canSave} canCheck={angleRecovery.canCheck}
        canCancel={!angle.locked && !angle.deleting && (!angleRecovery.active || angleRecovery.canDiscard)}
        readError={angle.planQuery.isError} canRetryRead={angle.canRetryRead} onRetryRead={refreshAngleRead}
        onCancel={cancelAngle} onSave={() => void angleActions.save()} onCheck={() => void angleActions.check()} /> }
        : showDistanceActions && distanceEditor ? { anchor: actionAnchor, content: <CaseImageDistanceActions
        intent={distanceEditor.kind === "distance-create" ? "create" : "update"} dirty={distance.hasChanges}
        cancelDisabled={distance.locked || distance.deleting} needsRebase={distance.needsRebase} receipt={distance.receipt}
        pending={distance.save.isPending || distance.receipt.phase === "saving" || distance.receipt.phase === "checking"}
        canSave={distance.canSave} canCheck={!distance.deleting && !distance.save.isPending} readError={distance.planQuery.isError} canRetryRead={distance.canRetryRead}
        onCancel={cancelDistance} onSave={() => void distanceActions.save()} onCheck={() => void distanceActions.check()} onRetryRead={refreshDistanceRead} /> } : undefined}
      renderOverlay={tploVisible && tploDrawingAvailable ? view => <TploOverlay objects={savedTplo} selectedId={tplo.selectedId} view={view}
        labelOnlyId={visibleTploEditor?.id} dirtyId={dirtyTploId} showResult={false} />
        : landmarksVisible && landmarksDimensionsAvailable && !landmarksPlacement ? view => <LandmarksOverlay saved={savedLandmarks} view={view}
        valueVisible={!display.settings.hiddenLandmarksValue} preview={landmarksPreview} labelOnly={Boolean(visibleLandmarksEditor)} />
        : circleVisible && circleDrawingAvailable ? view => <CircleOverlay circles={circles} selectedId={circle.selectedId} view={view}
        labelOnlyId={visibleCircleEditor?.id} preview={circlePreview} measures={display.settings.circleMeasures} hiddenValueIds={display.settings.hiddenCircleValues} />
        : angleVisible ? view => <AngleOverlay angles={angles} selectedId={angle.selectedId} view={view}
        labelOnlyId={visibleAngleEditor?.id} preview={anglePreview} hiddenValueIds={display.settings.hiddenAngleValues} /> : distanceVisible ? view => <DistanceOverlay
        distances={distances.filter(item => item.line.id !== visibleDistanceEditor?.id || distancePreview || !distance.hasChanges && !view.activeGesture)}
        preview={distancePreview} activeGeometry={actionGeometry} intersections={intersections} emphasizeActive={segmentMeasure === "length"}
        measures={display.settings.segmentMeasures} hiddenValueIds={display.settings.hiddenDistanceValues}
        labelOnlyId={visibleDistanceEditor?.id} selectedId={distance.selectedId} view={view} /> : undefined}
      interactionNotice={landmarksMethodDialog ? <CaseImageLandmarksMethodDialog
        onStart={() => openLandmarks("create")}
        onCancel={() => setLandmarksMethodRequest(null)}
        onRestoreFocus={selected => {
          if (!mounted.current || scope.current.client !== client || scope.current.caseId !== image.caseId || scope.current.imageId !== image.id) return
          if (selected) focusViewerViewport()
          else if (landmarksMethodDialog.trigger?.isConnected) landmarksMethodDialog.trigger.focus({ preventScroll: true })
        }} /> : tploDialogOpen ? <span className="sr-only">{tTplo("deletion.title")}</span> : landmarksDeletion.request ? <span className="sr-only">{tLandmarks("deleteTitle")}</span> : circleDeletion.request ? <span className="sr-only">{tCircle("deleteTitle")}</span> : introductionOpen ? <CalibrationIntroductionDialog open recalibrating={recalibrating} onConfirm={confirmIntroduction} onCancel={cancelIntroduction}
        onRestoreFocus={() => {
          if (introductionConfirmed.current) document.querySelector<HTMLElement>("[data-calibration-viewport]")?.focus({ preventScroll: true })
          else document.querySelector<HTMLButtonElement>("nav button[aria-pressed=true]")?.focus({ preventScroll: true })
        }} /> : null} editor={visibleTploEditor && tploDrawingAvailable && (tplo.originGeometry || tploPlacement) ? {
      kind: "tplo", id: visibleTploEditor.id, baseRevision: visibleTploEditor.baseRevision, contextGeneration: tplo.contextGeneration,
      geometry: tplo.originGeometry, editable: tplo.canEdit && !tploDialogOpen, originEditable: tplo.ui.comparison === "original", tool, onToolChange: setTool,
      rotation: { degrees: visibleTploEditor.rotation_degrees, active: Boolean(tplo.ui.rotationActive),
        enabled: tplo.canEdit && !tploFragmentDrawing && tploLocal.simulation.status === "available",
        onPreview: onTploRotationPreview, onChange: degrees => { tplo.changeRotation(degrees, visibleTploEditor.id) } },
      placement: tploPlacement ?? undefined, onPlacePoint: (point, step) => { tplo.placePoint(point, visibleTploEditor.id, step) },
      fragmentDrawing: tploFragmentDrawing,
      onFragmentPoint: (point, count) => { tplo.appendFragmentPoint(point, count, visibleTploEditor.id) },
      picking: tploPicking, keyboardTarget: tploTarget, onKeyboardTargetChange: tplo.selectTarget,
      onGeometryPreview: onTploGeometryPreview,
      onGeometryChange: (geometry, target) => { tplo.changeOrigin(geometry, visibleTploEditor.id, target) },
    } : tploVisible && !tplo.editor && !tploRecovery.active ? { kind: "tplo-select", picking: tploPicking }
      : tploIntent ? { kind: "none" } : calibrationEditing ? { kind: "calibration",
      editable: editing, marker: activeSection === "calibration" && calibrationEditing ? calibration.marker : null,
      markerKind: calibration.editor?.kind ?? "line", tool, onMarkerChange: calibration.changeMarker, onToolChange: setTool,
    } : visibleLandmarksEditor && landmarksDimensionsAvailable ? { kind: "landmarks",
      baseRevision: visibleLandmarksEditor.baseRevision, contextGeneration: landmarks.contextGeneration,
      geometry: landmarks.geometry, placement: landmarksPlacement ?? undefined, editable: canEditLandmarks, tool, onToolChange: setTool,
      keyboardTarget: landmarksTarget, onKeyboardTargetChange: setLandmarksTarget, onGeometryPreview: onLandmarksGeometryPreview,
      onPlacePoint: (point, name) => { landmarks.placePoint(point, name) },
      onGeometryChange: geometry => { landmarks.changeGeometry(geometry) },
    } : visibleCircleEditor ? { kind: "circle", id: visibleCircleEditor.id, baseRevision: visibleCircleEditor.baseRevision,
      contextGeneration: circle.contextGeneration, geometry: circle.geometry, placement: circle.placement ?? undefined,
      onPlacePoint: (point, step) => circle.placePoint(point, visibleCircleEditor.id, step), onPlaceCentered: placeCircleCentered,
      picking: circlePicking, onGeometryPreview: onCircleGeometryPreview,
      keyboardTarget: circleTarget, onKeyboardTargetChange: setCircleTarget,
      editable: circle.canEdit && !circle.needsRebase, tool, onToolChange: setTool,
      onGeometryChange: geometry => circle.changeGeometry(geometry, visibleCircleEditor.id),
    } : visibleAngleEditor ? { kind: "angle", id: visibleAngleEditor.id, baseRevision: visibleAngleEditor.baseRevision,
      contextGeneration: angle.contextGeneration, geometry: angle.geometry,
      placement: angle.placement ?? undefined,
      onPlacePoint: (point, step) => angle.placePoint(point, visibleAngleEditor.id, step), onPlaceCentered: placeAngleCentered,
      picking: anglePicking, onGeometryPreview: onAngleGeometryPreview,
      keyboardTarget: angleTarget, onKeyboardTargetChange: setAngleTarget,
      editable: angle.canEdit && !angle.needsRebase, tool, onToolChange: setTool,
      onGeometryChange: geometry => angle.changeGeometry(geometry, visibleAngleEditor.id),
    } : visibleDistanceEditor ? { kind: "distance", id: visibleDistanceEditor.id, geometry: visibleDistanceEditor.geometry,
      intent: visibleDistanceEditor.kind === "distance-create" ? "create" : "update", picking,
      onGeometryPreview: onDistanceGeometryPreview, onPointerActivity: distanceActions.setPointerActive,
      keyboardTarget: distanceTarget, onKeyboardTargetChange: setDistanceTarget,
      editable: distanceEditing && distance.canEdit && !distance.needsRebase, tool,
      onGeometryChange: (geometry, source) => {
        if (distance.changeGeometry(geometry, visibleDistanceEditor.id)) distanceActions.queueAutosave(source)
      }, onToolChange: setTool,
    } : circleVisible ? { kind: "circle-select", picking: circlePicking }
      : angleVisible ? { kind: "angle-select", picking: anglePicking } : distanceVisible ? { kind: "distance-select", picking } : { kind: "none" }} />
    <CaseImageAngleDeleteDialog deletion={angleDeletion} />
    <CaseImageCircleDeleteDialog deletion={circleDeletion} />
    <CaseImageLandmarksDeleteDialog deletion={landmarksDeletion} />
    <CaseImageTploDeleteDialog deletion={tploDeletion} />
    {deleteRequest ? <CaseImageDistanceDeleteDialog name={deleteRequest.name} phase={deletePhase} pending={deletePending}
      conflict={deleteConflict} readError={distance.planQuery.isError} dirty={Boolean(!deleteDraft && distance.hasChanges)}
      canConfirm={!deletePending && !distance.deleting && (deletePhase === "uncertain" || (distance.planQuery.isError ? distance.canRetryRead : deleteConflict || distance.canEdit))}
      canCancel={!distance.locked && !distance.deleting && !deletePending} onCancel={cancelDistanceDeletion} onConfirm={() => void confirmDistanceDeletion()} /> : null}
  </>
}

export { CaseImageWorkspace }
