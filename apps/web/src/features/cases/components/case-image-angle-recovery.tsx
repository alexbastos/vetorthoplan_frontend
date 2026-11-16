"use client"

import { RefreshCw, X } from "lucide-react"
import { useTranslations } from "next-intl"

import type { AngleSaveRecovery } from "../hooks/use-angle-save-recovery"
import { VIEWER_TOOLBAR_CLASS_NAME } from "./viewer-toolbar"
import { useViewerBoundary, ViewerToolAction } from "./viewer-tool-action"

function CaseImageAngleRecovery({ recovery }: { recovery: AngleSaveRecovery }) {
  const t = useTranslations("cases.workspace.angle.recovery")
  const { boundary, ref } = useViewerBoundary()
  const { receipt, pending } = recovery
  const status = receipt.phase === "conflict" ? "conflict" : receipt.phase === "error" ? "error"
    : pending ? receipt.phase === "checking" ? "checking" : "saving" : "uncertain"

  return <section aria-label={t("region")} aria-busy={pending} className={`${VIEWER_TOOLBAR_CLASS_NAME} flex-col`} data-angle-recovery ref={ref}>
    <p className="sr-only" role="status">{t(status)}</p>
    {pending || ["uncertain", "saving", "checking"].includes(receipt.phase) ? <ViewerToolAction boundary={boundary} disabled={!recovery.canCheck}
      label={t(pending ? status : "check")} loading={pending} description={`${t(status)} ${t("checkTip")}`}
      onClick={() => void recovery.check()}>
      <RefreshCw aria-hidden="true" />
    </ViewerToolAction> : null}
    {receipt.phase === "conflict" || receipt.phase === "error" ? <ViewerToolAction boundary={boundary} disabled={!recovery.canDiscard}
      label={t("discard")} description={`${t(status)} ${t("discardTip")}`}
      tone="cancel" onClick={() => recovery.discard()}><X aria-hidden="true" /></ViewerToolAction> : null}
  </section>
}

export { CaseImageAngleRecovery }
