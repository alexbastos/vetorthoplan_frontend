import { ShieldCheck } from "lucide-react"
import { useTranslations } from "next-intl"

import { CommunitySafetyDialog } from "./community-safety-dialog"

function CommunitySafetyNotice() {
  const t = useTranslations("community.safetyNotice")

  return (
    <div className="mx-auto my-4 w-full max-w-[560px] shrink-0 rounded-2xl border border-[color:var(--community-divider)] px-5 py-4 text-center">
      <p className="mb-1 flex items-center justify-center gap-1.5 text-[10px] font-semibold tracking-widest text-foreground uppercase">
        <ShieldCheck aria-hidden="true" size={12} strokeWidth={1.5} />
        {t("title")}
      </p>
      <p className="text-[13px] leading-relaxed text-muted-foreground">{t("description")}</p>
      <CommunitySafetyDialog />
    </div>
  )
}

export { CommunitySafetyNotice }
