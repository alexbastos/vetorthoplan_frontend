"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"

import { calibrationGeometryIssue } from "../lib/calibration-editor"
import { hasConfirmedImageScale } from "../lib/calibration-product-state"
import { isCalibrationSaveLocked, isPlanImageDeleted, type ImagePlanSaveState } from "../lib/calibration-save-state"
import { isCaseDeletionLocked } from "../lib/case-deletion"
import { IDLE_DELETION, type ImageDeletionState } from "../lib/image-deletion"
import { closeOtherCleanMeasurementEditor, hasOtherImagePlanDraft } from "../lib/image-plan-draft"
import { imagePlanQueryOptions } from "../lib/image-plan-query-options"
import { isImagePlanSaveInFlight, requestPlanEditSave } from "../lib/image-plan-saving"
import { tploDraftHasChanges, tploDraftMatchesCommand } from "../lib/tplo-draft"
import { DEFAULT_TPLO_EDITOR_UI, changeTploFragment, changeTploGeometry, changeTploOrigin, changeTploParameters, changeTploRotation,
  nextTploLabel, placeTploPoint, tploEditorCommand, tploEditorFromCommand, tploEditorFromPlan, tploEditorGeometry, tploEditorOrigin, tploObject,
  tploPlacementStep, type TploCutGeometry, type TploEditor, type TploEditorUi, type TploGeometryEditor, type TploPlacementStep } from "../lib/tplo-editor"
import { hasUniquePlanObjectIds, isTploCommand, SaveTploSchema, type SaveTploInput } from "../schemas/image-plan-command.schema"
import { PlanTploInputSchema, type ImagePlan } from "../schemas/image-plan.schema"
import type { CaseImage } from "../types/case-image"
import type { ImagePoint } from "../types/case-workspace"
import { tploInNormalized, tploInPixels, tploWithDiameter, type TploGeometry, type TploDiameterResult } from "../lib/tplo-geometry"
import type { TploAdjustmentTarget } from "../lib/tplo-interaction"
import { tploParameterPatch, type TploParameterFields } from "../lib/tplo-parameters"
import { beginTploFragment, appendTploFragmentPoint, undoTploFragmentPoint, finishTploFragment, cancelTploFragment,
  insertTploFragmentVertex, removeTploFragmentVertex, clearTploFragment } from "../lib/tplo-fragment-editor"
import { casesQueryKeys as keys } from "./cases-query-keys"
import { useOtherImagePlanDraft } from "./use-image-plan-drafts"
import { useTploSaveRecovery } from "./use-tplo-save-recovery"
import { useWorkspaceCacheValue, useWorkspaceDraft } from "./use-workspace-draft"

const deletionActive = (phase?: string) => ["deleting", "checking", "uncertain", "deleted"].includes(phase ?? "idle")
type TploDeleteCommand = Extract<SaveTploInput, { kind: "tplo-delete" }>
const geometryContextOf = (image: CaseImage) => JSON.stringify([image.widthPx, image.heightPx, image.kind, image.pixelSpacingMm, image.imagerPixelSpacingMm])
const validDimensions = (image: CaseImage) => typeof image.widthPx === "number" && Number.isFinite(image.widthPx) && image.widthPx > 0
  && typeof image.heightPx === "number" && Number.isFinite(image.heightPx) && image.heightPx > 0
const targetUi = (target: TploAdjustmentTarget): Partial<TploEditorUi> => ({
  activePoint: target === "center" || target === "edge" ? target : null,
  activeVertex: typeof target === "object" ? target.vertex : null,
  area: target === "fragment" ? "fragment" : "body", comparison: "original", rotationActive: false,
})

