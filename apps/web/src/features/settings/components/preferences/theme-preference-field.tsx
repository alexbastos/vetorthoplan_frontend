"use client"

import { useTranslations } from "next-intl"

import { useAppTheme, type AppThemePreference } from "@/components/shared/app-shell"
import { cn } from "@/lib/utils"

const themeOptions: readonly AppThemePreference[] = ["light", "dark", "system"]
const themeLabels: Record<AppThemePreference, "themes.light" | "themes.dark" | "themes.system"> = {
  light: "themes.light",
  dark: "themes.dark",
  system: "themes.system",
}

function ThemePreferenceField() {
  const t = useTranslations("settings.preferences")
  const { preference, setPreference } = useAppTheme()

  return (
    <section aria-labelledby="theme-preference-title" className="border-b border-capta-border-default py-4">
      <div className="pb-2">
        <h3 className="text-ui font-semibold text-capta-text-primary" id="theme-preference-title">{t("theme")}</h3>
        <p className="mt-1 text-caption text-capta-text-secondary">{t("themeHint")}</p>
      </div>

      <div className="grid gap-5 border-t border-capta-border-default pt-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.7fr)] lg:gap-8">
        <div>
          <h4 className="text-ui font-semibold text-capta-text-primary">{t("displayMode")}</h4>
          <p className="mt-1 text-caption text-capta-text-secondary">{t("displayModeHint")}</p>
        </div>
        <div aria-label={t("displayMode")} className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="radiogroup">
          {themeOptions.map((option) => (
            <button
              aria-checked={preference === option}
              className="group cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-capta-border-focus"
              key={option}
              onClick={() => setPreference(option)}
              role="radio"
              type="button"
            >
              <ThemePreview selected={preference === option} theme={option} />
              <span className={cn("mt-2 block text-[0.625rem] leading-none font-medium uppercase", preference === option ? "text-capta-text-primary" : "text-capta-text-muted")}>{t(themeLabels[option])}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

function ThemePreview({ selected, theme }: { selected: boolean; theme: AppThemePreference }) {
  const isDark = theme === "dark"
  const isSystem = theme === "system"

  return (
    <span aria-hidden="true" className={cn("flex h-20 overflow-hidden rounded-[var(--radius-token-sm)] border bg-capta-surface-card transition-colors", selected ? "border-capta-brand-primary" : "border-capta-border-default group-hover:border-capta-text-muted")}>
      <ThemePreviewPanel dark={isDark} />
      {isSystem ? <ThemePreviewPanel dark /> : null}
    </span>
  )
}

function ThemePreviewPanel({ dark = false }: { dark?: boolean }) {
  return (
    <span className="grid min-w-0 flex-1 grid-cols-[0.9rem_minmax(0,1fr)] overflow-hidden">
      <span className={dark ? "bg-[var(--color-neutral-950)]" : "bg-[var(--color-neutral-0)]"} />
      <span className={cn("flex min-w-0 flex-col gap-1 p-1.5", dark ? "bg-[var(--color-neutral-900)]" : "bg-[var(--color-neutral-50)]")}>
        <span className={cn("h-1 w-5 rounded-full", dark ? "bg-[var(--color-neutral-400)]" : "bg-[var(--color-neutral-800)]")} />
        <span className={cn("mt-auto rounded-sm p-1", dark ? "bg-[#242424]" : "bg-[var(--color-neutral-0)]")}>
          <span className={cn("block h-1 w-full rounded-full", dark ? "bg-[var(--color-neutral-800)]" : "bg-[var(--color-neutral-200)]")} />
          <span className={cn("mt-1 block h-1 w-3/4 rounded-full", dark ? "bg-[var(--color-neutral-600)]" : "bg-[var(--color-neutral-300)]")} />
        </span>
      </span>
    </span>
  )
}

export { ThemePreferenceField }
