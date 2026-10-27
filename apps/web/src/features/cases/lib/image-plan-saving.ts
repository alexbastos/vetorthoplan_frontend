import { QueryObserver, type QueryClient } from "@tanstack/react-query"

import { casesQueryKeys as keys } from "../hooks/cases-query-keys"
import { SaveCalibrationSchema, type ImagePlan, type SaveCalibrationInput } from "../schemas/image-plan.schema"
import { PlanSaveCommandSchema, SavePlanEditSchema, planCommandMatches, type PlanSaveCommand, type SavePlanEditInput } from "../schemas/image-plan-command.schema"
import { fetchImagePlan, ImagePlanError, saveImageCalibration, saveImagePlanEdit } from "../services/image-plan-api"
import { IDLE_CALIBRATION_SAVE, isPlanImageDeleted, type CalibrationSaveState, type PlanIdentity } from "./calibration-save-state"
import { calibrationFromEditor, type CalibrationEditor } from "./calibration-editor"
import { hasQualityDraft, type ImageQualityDraft } from "./image-quality-draft"
import { hasCalibrationDraft } from "./calibration-draft"

type Options = { fetchImpl?: typeof fetch; checkOnly?: boolean }
type Pending = { fingerprint: string; promise: Promise<CalibrationSaveState> }
const requests = new WeakMap<QueryClient, Map<string, Pending>>()
const activeDeletion = (phase?: string) => phase === "deleting" || phase === "checking" || phase === "uncertain" || phase === "deleted"

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
const receiptCommand = (state: CalibrationSaveState) => state.edit ?? state.draft

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
  const promise = Promise.resolve().then(() => save(client, identity, input, options)).finally(() => pending.delete(id))
  pending.set(id, { fingerprint, promise })
  return promise
}

async function save(client: QueryClient, identity: PlanIdentity, input: PlanSaveCommand, options: Options): Promise<CalibrationSaveState> {
  const { caseId, imageId } = identity
  const key = keys.imagePlanSave(caseId, imageId)
  const planKey = keys.imagePlan(caseId, imageId)
  const before = client.getQueryData<CalibrationSaveState>(key) ?? IDLE_CALIBRATION_SAVE
  const removed = () => isPlanImageDeleted(client, identity)
  const absent: CalibrationSaveState = { phase: "error", code: "IMAGE_NOT_FOUND" }
  if (removed()) return absent
  const checking = options.checkOnly || ["uncertain", "saving", "checking"].includes(before.phase)
  if (!checking && ("kind" in input ? hasCalibrationDraft(client, caseId, imageId) : hasQualityDraft(client, caseId, imageId))) {
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
  const publish = (state: CalibrationSaveState) => {
    if (removed()) return absent
    if (state.phase === "saved" && state.edit) {
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
    client.setQueryData(key, state)
    return state
  }
  const wasUncertain = ["uncertain", "saving", "checking"].includes(before.phase)
  const previous = receiptCommand(before)
  if (previous && before.phase !== "idle" && before.phase !== "saved" && ("kind" in previous) !== ("kind" in input)) {
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
      if (acknowledged(plan)) return publish({ phase: "saved", ...retained, currentRevision: plan.revision })
      // An unchanged GET cannot rule out a still-running, timed-out write.
      // A newer revision makes that old CAS command unable to overwrite it.
      return publish({ phase: plan.revision > draft.baseRevision ? "conflict" : "uncertain", ...retained,
        code: plan.revision > draft.baseRevision ? "PLAN_REVISION_CONFLICT" : "SAVE_NOT_CONFIRMED", currentRevision: plan.revision })
    } catch (error) {
      return publish({ phase: "uncertain", ...retained, code: error instanceof ImagePlanError ? error.code : "SERVICE_UNAVAILABLE" })
    }
  }
  if (before.phase === "saved" && JSON.stringify(previous) === JSON.stringify(input) && !options.checkOnly) {
    const cached = client.getQueryData<ImagePlan>(planKey)
    return cached && acknowledged(cached) ? publish({ ...before, currentRevision: cached.revision }) : reconcile()
  }
  if (wasUncertain || options.checkOnly) return reconcile()
  publish({ phase: "saving", ...retained })
  await client.cancelQueries({ queryKey: planKey, exact: true })
  if (removed()) return absent
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
        try { revision = (await read()).revision } catch { /* Preserve the draft and explicit conflict even when refresh fails. */ }
        return publish({ phase: "conflict", ...retained, code: error.code, currentRevision: revision })
      }
      return publish({ phase: "error", ...retained, code: error.code })
    }
    return reconcile()
  }
}

function checkImagePlanSave(client: QueryClient, identity: PlanIdentity, options: Omit<Options, "checkOnly"> = {}) {
  const receipt = client.getQueryData<CalibrationSaveState>(keys.imagePlanSave(identity.caseId, identity.imageId))
  const command = PlanSaveCommandSchema.safeParse(receipt && receiptCommand(receipt))
  if (!command.success) return Promise.resolve<CalibrationSaveState>({ phase: "error", code: "OPERATION_BLOCKED" })
  return requestSave(client, identity, command.data, { ...options, checkOnly: true })
}

function discardPlanEditSave(client: QueryClient, identity: PlanIdentity): boolean {
  const key = keys.imagePlanSave(identity.caseId, identity.imageId)
  const receipt = client.getQueryData<CalibrationSaveState>(key)
  if (!receipt?.edit || !["error", "conflict"].includes(receipt.phase) || requests.get(client)?.has(JSON.stringify(key))) return false
  const planKey = keys.imagePlan(identity.caseId, identity.imageId)
  const plan = client.getQueryData<ImagePlan>(planKey)
  // Discard is an explicit UI decision, and cannot make a known stale plan look
  // current. An unresolved/ambiguous write can only be checked, never discarded.
  if (!plan || receipt.currentRevision !== undefined && plan.revision < receipt.currentRevision) {
    void client.resetQueries({ queryKey: planKey, exact: true })
  }
  client.setQueryData(key, IDLE_CALIBRATION_SAVE)
  return true
}

export { requestCalibrationSave, requestPlanEditSave, checkImagePlanSave, discardPlanEditSave }
