import { ArchitecturalStackSection } from "./architectural-stack/architectural-stack-section"
import { ClosingCtaSection } from "./closing-cta/closing-cta-section"
import { FaqSection } from "./faq/faq-section"
import { LandingFooter } from "./footer/landing-footer"
import { HeroSection } from "./hero/hero-section"
import { LandingEntrance } from "./landing-entrance"
import { LandingHeader } from "./landing-header"
import { ProductIntelligenceIntroSection } from "./product-intelligence/product-intelligence-intro-section"
import { ProductIntelligenceSection } from "./product-intelligence/product-intelligence-section"
import { PublicNoticesSection } from "./public-notices/public-notices-section"

function LandingPage() {
  return (
    <div className="relative flex min-h-svh flex-1 flex-col overflow-x-clip bg-card">
      <LandingEntrance>
        <LandingHeader />
        <main className="mx-auto flex min-h-svh w-full max-w-[var(--layout-landing-max-width)] flex-1 flex-col">
          <HeroSection />
          <ProductIntelligenceIntroSection />
          <div className="bg-workspace">
            <ProductIntelligenceSection />
          </div>
          <PublicNoticesSection />
          <ArchitecturalStackSection />
          <FaqSection />
          <ClosingCtaSection />
        </main>
      </LandingEntrance>
      <LandingFooter />
    </div>
  )
}

export { LandingPage }
