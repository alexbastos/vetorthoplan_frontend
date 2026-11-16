import { QueryObserver, type QueryClient } from "@tanstack/react-query"

import { casesQueryKeys as keys } from "../hooks/cases-query-keys"
import { SaveCalibrationSchema, type ImagePlan, type SaveCalibrationInput } from "../schemas/image-plan.schema"
import { PlanSaveCommandSchema, SavePlanEditSchema, isAngleCommand, isCircleCommand, isDistanceCommand, isLandmarksCommand, planCommandMatches, planCommandOwner, type PlanSaveCommand, type SavePlanEditInput } from "../schemas/image-plan-command.schema"
import { fetchImagePlan, ImagePlanError, saveImageCalibration, saveImagePlanEdit } from "../services/image-plan-api"
import { IDLE_CALIBRATION_SAVE, imagePlanSaveCommand, isPlanImageDeleted, type CalibrationSaveState, type PlanIdentity } from "./calibration-save-state"
import { calibrationFromEditor, type CalibrationEditor } from "./calibration-editor"
import type { ImageQualityDraft } from "./image-quality-draft"
import { hasOtherImagePlanDraft } from "./image-plan-draft"
import { distanceEditorHasChanges, distanceEditorMatchesCommand, type DistanceEditor } from "./distance-editor"
import { angleEditorHasChanges, angleEditorMatchesCommand, angleObject, type AngleEditor } from "./angle-editor"
import { circleEditorHasChanges, circleEditorMatchesCommand, circleObject, type CircleEditor } from "./circle-editor"
import { landmarksEditorHasChanges, landmarksEditorMatchesCommand, type LandmarksEditor } from "./landmarks-editor"

type Options = { fetchImpl?: typeof fetch; checkOnly?: boolean }
type Pending = { fingerprint: string; promise: Promise<CalibrationSaveState> }
const requests = new WeakMap<QueryClient, Map<string, Pending>>()
const requestListeners = new WeakMap<QueryClient, Map<string, Set<() => void>>>()
function isImagePlanSaveInFlight(client: QueryClient, identity: PlanIdentity): boolean {
  return requests.get(client)?.has(JSON.stringify(keys.imagePlanSave(identity.caseId, identity.imageId))) ?? false
}
function subscribeImagePlanSave(client: QueryClient, identity: PlanIdentity, listener: () => void) {
  const id = JSON.stringify(keys.imagePlanSave(identity.caseId, identity.imageId))
  let scopes = requestListeners.get(client)
  if (!scopes) { scopes = new Map(); requestListeners.set(client, scopes) }
  let listeners = scopes.get(id)
  if (!listeners) { listeners = new Set(); scopes.set(id, listeners) }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (!listeners.size) scopes.delete(id)
  }
}
function notifyRequestListeners(client: QueryClient, id: string) {
  requestListeners.get(client)?.get(id)?.forEach(listener => listener())
}
const activeDeletion = (phase?: string) => phase === "deleting" || phase === "checking" || phase === "uncertain" || phase === "deleted"
const needsVerification = (state: CalibrationSaveState) => ["uncertain", "saving", "checking"].includes(state.phase)

function requestCalibrationSave(client: QueryClient, identity: PlanIdentity, value: SaveCalibrationInput, options: Options = {}): Promise<CalibrationSaveState> {
  const input = SaveCalibrationSchema.safeParse(value)
  if (!input.success) return Promise.resolve({ phase: "error", code: "VALIDATION_ERROR" })
  return requestSave(client, identity, input.data, options)
}

function requestPlanEditSave(client: QueryClient, identity: PlanIdentity, value: SavePlanEditInput, options: Options = {}): Promise<CalibrationSaveState> {
  const input = SavePlanEditSchema.safeParse(value)
  if (!input.success) return Promise.resolve({ phase: "error", code: "VALIDATION_ERROR" })
  return requestSave(client, identity, input.data, options)
}

