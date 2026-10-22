import { HomeGreeting } from "./home-greeting"
import { HomePageMotion } from "./home-page-motion"
import { HomeNextCaseCard } from "./home-next-case-card"
import { HomeShortcutGrid } from "./home-shortcut-grid"
import { HomeSpotlightBanners } from "./home-spotlight-banners"

/** Página inicial da área autenticada; não depende de dados de domínio. */
function HomePage() {
  return (
    <HomePageMotion>
      <HomeGreeting />
      <HomeSpotlightBanners />
      <HomeShortcutGrid />
      <HomeNextCaseCard />
    </HomePageMotion>
  )
}

export { HomePage }
