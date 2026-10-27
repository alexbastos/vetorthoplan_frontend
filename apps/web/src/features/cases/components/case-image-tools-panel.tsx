"use client"

import { useTranslations } from "next-intl"
import { useId } from "react"

function CaseImageToolsPanel() {
  const t = useTranslations("cases.workspace.tools")
  const id = useId()

  return <section aria-labelledby={id} className="flex min-w-0 flex-1 flex-col gap-3">
    <h3 className="font-data text-[11px] font-medium" id={id}>{t("measurements")}</h3>
    <p className="text-[12px] leading-5 text-content-secondary">{t("description")}</p>
  </section>
}

export { CaseImageToolsPanel }
