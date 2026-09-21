import { homeShortcuts } from "../data/home-shortcuts"
import { useTranslations } from "next-intl"

import { HomeShortcutCard } from "./home-shortcut-card"

function HomeShortcutGrid() {
  const t = useTranslations("home.shortcuts")
  return (
    <section data-home-shortcuts aria-labelledby="home-shortcuts-title">
      <h2 data-home-shortcuts-title id="home-shortcuts-title" className="text-[20px] font-bold tracking-[-0.02em] text-capta-text-primary sm:text-[22px]">
        {t("title")}
      </h2>
      <div data-home-shortcuts-divider aria-hidden="true" className="mt-3.5 mb-5 h-px bg-capta-border-default" />
      <ul className="grid gap-[18px] md:grid-cols-3">
        {homeShortcuts.map((shortcut) => (
          <li key={shortcut.href}>
            <HomeShortcutCard shortcut={shortcut} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export { HomeShortcutGrid }
