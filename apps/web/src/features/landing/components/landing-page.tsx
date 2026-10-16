import { LandingGrid } from "./landing-grid"

import { HeroSection } from "./hero/hero-section"
import { PlatformSection } from "./platform/platform-section"
import { ProductIntroSection } from "./product-intro/product-intro-section"

function LandingPage() {
  return (
    <div className="relative min-h-svh overflow-x-clip bg-[var(--color-paper-white)] pb-3 text-[var(--color-obsidian)] lg:pb-4">
      <LandingGrid />
      <main className="relative z-10">
        <HeroSection />
        <ProductIntroSection />
        <PlatformSection />
      </main>
    </div>
  )
}

export { LandingPage }
