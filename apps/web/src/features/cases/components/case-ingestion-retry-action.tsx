"use client"

import { RotateCcw } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import type { CaseIngestionEntry } from "../lib/case-ingestion"
import { canRetryIngestion } from "../lib/ingestion-job-retry"

function CaseIngestionRetryAction({ entry, onRetry }: { entry?: CaseIngestionEntry; onRetry: () => void }) {
  const t = useTranslations("cases.ingestionRetry")
  if (!entry || !canRetryIngestion(entry)) return null
  const state = entry.retryState
  const busy = state?.phase === "checking" || state?.phase === "requesting"
  const checking = state?.phase === "error" || state?.phase === "uncertain"
  return <div className="mt-2 space-y-2">
    {state?.message ? <p className="text-caption text-description" role={state.phase === "idle" ? "status" : "alert"}>{t(`messages.${state.message}`)}</p> : null}
    <Button aria-busy={busy} disabled={busy} onClick={onRetry} size="sm" type="button" variant="secondary">
      <RotateCcw aria-hidden="true" className={busy ? "animate-spin motion-reduce:animate-none" : ""} />
      {t(busy ? state.phase === "checking" ? "checking" : "requesting" : checking ? "check" : "action")}
    </Button>
  </div>
}

export { CaseIngestionRetryAction }
