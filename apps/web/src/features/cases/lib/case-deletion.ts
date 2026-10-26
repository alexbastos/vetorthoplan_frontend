import type { QueryClient } from "@tanstack/react-query"

import { casesQueryKeys as keys } from "../hooks/cases-query-keys"
import { CaseDeleteError, deleteClinicalCase } from "../services/case-delete-api"
import { CaseDetailRequestError, fetchCaseDetail } from "../services/case-detail-api"

type CaseDeletionState = {
  phase: "idle" | "deleting" | "checking" | "deleted" | "error" | "uncertain"
  message?: "blocked" | "accessDenied" | "unavailable" | "unconfirmed" | "stillPresent"
}
const IDLE_CASE_DELETION: CaseDeletionState = { phase: "idle" }
const requests = new WeakMap<QueryClient, Map<string, Promise<CaseDeletionState>>>()

function isCaseDeletionLocked(client: QueryClient, caseId: string): boolean {
  const phase = client.getQueryData<CaseDeletionState>(keys.caseDeletion(caseId))?.phase
  return phase === "deleting" || phase === "checking" || phase === "uncertain" || phase === "deleted"
}

function requestCaseDeletion(client: QueryClient, caseId: string, options: { fetchImpl?: typeof fetch } = {}): Promise<CaseDeletionState> {
  let pending = requests.get(client)
  if (!pending) { pending = new Map(); requests.set(client, pending) }
  const existing = pending.get(caseId)
  if (existing) return existing
  const action = Promise.resolve().then(() => remove(client, caseId, options)).finally(() => pending.delete(caseId))
  pending.set(caseId, action)
  return action
}

async function remove(client: QueryClient, caseId: string, options: { fetchImpl?: typeof fetch }): Promise<CaseDeletionState> {
  const key = keys.caseDeletion(caseId)
  const before = client.getQueryData<CaseDeletionState>(key) ?? IDLE_CASE_DELETION
  if (before.phase === "deleted") return before
  const publish = (state: CaseDeletionState) => { client.setQueryData(key, state); return state }
  const owned = (query: { queryKey: readonly unknown[] }) => query.queryKey[0] === "cases" && query.queryKey[2] === caseId
  const competing = client.getQueryCache().findAll({ predicate: query => owned(query) && query.queryKey[1] !== "case-deletion" })
    .some(query => {
      const phase = (query.state.data as { phase?: string } | undefined)?.phase
      return phase && ["deleting", "checking", "cancelling", "requesting", "renaming", "saving", "uncertain"].includes(phase)
    })
  if (competing) return publish({ phase: "error", message: "blocked" })
  const checking = before.phase === "uncertain"
  publish({ phase: checking ? "checking" : "deleting" })
  const exists = async () => {
    try {
      await fetchCaseDetail(caseId, { fetchImpl: options.fetchImpl, signal: AbortSignal.timeout(30_000) })
      return true
    } catch (error) {
      if (error instanceof CaseDetailRequestError && error.code === "CASE_NOT_FOUND") return false
      throw error
    }
  }
  const finish = async () => {
    await client.cancelQueries({ predicate: owned })
    // Keep the deletion receipt to prevent a stale view from starting another mutation.
    client.removeQueries({ predicate: query => owned(query) && query.queryKey[1] !== "case-deletion" })
    // Invalidate all status/search pages before navigating back to the list.
    void client.invalidateQueries({ queryKey: keys.list() })
    return publish({ phase: "deleted" })
  }
  try {
    if (!await exists()) return finish()
    if (checking) return publish({ phase: "error", message: "stillPresent" })
    try {
      await deleteClinicalCase(caseId, { fetchImpl: options.fetchImpl, signal: AbortSignal.timeout(30_000) })
      return finish()
    } catch (error) {
      if (error instanceof CaseDeleteError && ["ACCESS_DENIED", "SESSION_UNAVAILABLE", "REQUEST_NOT_ALLOWED"].includes(error.code)) {
        return publish({ phase: "error", message: "accessDenied" })
      }
      if (error instanceof CaseDeleteError && error.code === "CASE_DELETE_NOT_ALLOWED") return publish({ phase: "error", message: "blocked" })
      const uncertain = !(error instanceof CaseDeleteError) || error.uncertain
      try {
        if (!await exists()) return finish()
        return publish({ phase: uncertain ? "uncertain" : "error", message: uncertain ? "unconfirmed" : "stillPresent" })
      } catch { return publish({ phase: "uncertain", message: "unavailable" }) }
    }
  } catch (error) {
    return publish({ phase: checking ? "uncertain" : "error", message: error instanceof CaseDetailRequestError && error.code === "ACCESS_DENIED" ? "accessDenied" : "unavailable" })
  }
}

export { IDLE_CASE_DELETION, isCaseDeletionLocked, requestCaseDeletion }
export type { CaseDeletionState }
