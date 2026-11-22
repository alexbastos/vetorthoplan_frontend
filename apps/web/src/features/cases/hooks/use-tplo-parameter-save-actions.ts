"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useEffect, useRef } from "react"

import { toast } from "@/lib/notifications"
import type { ImageTploState } from "./use-image-tplo"

function useTploParameterSaveActions(tplo: ImageTploState, identity: { caseId: string; imageId: string }, onSaved: () => void) {
  const client = useQueryClient(), t = useTranslations("cases.workspace.tplo")
  const scope = useRef({ client, ...identity, editorGeneration: tplo.contextGeneration })
  if (scope.current.client !== client || scope.current.caseId !== identity.caseId || scope.current.imageId !== identity.imageId)
    scope.current = { client, ...identity, editorGeneration: tplo.contextGeneration }
  const owner = scope.current, generation = tplo.contextGeneration
  owner.editorGeneration = generation
  const mounted = useRef(false), pending = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  async function save() {
    if (!mounted.current || scope.current !== owner || owner.editorGeneration !== generation || pending.current
      || tplo.editor?.kind !== "tplo-parameters-set" || !tplo.canSave) return
    pending.current = true
    try {
      const result = await tplo.submit()
      if (!mounted.current || scope.current !== owner || owner.editorGeneration !== generation || !result || result.code === "CLINICAL_CONTEXT_CHANGED") return
      if (result.phase === "saved") { onSaved(); toast.success(t("parameters.saved"), { description: t("parameters.global") }) }
      else if (result.code !== "OPERATION_BLOCKED") toast.error(t("parameters.saveError"), {
        description: t(result.phase === "conflict" ? "recovery.conflict" : result.phase === "uncertain" ? "recovery.uncertain"
          : result.code === "CLINICAL_VALIDATION_INVALID" || result.code === "PLAN_SAVE_NOT_ALLOWED" ? "parameters.reviewBlocked" : "parameters.saveErrorDescription"),
      })
    } catch { if (mounted.current && scope.current === owner && owner.editorGeneration === generation)
      toast.error(t("parameters.saveError"), { description: t("parameters.saveErrorDescription") }) }
    finally { pending.current = false }
  }
  return { save }
}

export { useTploParameterSaveActions }