const intent = (command: PlanSaveCommand) => "kind" in command ? { edit: command } : { draft: command }
const sameCommand = (left: PlanSaveCommand, right: PlanSaveCommand) => JSON.stringify(left) === JSON.stringify(right)
function sameCommandOwner(left: PlanSaveCommand, right: PlanSaveCommand): boolean {
  if (planCommandOwner(left) !== planCommandOwner(right)) return false
  if (!("kind" in left) || !("kind" in right)) return !("kind" in left) && !("kind" in right)
  if (left.kind === "radiographic-quality" || right.kind === "radiographic-quality") return left.kind === right.kind
  // References target the singleton field on this image, not an object UUID.
  if (isLandmarksCommand(left) || isLandmarksCommand(right)) return left.kind === right.kind
  return left.kind === right.kind && left.id.toLowerCase() === right.id.toLowerCase()
}

function removedMeasurementCode(command: PlanSaveCommand) {
  if (!("kind" in command)) return undefined
  if (command.kind === "distance-delete") return "DISTANCE_ALREADY_REMOVED"
  if (command.kind === "angle-delete") return "ANGLE_ALREADY_REMOVED"
  if (command.kind === "circle-delete") return "CIRCLE_ALREADY_REMOVED"
  if (command.kind === "landmarks-clear") return "LANDMARKS_ALREADY_REMOVED"
  return undefined
}

// Explicit callers submit the revision they observed. Overlapping different
// intents are returned to their caller, never silently rebased or auto-replayed.
function requestSave(client: QueryClient, identity: PlanIdentity, input: PlanSaveCommand, options: Options): Promise<CalibrationSaveState> {
  let pending = requests.get(client)
  if (!pending) { pending = new Map(); requests.set(client, pending) }
  const id = JSON.stringify(keys.imagePlanSave(identity.caseId, identity.imageId))
  const fingerprint = JSON.stringify({ input, checkOnly: Boolean(options.checkOnly) })
  const previous = pending.get(id)
  if (previous) return previous.fingerprint === fingerprint ? previous.promise
    : Promise.resolve({ phase: "error", code: "OPERATION_BLOCKED", ...intent(input) })
  const promise = Promise.resolve().then(() => save(client, identity, input, options)).finally(() => {
    pending.delete(id)
    notifyRequestListeners(client, id)
  })
  pending.set(id, { fingerprint, promise })
  notifyRequestListeners(client, id)
  return promise
}

