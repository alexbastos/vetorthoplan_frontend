import { UniversalFooter } from "@/components/shared/universal-footer"

import { LandingGrid } from "./landing-grid"
import { CapabilitiesSection } from "./capabilities/capabilities-section"
import { ClinicalCaseStory } from "./clinical-case-story/clinical-case-story"

import { HeroSection } from "./hero-rebrand/hero-section"
import { LandingFaq } from "./faq/landing-faq"
import { PlatformSection } from "./platform/platform-section"
import { ProductIntroSection } from "./product-intro/product-intro-section"
import { RoutineBenefitsSection } from "./routine-benefits/routine-benefits-section"

function LandingPage() {
  return (
    <div className="relative min-h-svh overflow-x-clip bg-white pb-3 text-[var(--color-obsidian)] lg:pb-4">
      <LandingGrid />
      <main className="relative z-10">
        <HeroSection intro={<ProductIntroSection />} />
        <PlatformSection />
        <CapabilitiesSection />
        <RoutineBenefitsSection />
        <ClinicalCaseStory />
        <LandingFaq />
      </main>
      <UniversalFooter />
    </div>
  )
}

export { LandingPage }
