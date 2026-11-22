"use client"

import { RefreshCw, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useId } from "react"

import type { TploSaveRecovery } from "../hooks/use-tplo-save-recovery"
import { ViewerMeasurementAction } from "./viewer-measurement-card"
import { useViewerBoundary } from "./viewer-tool-action"

function CaseImageTploRecovery({ recovery, onCheck, onDiscard }: { recovery: TploSaveRecovery; onCheck?: () => void; onDiscard?: () => void }) {
  const t = useTranslations("cases.workspace.tplo.recovery")
  const { boundary, ref } = useViewerBoundary()
  const id = useId()
  const { receipt, pending } = recovery
  const status = receipt.phase === "conflict" ? "conflict" : receipt.phase === "error" ? "error"
    : pending ? receipt.phase === "checking" ? "checking" : "saving" : "uncertain"

  return <section aria-labelledby={id} aria-busy={pending} data-tplo-recovery ref={ref}
    className="max-h-full w-56 max-w-full overflow-y-auto rounded-[var(--radius-token-md)] border border-white/10 bg-[var(--color-obsidian)] text-white shadow-sm">
    <h3 className="border-b border-white/10 px-3 py-2 text-xs font-medium" id={id}>{t("region")}</h3>
    <div className="space-y-2 p-3">
      <p role="status" className="text-[11px] leading-relaxed text-white/70">{t(status)}</p>
      {pending || ["uncertain", "saving", "checking"].includes(receipt.phase) ? <ViewerMeasurementAction boundary={boundary}
        label={t("check")} description={t("checkTip")} disabled={!recovery.canCheck} loading={pending}
        icon={<RefreshCw aria-hidden="true" />} onClick={onCheck ?? (() => void recovery.check())} /> : null}
      {receipt.phase === "conflict" || receipt.phase === "error" ? <ViewerMeasurementAction boundary={boundary}
        label={t("discard")} description={t("discardTip")} disabled={!recovery.canDiscard} className="text-[var(--color-coral-500)]"
        icon={<X aria-hidden="true" />} onClick={onDiscard ?? (() => recovery.discard())} /> : null}
    </div>
  </section>
}

export { CaseImageTploRecovery }
