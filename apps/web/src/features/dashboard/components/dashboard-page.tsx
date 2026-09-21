import { EmptyState, FadingDataTableIllustration } from "@/components/ui/empty-state"
import { useTranslations } from "next-intl"

import { DashboardHeaderActions } from "./dashboard-header-actions"

/**
 * Referência de composição para páginas autenticadas: a rota fornece o
 * conteúdo de palco e a feature ocupa o slot de ações do Header quando útil.
 */
function DashboardPage() {
  const t = useTranslations("dashboard")
  return (
    <>
      <DashboardHeaderActions />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8 sm:px-8 sm:py-10">
        <header className="max-w-2xl space-y-2">
          <p className="text-overline text-capta-text-secondary">{t("eyebrow")}</p>
          <h1 className="text-heading-3 text-capta-text-primary">{t("title")}</h1>
          <p className="text-ui text-capta-text-secondary">
            {t("description")}
          </p>
        </header>

        <div className="mt-8 flex min-h-72 flex-1 items-center justify-center py-12 sm:py-16">
          <EmptyState
            description={t("emptyDescription")}
            illustration={<FadingDataTableIllustration className="h-32 w-64" />}
            title={t("emptyTitle")}
          />
        </div>
      </div>
    </>
  )
}

export { DashboardPage }