async function save(client: QueryClient, identity: PlanIdentity, input: PlanSaveCommand, options: Options): Promise<CalibrationSaveState> {
  const { caseId, imageId } = identity
  const key = keys.imagePlanSave(caseId, imageId)
  const planKey = keys.imagePlan(caseId, imageId)
  const before = client.getQueryData<CalibrationSaveState>(key) ?? IDLE_CALIBRATION_SAVE
  let ownsReceipt = () => true
  const removed = () => isPlanImageDeleted(client, identity) || !ownsReceipt()
  const absent = (): CalibrationSaveState => ({ phase: "error", code: isPlanImageDeleted(client, identity) ? "IMAGE_NOT_FOUND" : "CLINICAL_CONTEXT_CHANGED" })
  if (removed()) return absent()
  const wasUncertain = needsVerification(before)
  const checking = options.checkOnly || wasUncertain
  const owner = planCommandOwner(input)
  const distanceDraft = client.getQueryData<DistanceEditor | null>(keys.imageDistanceDraft(caseId, imageId))
  const angleDraft = client.getQueryData<AngleEditor | null>(keys.imageAngleDraft(caseId, imageId))
  const circleDraft = client.getQueryData<CircleEditor | null>(keys.imageCircleDraft(caseId, imageId))
  const landmarksDraft = client.getQueryData<LandmarksEditor | null>(keys.imageLandmarksDraft(caseId, imageId))
  const otherDraft = hasOtherImagePlanDraft(client, caseId, imageId, owner)
    || (isDistanceCommand(input) && distanceDraft
      && distanceEditorHasChanges(distanceDraft, client.getQueryData<ImagePlan>(planKey)) && !distanceEditorMatchesCommand(distanceDraft, input))
    || (isAngleCommand(input) && angleDraft
      && angleEditorHasChanges(angleDraft, client.getQueryData<ImagePlan>(planKey)) && !angleEditorMatchesCommand(angleDraft, input))
    || (isCircleCommand(input) && circleDraft
      && circleEditorHasChanges(circleDraft, client.getQueryData<ImagePlan>(planKey)) && !circleEditorMatchesCommand(circleDraft, input))
    || (isLandmarksCommand(input) && landmarksDraft
      && landmarksEditorHasChanges(landmarksDraft, client.getQueryData<ImagePlan>(planKey)) && !landmarksEditorMatchesCommand(landmarksDraft, input))
  if (!checking && otherDraft) {
    return { phase: "error", code: "OPERATION_BLOCKED", ...intent(input) }
  }
  if (activeDeletion(client.getQueryData<{ phase?: string }>(keys.caseDeletion(caseId))?.phase)
    || activeDeletion(client.getQueryData<{ phase?: string }>(keys.imageDeletion(caseId, imageId))?.phase)) {
    return { phase: "error", code: "OPERATION_BLOCKED", ...intent(input) }
  }
  // Keep ambiguous command receipts across unmounts, until this organization's
  // QueryClient is discarded or the image/case is deleted. Never persist them.
  client.setQueryDefaults(key, { gcTime: Infinity })
  // Defaults alone do not upgrade an existing query. Briefly observe it to
  // extend its lifetime and clear any collection already scheduled before save.
  const releaseReceipt = new QueryObserver(client, { queryKey: key, enabled: false, gcTime: Infinity }).subscribe(() => {})
  releaseReceipt()
  const receiptQuery = client.getQueryCache().find({ queryKey: key, exact: true })
  ownsReceipt = () => Boolean(receiptQuery && client.getQueryCache().find({ queryKey: key, exact: true }) === receiptQuery)
  const publish = (state: CalibrationSaveState) => {
    if (removed()) return absent()
    if (state.phase === "saved" && state.edit?.kind === "radiographic-quality") {
      const draftKey = keys.imageQualityDraft(caseId, imageId)
      const current = client.getQueryData<ImageQualityDraft | null>(draftKey)
      if (current?.baseRevision === state.edit.baseRevision && JSON.stringify(current.quality) === JSON.stringify(state.edit.quality)) {
        client.setQueryData(draftKey, null)
      }
    }
    if (state.phase === "saved" && state.draft) {
      const draftKey = keys.imageCalibrationDraft(caseId, imageId)
      const current = client.getQueryData<CalibrationEditor | null>(draftKey)
      // Acknowledgement also clears a matching draft after its view unmounts.
      // A newer/different local intent must never be discarded by an old save.
      if (current?.baseRevision === state.draft.baseRevision
        && JSON.stringify(calibrationFromEditor(current)) === JSON.stringify(state.draft.calibration)) client.setQueryData(draftKey, null)
    }
    if (state.phase === "saved" && isDistanceCommand(state.edit)) {
      const draftKey = keys.imageDistanceDraft(caseId, imageId)
      const current = client.getQueryData<DistanceEditor | null>(draftKey)
      if (current && distanceEditorMatchesCommand(current, state.edit)) client.setQueryData(draftKey, null)
    }
    if (state.phase === "saved" && isAngleCommand(state.edit)) {
      const draftKey = keys.imageAngleDraft(caseId, imageId)
      const current = client.getQueryData<AngleEditor | null>(draftKey)
      // An old acknowledgement must not erase a newer placement or selection.
      if (!current || angleEditorMatchesCommand(current, state.edit)) {
        if (current) client.setQueryData(draftKey, null)
        const selectionKey = keys.imageAngleSelection(caseId, imageId)
        const selected = client.getQueryData<string | null>(selectionKey)
        const confirmed = client.getQueryData<ImagePlan>(planKey)
        if (!selected || selected.toLowerCase() === state.edit.id.toLowerCase()) {
          client.setQueryData(selectionKey, confirmed ? angleObject(confirmed, state.edit.id)?.id ?? null : null)
        }
      }
    }
    if (state.phase === "saved" && isCircleCommand(state.edit)) {
      const draftKey = keys.imageCircleDraft(caseId, imageId)
      const current = client.getQueryData<CircleEditor | null>(draftKey)
      if (!current || circleEditorMatchesCommand(current, state.edit)) {
        if (current) client.setQueryData(draftKey, null)
        const selectionKey = keys.imageCircleSelection(caseId, imageId)
        const selected = client.getQueryData<string | null>(selectionKey)
        const confirmed = client.getQueryData<ImagePlan>(planKey)
        if (!selected || selected.toLowerCase() === state.edit.id.toLowerCase()) {
          client.setQueryData(selectionKey, confirmed ? circleObject(confirmed, state.edit.id)?.id ?? null : null)
        }
      }
    }
    if (state.phase === "saved" && isLandmarksCommand(state.edit)) {
      const draftKey = keys.imageLandmarksDraft(caseId, imageId)
      const current = client.getQueryData<LandmarksEditor | null>(draftKey)
      if (current && landmarksEditorMatchesCommand(current, state.edit)) client.setQueryData(draftKey, null)
    }
    client.setQueryData(key, state)
    return state
  }
  const previous = imagePlanSaveCommand(before)
  if (previous && before.phase !== "idle" && before.phase !== "saved" && !sameCommandOwner(previous, input)) {
    return { phase: "error", code: "OPERATION_BLOCKED", ...intent(input) }
  }
  if (options.checkOnly && (!wasUncertain || !previous || !sameCommand(previous, input))) {
    return { phase: "error", code: "OPERATION_BLOCKED", ...intent(input) }
  }
  if (wasUncertain && !previous) return publish({ phase: "uncertain", code: "OPERATION_BLOCKED" })
  const draft = wasUncertain && previous ? previous : input
  const retained = intent(draft)

  const cache = async (plan: ImagePlan) => {
    if (removed()) throw new ImagePlanError("IMAGE_NOT_FOUND")
    await client.cancelQueries({ queryKey: planKey, exact: true })
    if (removed()) throw new ImagePlanError("IMAGE_NOT_FOUND")
    client.setQueryData<ImagePlan>(planKey, current => current && current.revision > plan.revision ? current : plan)
    return client.getQueryData<ImagePlan>(planKey)!
  }
  const read = async () => cache(await fetchImagePlan(caseId, imageId, { fetchImpl: options.fetchImpl, signal: AbortSignal.timeout(30_000) }))
  const acknowledged = (plan: ImagePlan) => plan.revision > draft.baseRevision && planCommandMatches(plan, draft)
  const reconcile = async () => {
    publish({ phase: "checking", ...retained })
    try {
      const plan = await read()
      if (acknowledged(plan)) return publish({ phase: "saved", ...retained, currentRevision: plan.revision,
        ...(removedMeasurementCode(draft) ? { code: removedMeasurementCode(draft) } : {}) })
      // An unchanged GET cannot rule out a still-running, timed-out write.
      // A newer revision makes that old CAS command unable to overwrite it.
      return publish({ phase: plan.revision > draft.baseRevision ? "conflict" : "uncertain", ...retained,
        code: plan.revision > draft.baseRevision ? "PLAN_REVISION_CONFLICT" : "SAVE_NOT_CONFIRMED", currentRevision: plan.revision })
    } catch (error) {
      return publish({ phase: "uncertain", ...retained, code: error instanceof ImagePlanError ? error.code : "SERVICE_UNAVAILABLE" })
    }
  }
  if (before.phase === "saved" && previous && sameCommand(previous, input) && !options.checkOnly) {
    const cached = client.getQueryData<ImagePlan>(planKey)
    return cached && acknowledged(cached) ? publish({ ...before, currentRevision: cached.revision }) : reconcile()
  }
  if (wasUncertain || options.checkOnly) return reconcile()
  publish({ phase: "saving", ...retained })
  await client.cancelQueries({ queryKey: planKey, exact: true })
  if (removed()) return absent()
  try {
    const requestOptions = { fetchImpl: options.fetchImpl, signal: AbortSignal.timeout(30_000) }
    const plan = await cache(await ("kind" in draft ? saveImagePlanEdit(caseId, imageId, draft, requestOptions)
      : saveImageCalibration(caseId, imageId, draft, requestOptions)))
    return acknowledged(plan) ? publish({ phase: "saved", ...retained, currentRevision: plan.revision })
      : publish({ phase: "conflict", ...retained, code: "PLAN_REVISION_CONFLICT", currentRevision: plan.revision })
  } catch (error) {
    if (error instanceof ImagePlanError && !error.uncertain) {
      if (error.code === "PLAN_REVISION_CONFLICT") {
        let revision = error.currentRevision
        try {
          const latest = await read()
          revision = latest.revision
          // A rejected CAS did not perform this removal. Report the observed
          // absence separately, without a second PUT or claiming authorship.
          const removedCode = removedMeasurementCode(draft)
          if (removedCode && acknowledged(latest)) {
            return publish({ phase: "saved", ...retained, code: removedCode, currentRevision: revision })
          }
        } catch { /* Preserve the draft and explicit conflict even when refresh fails. */ }
        return publish({ phase: "conflict", ...retained, code: error.code, currentRevision: revision })
      }
      return publish({ phase: "error", ...retained, code: error.code })
    }
    return reconcile()
  }
}

