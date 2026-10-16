import { HomeGreeting } from "./home-greeting"
import { HomeHeroBanner } from "./home-hero-banner"
import { HomePageMotion } from "./home-page-motion"
import { HomeShortcutGrid } from "./home-shortcut-grid"

/** Página inicial da área autenticada; não depende de dados de domínio. */
function HomePage() {
  return (
    <HomePageMotion>
      <HomeGreeting />
      <HomeHeroBanner />
      <HomeShortcutGrid />
    </HomePageMotion>
  )
}

export { HomePage }
