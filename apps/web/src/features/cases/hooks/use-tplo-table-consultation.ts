"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"

import { tploOfficialTpa } from "../lib/tplo-correction"
import { tploParameterFields, parseTploParameterFields } from "../lib/tplo-parameters"
import { tploClinicalProtocolQueryOptions, tploRotationTableQueryOptions } from "../lib/tplo-reference-query-options"
import type { TploRotationTable } from "../schemas/tplo-reference.schema"
import type { CaseImage } from "../types/case-image"
import { casesQueryKeys as keys } from "./cases-query-keys"
import type { ImageTploState } from "./use-image-tplo"

function useTploTableConsultation(image: CaseImage, tplo: ImageTploState, options: { active: boolean; fetchImpl?: typeof fetch }) {
  const client = useQueryClient(), plan = tplo.plan
  const unverified = tplo.planQuery.isError || ["saving", "checking", "uncertain", "conflict"].includes(tplo.receipt.phase)
  const tpa = tploOfficialTpa(plan, { readError: unverified, expectedImageId: image.id,
    dimensionsAvailable: tplo.issue !== "dimensions", anisotropic: tplo.issue === "anisotropy" })
  const editor = tplo.editor?.kind === "tplo-parameters-set" ? tplo.editor : null
  const fields = editor?.parameterFields ?? tploParameterFields(plan?.document.tplo, editor?.parameters)
  const parsed = parseTploParameterFields(fields)
  const blade = parsed.success ? parsed.data.blade_diameter_mm : null
  const filters = tpa !== null && typeof blade === "number" ? { tpa_degrees: tpa, blade_diameter_mm: blade } : null
  const queryOptions = tploRotationTableQueryOptions(filters ?? {}, { enabled: false, fetchImpl: options.fetchImpl })
  useQuery(queryOptions)
  const protocol = useQuery(tploClinicalProtocolQueryOptions({ enabled: false, fetchImpl: options.fetchImpl }))
  const tableQuery = client.getQueryCache().find({ queryKey: queryOptions.queryKey, exact: true })
  const protocolQuery = client.getQueryCache().find({ queryKey: keys.tploClinicalProtocol(), exact: true })
  const key = JSON.stringify([image.caseId, image.id, plan?.revision, fields, tpa, options.active, unverified,
    tplo.contextGeneration, tplo.canOpen, tplo.canEdit, tplo.needsRebase])
  const scope = useRef({ client, key, plan, draft: tplo.editor, tableQuery, protocolQuery })
  if (scope.current.client !== client || scope.current.key !== key || scope.current.plan !== plan || scope.current.draft !== tplo.editor
    || scope.current.tableQuery !== tableQuery || scope.current.protocolQuery !== protocolQuery)
    scope.current = { client, key, plan, draft: tplo.editor, tableQuery, protocolQuery }
  const owner = scope.current, mounted = useRef(false), pending = useRef<typeof owner | null>(null)
  const [result, setResult] = useState<{ owner: typeof owner; phase: "loading" | "done" | "error"; data?: TploRotationTable; error?: string } | null>(null)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const state = result?.owner === owner ? result : null
  const canConsult = options.active && (editor ? tplo.canEdit : tplo.canOpen) && !tplo.needsRebase && !unverified && filters !== null && state?.phase !== "loading"
  async function consult() {
    if (!mounted.current || scope.current !== owner || !canConsult || !filters || pending.current === owner || !tplo.canReadReferences()) return
    const planQuery = client.getQueryCache().find({ queryKey: keys.imagePlan(image.caseId, image.id), exact: true })
    const draft = client.getQueryData(keys.imageTploDraft(image.caseId, image.id))
    const current = () => mounted.current && scope.current === owner && tplo.canReadReferences()
      && client.getQueryCache().find({ queryKey: keys.imagePlan(image.caseId, image.id), exact: true }) === planQuery
      && client.getQueryCache().find({ queryKey: queryOptions.queryKey, exact: true }) === tableQuery
      && client.getQueryData(keys.imagePlan(image.caseId, image.id)) === plan
      && client.getQueryData(keys.imageTploDraft(image.caseId, image.id)) === draft
      && client.getQueryState(keys.imagePlan(image.caseId, image.id))?.status !== "error"
    if (!current()) return
    pending.current = owner
    setResult({ owner, phase: "loading" })
    try {
      const data = await client.fetchQuery({ ...queryOptions, staleTime: 0 })
      if (current()) setResult({ owner, phase: "done", data })
    } catch (error) {
      if (current()) setResult({ owner, phase: "error", error: error && typeof error === "object" && "code" in error ? String(error.code) : "SERVICE_UNAVAILABLE" })
    } finally { if (pending.current === owner) pending.current = null }
  }
  const canReadProtocol = options.active && tplo.canOpen && !tplo.needsRebase && !protocol.isFetching
  function refreshProtocol() {
    if (mounted.current && scope.current === owner && canReadProtocol && tplo.canReadReferences()
      && client.getQueryCache().find({ queryKey: keys.tploClinicalProtocol(), exact: true }) === protocolQuery) void protocol.refetch()
  }
  return { state, filters, tpa, blade: blade ?? null, target: parsed.success ? parsed.data.target_slope_degrees ?? null : null,
    canConsult, consult, parameterPreview: Boolean(editor && tplo.hasChanges),
    protocol, canReadProtocol, refreshProtocol }
}

export { useTploTableConsultation }
export type TploTableConsultation = ReturnType<typeof useTploTableConsultation>