// Recovery must name the exact captured command. A stale panel cannot check or
// discard a newer receipt, another editor, or another object on the same image.
function checkImagePlanSave(client: QueryClient, identity: PlanIdentity, expected: PlanSaveCommand, options: Omit<Options, "checkOnly"> = {}) {
  const receipt = client.getQueryData<CalibrationSaveState>(keys.imagePlanSave(identity.caseId, identity.imageId))
  const command = PlanSaveCommandSchema.safeParse(imagePlanSaveCommand(receipt))
  const input = PlanSaveCommandSchema.safeParse(expected)
  if (!receipt || !needsVerification(receipt) || !command.success || !input.success || !sameCommand(command.data, input.data)) {
    return Promise.resolve<CalibrationSaveState>({ phase: "error", code: "OPERATION_BLOCKED" })
  }
  return requestSave(client, identity, command.data, { ...options, checkOnly: true })
}

function discardPlanEditSave(client: QueryClient, identity: PlanIdentity, expected: SavePlanEditInput): boolean {
  const key = keys.imagePlanSave(identity.caseId, identity.imageId)
  const receipt = client.getQueryData<CalibrationSaveState>(key)
  if (!receipt?.edit || !["error", "conflict"].includes(receipt.phase) || isImagePlanSaveInFlight(client, identity)) return false
  const command = SavePlanEditSchema.safeParse(receipt.edit), input = SavePlanEditSchema.safeParse(expected)
  if (!command.success || !input.success || !sameCommand(command.data, input.data)) return false
  const planKey = keys.imagePlan(identity.caseId, identity.imageId)
  const plan = client.getQueryData<ImagePlan>(planKey)
  // Discard is an explicit UI decision, and cannot make a known stale plan look
  // current. An unresolved/ambiguous write can only be checked, never discarded.
  if (!plan || receipt.phase === "conflict" && receipt.currentRevision === undefined
    || receipt.currentRevision !== undefined && plan.revision < receipt.currentRevision) {
    void client.resetQueries({ queryKey: planKey, exact: true })
  }
  client.setQueryData(key, IDLE_CALIBRATION_SAVE)
  return true
}

export { requestCalibrationSave, requestPlanEditSave, checkImagePlanSave, discardPlanEditSave, isImagePlanSaveInFlight, subscribeImagePlanSave }
