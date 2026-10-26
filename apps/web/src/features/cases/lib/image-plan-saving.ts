import { QueryObserver, type QueryClient } from "@tanstack/react-query"

import { casesQueryKeys as keys } from "../hooks/cases-query-keys"
import { calibrationMatches, SaveCalibrationSchema, type ImagePlan, type SaveCalibrationInput } from "../schemas/image-plan.schema"
import { fetchImagePlan, ImagePlanError, saveImageCalibration } from "../services/image-plan-api"
import { IDLE_CALIBRATION_SAVE, isPlanImageDeleted, type CalibrationSaveState, type PlanIdentity } from "./calibration-save-state"

type Options = { fetchImpl?: typeof fetch; checkOnly?: boolean }
type Pending = { fingerprint: string; promise: Promise<CalibrationSaveState> }
const requests = new WeakMap<QueryClient, Map<string, Pending>>()
const activeDeletion = (phase?: string) => phase === "deleting" || phase === "checking" || phase === "uncertain" || phase === "deleted"

function requestCalibrationSave(client: QueryClient, identity: PlanIdentity, value: SaveCalibrationInput, options: Options = {}): Promise<CalibrationSaveState> {
  const input = SaveCalibrationSchema.safeParse(value)
  if (!input.success) return Promise.resolve({ phase: "error", code: "VALIDATION_ERROR" })
  let pending = requests.get(client)
  if (!pending) { pending = new Map(); requests.set(client, pending) }
  const id = JSON.stringify(keys.imagePlanSave(identity.caseId, identity.imageId))
  const fingerprint = JSON.stringify(input.data)
  const previous = pending.get(id)
  if (previous) return previous.fingerprint === fingerprint ? previous.promise
    : Promise.resolve({ phase: "error", code: "OPERATION_BLOCKED", draft: input.data })
  const promise = Promise.resolve().then(() => save(client, identity, input.data, options)).finally(() => pending.delete(id))
  pending.set(id, { fingerprint, promise })
  return promise
}

async function save(client: QueryClient, identity: PlanIdentity, input: SaveCalibrationInput, options: Options): Promise<CalibrationSaveState> {
  const { caseId, imageId } = identity
  const key = keys.imagePlanSave(caseId, imageId)
  const planKey = keys.imagePlan(caseId, imageId)
  const before = client.getQueryData<CalibrationSaveState>(key) ?? IDLE_CALIBRATION_SAVE
  const removed = () => isPlanImageDeleted(client, identity)
  const absent: CalibrationSaveState = { phase: "error", code: "IMAGE_NOT_FOUND" }
  if (removed()) return absent
  if (activeDeletion(client.getQueryData<{ phase?: string }>(keys.caseDeletion(caseId))?.phase)
    || activeDeletion(client.getQueryData<{ phase?: string }>(keys.imageDeletion(caseId, imageId))?.phase)) {
    return { phase: "error", code: "OPERATION_BLOCKED", draft: input }
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
    client.setQueryData(key, state)
    return state
  }
  const wasUncertain = ["uncertain", "saving", "checking"].includes(before.phase)
  const draft = wasUncertain && before.draft ? before.draft : input
  if (wasUncertain && !before.draft) return publish({ phase: "uncertain", code: "OPERATION_BLOCKED" })

  const cache = async (plan: ImagePlan) => {
    if (removed()) throw new ImagePlanError("IMAGE_NOT_FOUND")
    await client.cancelQueries({ queryKey: planKey, exact: true })
    if (removed()) throw new ImagePlanError("IMAGE_NOT_FOUND")
    client.setQueryData<ImagePlan>(planKey, current => current && current.revision > plan.revision ? current : plan)
    return client.getQueryData<ImagePlan>(planKey)!
  }
  const read = async () => cache(await fetchImagePlan(caseId, imageId, { fetchImpl: options.fetchImpl, signal: AbortSignal.timeout(30_000) }))
  const acknowledged = (plan: ImagePlan) => plan.revision > draft.baseRevision
    && calibrationMatches(plan.document.calibration, draft.calibration)
    && (draft.calibration === null || Boolean(plan.document.calibration?.result))
  const reconcile = async () => {
    publish({ phase: "checking", draft })
    try {
      const plan = await read()
      if (acknowledged(plan)) return publish({ phase: "saved", draft, currentRevision: plan.revision })
      // An unchanged GET cannot rule out a still-running, timed-out write.
      // A newer revision makes that old CAS command unable to overwrite it.
      return publish({ phase: plan.revision > draft.baseRevision ? "conflict" : "uncertain", draft,
        code: plan.revision > draft.baseRevision ? "PLAN_REVISION_CONFLICT" : "SAVE_NOT_CONFIRMED", currentRevision: plan.revision })
    } catch (error) {
      return publish({ phase: "uncertain", draft, code: error instanceof ImagePlanError ? error.code : "SERVICE_UNAVAILABLE" })
    }
  }
  if (before.phase === "saved" && JSON.stringify(before.draft) === JSON.stringify(input) && !options.checkOnly) {
    const cached = client.getQueryData<ImagePlan>(planKey)
    return cached && acknowledged(cached) ? publish({ ...before, currentRevision: cached.revision }) : reconcile()
  }
  if (wasUncertain || options.checkOnly) return reconcile()
  publish({ phase: "saving", draft })
  await client.cancelQueries({ queryKey: planKey, exact: true })
  if (removed()) return absent
  try {
    const plan = await cache(await saveImageCalibration(caseId, imageId, draft, { fetchImpl: options.fetchImpl, signal: AbortSignal.timeout(30_000) }))
    return acknowledged(plan) ? publish({ phase: "saved", draft, currentRevision: plan.revision })
      : publish({ phase: "conflict", draft, code: "PLAN_REVISION_CONFLICT", currentRevision: plan.revision })
  } catch (error) {
    if (error instanceof ImagePlanError && !error.uncertain) {
      if (error.code === "PLAN_REVISION_CONFLICT") {
        let revision = error.currentRevision
        try { revision = (await read()).revision } catch { /* Preserve the draft and explicit conflict even when refresh fails. */ }
        return publish({ phase: "conflict", draft, code: error.code, currentRevision: revision })
      }
      return publish({ phase: "error", draft, code: error.code })
    }
    return reconcile()
  }
}

export { requestCalibrationSave }
