import { ChevronDown, Download } from "lucide-react"
import { useTranslations } from "next-intl"

import { HeaderActionsSlot } from "@/components/shared/app-shell"

/** Controles contextuais previstos para o Dashboard no Design System. */
function DashboardHeaderActions() {
  const t = useTranslations("dashboard")
  return (
    <HeaderActionsSlot>
      <span className="flex h-9 items-center gap-2 rounded-full bg-capta-surface-subtle px-3.5 text-ui text-capta-text-secondary">
        {t("period")}
        <ChevronDown aria-hidden="true" className="size-3.5" />
      </span>
      <span aria-label={t("export")} className="flex size-9 items-center justify-center rounded-[var(--radius-token-md)] text-capta-text-secondary">
        <Download aria-hidden="true" className="size-[1.125rem]" />
      </span>
    </HeaderActionsSlot>
  )
}

export { DashboardHeaderActions }