function useImageTplo(image: CaseImage, ready: boolean, caseLocked: boolean, options: {
  active: boolean; toolActive: boolean; calibrationEditing: boolean
}) {
  const client = useQueryClient()
  const identity = { caseId: image.caseId, imageId: image.id }
  const draftKey = keys.imageTploDraft(image.caseId, image.id), planKey = keys.imagePlan(image.caseId, image.id)
  const uiKey = keys.imageTploEditorUi(image.caseId, image.id)
  const draft = useWorkspaceDraft<TploEditor>("image-tplo-draft", image.caseId, image.id)
  const ui = useWorkspaceCacheValue<TploEditorUi>("image-tplo-editor-ui", image.caseId, image.id) ?? DEFAULT_TPLO_EDITOR_UI
  const captured = useTploSaveRecovery(image, caseLocked)
  const deletion = useQuery<ImageDeletionState>({ queryKey: keys.imageDeletion(image.caseId, image.id), queryFn: async () => IDLE_DELETION,
    enabled: false, initialData: IDLE_DELETION, gcTime: Infinity }).data
  const deleting = caseLocked || deletionActive(deletion.phase)
  const available = ready && image.status === "READY" && !deleting && !options.calibrationEditing
  const planQuery = useQuery(imagePlanQueryOptions(client, identity, { enabled: options.active && image.status === "READY" && !deleting }))
  const plan = planQuery.data
  const draftQuery = client.getQueryCache().find({ queryKey: draftKey, exact: true })
  const planCacheQuery = client.getQueryCache().find({ queryKey: planKey, exact: true })
  const uiQuery = client.getQueryCache().find({ queryKey: uiKey, exact: true })
  const receiptQuery = client.getQueryCache().find({ queryKey: keys.imagePlanSave(image.caseId, image.id), exact: true })
  const geometryContext = geometryContextOf(image)
  const context = { client, ...identity, draftQuery, planCacheQuery, uiQuery, receiptQuery, available, active: options.active, toolActive: options.toolActive, geometryContext }
  const scope = useRef({ ...context, generation: 0 })
  if (Object.entries(context).some(([key, value]) => scope.current[key as keyof typeof context] !== value)) {
    scope.current = { ...context, generation: scope.current.generation + 1 }
  }
  const generation = scope.current.generation
  const mounted = useRef(false), submitting = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const otherIntent = useOtherImagePlanDraft(image.caseId, image.id, "tplo")
  const editor = draft ?? (captured.active && captured.command ? tploEditorFromCommand(captured.command) : null)
  const save = useMutation({ mutationFn: (input: SaveTploInput) => requestPlanEditSave(client, identity, input), retry: false })
  const locked = save.isPending || captured.pending || isCalibrationSaveLocked(client, image.caseId, image.id)
  const hasChanges = Boolean(editor && tploDraftHasChanges(editor, plan))
  const needsRebase = Boolean(editor && plan && editor.baseRevision !== plan.revision)
  const issue = validDimensions(image) ? calibrationGeometryIssue(image) : "dimensions"
  const geometryEligible = !issue && hasConfirmedImageScale(plan, image.id)
  const uniqueIds = Boolean(plan && hasUniquePlanObjectIds(plan.document))
  const canAccess = options.active && available && !locked && !otherIntent && !planQuery.isFetching && !planQuery.isError
    && Boolean(plan && plan.imageId.toLowerCase() === image.id.toLowerCase())
  const target = editor && "id" in editor && editor.kind !== "tplo-create" && plan ? tploObject(plan, editor.id) : null
  const targetEditable = !editor || editor.kind === "tplo-create" || editor.kind === "tplo-parameters-set" || Boolean(target && !target.locked)
  const canSelect = canAccess && !captured.active && !needsRebase && uniqueIds
  const canOpen = canAccess && !captured.active
  const canEdit = canAccess && !captured.active && !needsRebase && options.toolActive && targetEditable
    && (editor?.kind === "tplo-parameters-set" || uniqueIds && geometryEligible) && editor?.kind !== "tplo-delete"
  const input = editor && plan ? tploEditorCommand(editor, plan) : null
  const canSave = canAccess && !captured.active && !needsRebase && options.toolActive && targetEditable && hasChanges && Boolean(input)
    && (editor?.kind === "tplo-parameters-set" || uniqueIds && (editor?.kind === "tplo-delete" || geometryEligible))
  const selectedId = editor && "id" in editor ? editor.id : ui.selectedId && plan ? tploObject(plan, ui.selectedId)?.id ?? null : null
  const geometry = editor ? tploEditorGeometry(editor) : null
  const canRetryRead = options.active && available && !locked && !otherIntent && !planQuery.isFetching

  function live() {
    return mounted.current && !caseLocked && scope.current.generation === generation && scope.current.client === client
      && scope.current.caseId === image.caseId && scope.current.imageId === image.id
      && Boolean(draftQuery && client.getQueryCache().find({ queryKey: draftKey, exact: true }) === draftQuery)
      && Boolean(planCacheQuery && client.getQueryCache().find({ queryKey: planKey, exact: true }) === planCacheQuery)
      && Boolean(uiQuery && client.getQueryCache().find({ queryKey: uiKey, exact: true }) === uiQuery)
      && Boolean(receiptQuery && client.getQueryCache().find({ queryKey: keys.imagePlanSave(image.caseId, image.id), exact: true }) === receiptQuery)
      && !isPlanImageDeleted(client, identity) && !isCaseDeletionLocked(client, image.caseId)
      && !deletionActive(client.getQueryData<ImageDeletionState>(keys.imageDeletion(image.caseId, image.id))?.phase)
  }
  function currentEditor(): TploEditor | null {
    const current = client.getQueryData<TploEditor | null>(draftKey)
    if (current) return current
    const receipt = client.getQueryData<ImagePlanSaveState>(keys.imagePlanSave(image.caseId, image.id))
    return receipt && isTploCommand(receipt.edit) && receipt.phase !== "idle" && receipt.phase !== "saved" ? tploEditorFromCommand(receipt.edit) : null
  }
  function sameEditorSnapshot(active: TploEditor | null) {
    const currentDraft = client.getQueryData<TploEditor | null>(draftKey)
    if (currentDraft || draft) return currentDraft === draft
    const receipt = client.getQueryData<ImagePlanSaveState>(keys.imagePlanSave(image.caseId, image.id))
    return active ? Boolean(captured.active && captured.command === receipt?.edit && tploDraftMatchesCommand(active, captured.command)) : editor === null
  }
  function editableNow(requireGeometry: boolean, requireObjectIds = true): ImagePlan | null {
    const current = client.getQueryData<ImagePlan>(planKey)
    const receipt = client.getQueryData<ImagePlanSaveState>(keys.imagePlanSave(image.caseId, image.id))
    const cachedImage = client.getQueryData<CaseImage[]>(keys.images(image.caseId))?.find(item => item.id === image.id)
    return live() && canAccess && !submitting.current && current && current.revision === plan?.revision
      && current.imageId.toLowerCase() === image.id.toLowerCase() && (!requireObjectIds || hasUniquePlanObjectIds(current.document))
      && (!requireGeometry || geometryEligible && hasConfirmedImageScale(current, image.id)
        && (!cachedImage || validDimensions(cachedImage) && !calibrationGeometryIssue(cachedImage) && geometryContextOf(cachedImage) === geometryContext))
      && (!cachedImage || cachedImage.status === "READY")
      && !isImagePlanSaveInFlight(client, identity) && !isCalibrationSaveLocked(client, image.caseId, image.id)
      && !hasOtherImagePlanDraft(client, image.caseId, image.id, "tplo")
      && (!receipt || receipt.phase === "idle" || receipt.phase === "saved")
      && client.getQueryState(planKey)?.status !== "error" && client.getQueryState(planKey)?.fetchStatus !== "fetching" ? current : null
  }
  function store(next: TploEditor | null, view?: Partial<TploEditorUi>) {
    const previous = client.getQueryData<TploEditor | null>(draftKey) ?? null
    const currentUi = client.getQueryData<TploEditorUi>(uiKey) ?? DEFAULT_TPLO_EDITOR_UI
    const nextUi = view ? { ...currentUi, ...(view.comparison === "original" ? { rotationActive: false } : {}), ...view } : currentUi
    // React Query may reuse equal values. Do not invalidate the live callbacks
    // for a no-op that cannot trigger a new render.
    if (JSON.stringify(previous) === JSON.stringify(next) && JSON.stringify(currentUi) === JSON.stringify(nextUi)) return
    scope.current.generation += 1
    client.setQueryData(draftKey, next)
    if (view) client.setQueryData(uiKey, nextUi)
  }
  function select(id: string | null, comparison: TploEditorUi["comparison"] = "original"): boolean {
    const current = editableNow(false), active = currentEditor()
    if (!canSelect || !current || !sameEditorSnapshot(active)) return false
    const same = active && "id" in active && active.id.toLowerCase() === id?.toLowerCase()
    if (active && !same && tploDraftHasChanges(active, current)) return false
    const selected = id ? tploObject(current, id) : null
    if (id && !selected && !(same && active?.kind === "tplo-create")) return false
    if (!closeOtherCleanMeasurementEditor(client, image.caseId, image.id, "tplo")) return false
    store(same ? active : null, { selectedId: selected?.id ?? (same ? id : null), activePoint: null, activeVertex: null, area: "body", comparison })
    return true
  }
  function beginCreate(name: string | null | ((index: number) => string)): boolean {
    const current = editableNow(true), active = currentEditor()
    if (!current || !sameEditorSnapshot(active) || current.document.objects.length >= 500 || active && tploDraftHasChanges(active, current)) return false
    const candidate = typeof name === "function" ? nextTploLabel(current.document.objects, name) : name
    if (typeof name === "function" && candidate === null) return false
    const label = PlanTploInputSchema.shape.label.safeParse(candidate)
    if (!label.success || !closeOtherCleanMeasurementEditor(client, image.caseId, image.id, "tplo")) return false
    const id = crypto.randomUUID()
    store({ kind: "tplo-create", id, baseRevision: current.revision, label: label.data ?? null, rotation_degrees: 0, fragment: null, fragmentComplete: true },
      { selectedId: id, activePoint: "center", activeVertex: null, area: "body", comparison: "original" })
    return true
  }
  function beginExisting(id: string, kind: "tplo-update" | "tplo-delete", expectedRevision?: number, comparison: TploEditorUi["comparison"] = "original"): boolean {
    const current = editableNow(kind === "tplo-update"), active = currentEditor()
    if (!current || !sameEditorSnapshot(active) || expectedRevision !== undefined && current.revision !== expectedRevision) return false
    const object = tploObject(current, id)
    if (!object || object.locked) return false
    if (active?.kind === kind && active.id.toLowerCase() === id.toLowerCase()) return active.baseRevision === current.revision
    if (active && tploDraftHasChanges(active, current)) return false
    const next = kind === "tplo-delete" ? tploEditorFromCommand({ kind, id: object.id, baseRevision: current.revision }) : tploEditorFromPlan(current, object.id)
    if (!next || !closeOtherCleanMeasurementEditor(client, image.caseId, image.id, "tplo")) return false
    store(next, { selectedId: object.id, activePoint: null, activeVertex: null, area: "body", comparison })
    return true
  }
  function open(name: (index: number) => string): "create" | "edit" | "parameters" | "select" | null {
    const active = currentEditor(), current = editableNow(false, active?.kind !== "tplo-parameters-set")
    if (!canOpen || !current || !sameEditorSnapshot(active)) return null
    if (active) return active.kind === "tplo-create" ? "create" : active.kind === "tplo-update" ? "edit" : active.kind === "tplo-parameters-set" ? "parameters" : null
    const visible = current.document.objects.filter(object => object.type === "TPLO" && object.visible !== false)
    const selected = (ui.selectedId ? tploObject(current, ui.selectedId) : null) ?? (visible.length === 1 ? visible[0] : null)
    if (selected) return beginExisting(selected.id, "tplo-update") ? "edit" : select(selected.id) ? "select" : null
    if (!visible.length) return beginCreate(name) ? "create" : select(null) ? "select" : null
    return select(null) ? "select" : null
  }
  function canDelete(id: string): boolean {
    const current = editableNow(false), active = currentEditor()
    const object = current && tploObject(current, id)
    return Boolean(options.toolActive && current && object && !object.locked && sameEditorSnapshot(active)
      && selectedId?.toLowerCase() === id.toLowerCase()
      && (!active || active.kind === "tplo-update" && active.id.toLowerCase() === id.toLowerCase() && active.baseRevision === current.revision))
  }
  function confirmDelete(id: string, baseRevision: number, expectedEditor: TploEditor | null): TploDeleteCommand | null {
    const current = editableNow(false), active = currentEditor()
    if (!canDelete(id) || !current || current.revision !== baseRevision || active !== expectedEditor) return null
    const object = tploObject(current, id)
    if (!object || !closeOtherCleanMeasurementEditor(client, image.caseId, image.id, "tplo")) return null
    const command: TploDeleteCommand = { kind: "tplo-delete", id: object.id, baseRevision }
    // The caller submits this exact command synchronously. Cache replacement
    // rejects old geometry snapshots without invalidating that submission.
    client.setQueryData<TploEditor>(draftKey, { ...command })
    return command
  }
  function beginParameters(): boolean {
    const current = editableNow(false, false), active = currentEditor()
    if (!current || !sameEditorSnapshot(active)) return false
    if (active?.kind === "tplo-parameters-set") return active.baseRevision === current.revision
    if (active && tploDraftHasChanges(active, current) || !closeOtherCleanMeasurementEditor(client, image.caseId, image.id, "tplo")) return false
    store({ kind: "tplo-parameters-set", baseRevision: current.revision, parameters: {} }, { activePoint: null, activeVertex: null, area: "body", comparison: "original" })
    return true
  }
  function update(change: (current: TploEditor) => TploEditor | null, expectedId?: string, view?: Partial<TploEditorUi>): boolean {
    const active = currentEditor(), current = editableNow(active?.kind !== "tplo-parameters-set", active?.kind !== "tplo-parameters-set")
    if (!canEdit || !current || !active || !sameEditorSnapshot(active) || active.baseRevision !== current.revision
      || expectedId !== undefined && (!("id" in active) || active.id.toLowerCase() !== expectedId.toLowerCase())) return false
    if (active.kind === "tplo-update") {
      const object = tploObject(current, active.id)
      if (!object || object.locked) return false
    }
    const next = change(active)
    if (!next) return false
    // A boundary can prevent movement while the user still selects a new target.
    // Keep that selection local without replacing the clinical draft.
    if (JSON.stringify(next) === JSON.stringify(active)) return view ? changeUi(view) : false
    const fragment = next.kind === "tplo-create" || next.kind === "tplo-update" ? next.fragment : null
    const activeVertex = client.getQueryData<TploEditorUi>(uiKey)?.activeVertex ?? null
    store(next, { activeVertex: activeVertex !== null && fragment && activeVertex < fragment.points.length ? activeVertex : null, ...view })
    return true
  }
  function changeUi(change: Partial<Omit<TploEditorUi, "selectedId">>): boolean {
    const current = editableNow(false), active = currentEditor()
    if (!canSelect || !options.toolActive || !current || !sameEditorSnapshot(active)) return false
    const vertex = change.activeVertex
    const fragment = active && (active.kind === "tplo-create" || active.kind === "tplo-update") ? active.fragment : selectedId ? tploObject(current, selectedId)?.fragment : null
    if (vertex !== undefined && vertex !== null && (!Number.isInteger(vertex) || vertex < 0 || !fragment || vertex >= fragment.points.length)) return false
    const currentUi = client.getQueryData<TploEditorUi>(uiKey) ?? DEFAULT_TPLO_EDITOR_UI
    const nextUi = { ...currentUi, ...(change.comparison === "original" || change.activePoint !== undefined || change.activeVertex !== undefined ? { rotationActive: false } : {}), ...change }
    if (JSON.stringify(currentUi) === JSON.stringify(nextUi)) return true
    scope.current.generation += 1
    client.setQueryData(uiKey, nextUi)
    return true
  }
  function command(): SaveTploInput | null {
    const active = currentEditor(), current = editableNow(active?.kind !== "tplo-delete" && active?.kind !== "tplo-parameters-set", active?.kind !== "tplo-parameters-set")
    if (!options.toolActive || !current || !active || !sameEditorSnapshot(active) || active.baseRevision !== current.revision || !tploDraftHasChanges(active, current)) return null
    if (active.kind === "tplo-update" || active.kind === "tplo-delete") {
      const object = tploObject(current, active.id)
      if (!object || object.locked) return null
    }
    return tploEditorCommand(active, current)
  }
  function closeCleanEditor(): boolean {
    if (!live()) return false
    const active = currentEditor(), current = client.getQueryData<ImagePlan>(planKey)
    if (!sameEditorSnapshot(active)) return false
    if (!active) return true
    const receipt = client.getQueryData<ImagePlanSaveState>(keys.imagePlanSave(image.caseId, image.id))
    if (submitting.current || isImagePlanSaveInFlight(client, identity) || isCalibrationSaveLocked(client, image.caseId, image.id)
      || receipt && isTploCommand(receipt.edit) && receipt.phase !== "idle" && receipt.phase !== "saved" || tploDraftHasChanges(active, current)) return false
    store(null, { activePoint: null, activeVertex: null, area: "body", comparison: "original" })
    return true
  }
  function discard(): boolean {
    if (!live() || submitting.current || isImagePlanSaveInFlight(client, identity) || isCalibrationSaveLocked(client, image.caseId, image.id)) return false
    const active = currentEditor()
    const beforeDraft = client.getQueryData<TploEditor | null>(draftKey)
    if (!sameEditorSnapshot(active)) return false
    const receipt = client.getQueryData<ImagePlanSaveState>(keys.imagePlanSave(image.caseId, image.id))
    const own = receipt && isTploCommand(receipt.edit) && receipt.phase !== "idle" && receipt.phase !== "saved" ? receipt.edit : null
    if (own && (captured.command !== own || !captured.discard())) return false
    const remaining = client.getQueryData<TploEditor | null>(draftKey)
    if (remaining && remaining !== beforeDraft) return false
    if (active) store(null, { activePoint: null, activeVertex: null, area: "body", comparison: "original" })
    return true
  }
  function discardRecovery(): boolean {
    if (!live() || !captured.discard()) return false
    scope.current.generation += 1
    return true
  }
  async function submit(expectedDeletion?: TploDeleteCommand): Promise<ImagePlanSaveState | null> {
    if (!live() || submitting.current) return null
    const current = expectedDeletion ? editableNow(false) : null
    const parsed = expectedDeletion ? SaveTploSchema.safeParse(expectedDeletion) : null
    const active = currentEditor()
    const target = current && expectedDeletion ? tploObject(current, expectedDeletion.id) : null
    const value = expectedDeletion ? parsed?.success && parsed.data.kind === "tplo-delete" && options.toolActive
      && current && current.revision === parsed.data.baseRevision && target && !target.locked
      && active?.kind === "tplo-delete" && JSON.stringify(tploEditorCommand(active, current)) === JSON.stringify(parsed.data) ? parsed.data : null : command()
    if (!value) return null
    submitting.current = true
    try {
      const result = await save.mutateAsync(value)
      return live() ? result : { phase: "error", code: "CLINICAL_CONTEXT_CHANGED" }
    } finally { submitting.current = false }
  }
  async function checkSave() {
    if (!live()) return
    const result = await captured.check()
    return live() ? result : { phase: "error" as const, code: "CLINICAL_CONTEXT_CHANGED" }
  }
  function refreshRead() {
    if (!live() || !canRetryRead || submitting.current || isCalibrationSaveLocked(client, image.caseId, image.id)
      || isImagePlanSaveInFlight(client, identity) || hasOtherImagePlanDraft(client, image.caseId, image.id, "tplo")
      || client.getQueryState(planKey)?.fetchStatus === "fetching") return
    return planQuery.refetch()
  }

  function setCutDiameter(diameterMm: number, id: string): TploDiameterResult["status"] {
    const current = editableNow(true), active = currentEditor()
    const origin = active && tploEditorOrigin(active)
    const scale = current?.document.calibration?.result?.mm_per_pixel
    if (!canEdit || !current || !active || !("id" in active) || active.id.toLowerCase() !== id.toLowerCase()
      || !origin || !scale || !image.widthPx || !image.heightPx || !sameEditorSnapshot(active)) return "invalid"
    const dimensions = { widthPx: image.widthPx, heightPx: image.heightPx }
    const result = tploWithDiameter(tploInPixels(origin, dimensions), diameterMm, scale, dimensions)
    if (result.status !== "available") return result.status
    const next = tploInNormalized(result.geometry, dimensions, origin)
    if (JSON.stringify(next) === JSON.stringify(origin)) return "available"
    return update(editor => changeTploOrigin(editor, next), id, { comparison: "original" }) ? "available" : "invalid"
  }

  return { planQuery, plan, editor, ui, selectedId, geometry, originGeometry: editor ? tploEditorOrigin(editor) : null, contextGeneration: generation,
    placement: editor ? tploPlacementStep(editor) : null, complete: Boolean(input), hasChanges, needsRebase,
    receipt: captured.receipt, recovery: { ...captured, check: checkSave, discard: discardRecovery }, locked, deleting, otherIntent, issue,
    canOpen, canSelect, canEdit, canSave, canRetryRead, canCreate: canOpen && uniqueIds && geometryEligible && !hasChanges && Boolean(plan && plan.document.objects.length < 500),
    // References are read-only but must share the editor's live cache/receipt
    // guards, including the gap before cache notifications trigger a render.
    canReadReferences: () => Boolean(options.toolActive && !needsRebase && sameEditorSnapshot(currentEditor()) && editableNow(false, false)),
    open, select, beginCreate, beginNew: beginCreate, beginUpdate: (id: string) => beginExisting(id, "tplo-update"),
    reopenSaved: (id: string, revision: number, comparison: TploEditorUi["comparison"]) => beginExisting(id, "tplo-update", revision, comparison),
    beginDelete: (id: string, revision?: number) => beginExisting(id, "tplo-delete", revision), canDelete, confirmDelete, beginParameters,
    placePoint: (point: ImagePoint, id: string, step: TploPlacementStep) => update(active => placeTploPoint(active, point, step), id,
      { activePoint: step === "center" ? "edge" : null, activeVertex: null, area: "body", comparison: "original" }),
    changeGeometry: (value: TploCutGeometry, id: string) => update(active => changeTploGeometry(active, value), id, { comparison: "original" }),
    changeOrigin: (value: TploGeometry, id: string, target?: TploAdjustmentTarget) => update(active => changeTploOrigin(active, value), id,
      target ? targetUi(target) : { comparison: "original" }),
    selectTarget: (target: TploAdjustmentTarget) => changeUi(targetUi(target)),
    setCutDiameter,
    beginFragment: (id: string) => update(beginTploFragment, id, { activeVertex: null, activePoint: null, area: "fragment", comparison: "original" }),
    appendFragmentPoint: (point: ImagePoint, count: number, id: string) => update(active => appendTploFragmentPoint(active, point, count), id,
      { activeVertex: null, activePoint: null, area: "fragment", comparison: "original" }),
    undoFragmentPoint: (id: string) => update(undoTploFragmentPoint, id),
    finishFragment: (id: string) => update(finishTploFragment, id, { activeVertex: 0, activePoint: null, area: "fragment", comparison: "original" }),
    cancelFragment: (id: string) => update(active => cancelTploFragment(active, plan ? tploObject(plan, id)?.fragment : null), id,
      { activeVertex: null, activePoint: null, area: "body", comparison: "original" }),
    insertFragmentVertex: (after: number, id: string) => update(active => insertTploFragmentVertex(active, after), id,
      { activeVertex: after + 1, activePoint: null, area: "fragment", comparison: "original" }),
    removeFragmentVertex: (index: number, id: string) => update(active => removeTploFragmentVertex(active, index), id,
      { activeVertex: null, activePoint: null, area: "fragment", comparison: "original" }),
    clearFragment: (id: string) => update(clearTploFragment, id, { activeVertex: null, activePoint: null, area: "body", comparison: "original" }),
    changeRotation: (value: number, id: string) => update(active => tploEditorGeometry(active)
      && (active.kind === "tplo-create" || active.kind === "tplo-update") && active.fragmentComplete !== false ? changeTploRotation(active, value) : null,
      id, { comparison: editor && (editor.kind === "tplo-create" || editor.kind === "tplo-update") && editor.fragment ? "simulated" : "original" }),
    setRotationActive: (active: boolean) => changeUi({ rotationActive: active, ...(active ? { comparison: "simulated", activePoint: null, activeVertex: null } : {}) }),
    changeFragment: (value: TploGeometryEditor["fragment"], complete: boolean, id: string) => update(active => changeTploFragment(active, value, complete), id,
      { activeVertex: null, activePoint: null, area: "body", comparison: "original" }),
    changeParameters: (value: Extract<TploEditor, { kind: "tplo-parameters-set" }>["parameters"]) => update(active => changeTploParameters(active, value)),
    changeParameterFields: (fields: TploParameterFields) => update(active => active.kind === "tplo-parameters-set"
      ? { ...active, parameterFields: { ...fields }, parameters: tploParameterPatch(fields, plan?.document.tplo) ?? active.parameters } : null),
    selectPoint: (point: TploPlacementStep | null) => changeUi({ activePoint: point, activeVertex: null, area: "body", comparison: "original" }),
    selectVertex: (index: number | null) => changeUi({ activeVertex: index, activePoint: null, area: "body", comparison: "original" }),
    setDetailsExpanded: (expanded: boolean) => changeUi({ detailsExpanded: expanded }),
    setComparison: (comparison: TploEditorUi["comparison"]) => changeUi({ comparison, activePoint: null, activeVertex: null }),
    command, closeCleanEditor, discard, save, submit, refreshRead }
}

export { useImageTplo }
export type ImageTploState = ReturnType<typeof useImageTplo>
export type { TploDeleteCommand }
