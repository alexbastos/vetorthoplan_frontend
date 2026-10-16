import { ArrowUpRight, ChevronRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { getTranslations } from "next-intl/server"

import type { WorkflowWorkspaceCopy } from "./workflow-workspace-types"

import { MarketingProductMockup, type MarketingSidebarCopy } from "./marketing-product-mockup"
import styles from "./hero-section.module.css"

const navigationItems = ["platform", "workflow", "specialties"] as const

async function HeroSection() {
  const [header, hero, workflow, mockup] = await Promise.all([
    getTranslations("orthovetLanding.header"),
    getTranslations("orthovetLanding.hero"),
    getTranslations("orthovetLanding.workflow"),
    getTranslations("orthovetLanding.marketingMockup"),
  ])

  const workspace: WorkflowWorkspaceCopy = {
    addSurgeon: workflow("ui.addSurgeon"),
    calibration: workflow("ui.calibration"),
    caseId: workflow("ui.caseId"),
    caseLabel: workflow("ui.caseLabel"),
    imageLabel: workflow("ui.imageLabel"),
    imageSecondary: workflow("ui.imageSecondary"),
    imageTab: workflow("ui.imageTab"),
    imageTertiary: workflow("ui.imageTertiary"),
    images: workflow("ui.images"),
    information: workflow("ui.information"),
    label: workflow("workspace.label"),
    measurementAngle: workflow("ui.measurementAngle"),
    measurementAxis: workflow("ui.measurementAxis"),
    measurements: workflow("ui.measurements"),
    professional: workflow("ui.professional"),
    reference: workflow("ui.reference"),
    sharing: workflow("ui.sharing"),
    surgical: workflow("ui.surgical"),
    tools: workflow("ui.tools"),
    version: workflow("ui.version"),
  }
  const sidebarCopy: MarketingSidebarCopy = {
    navigationLabel: mockup("navigationLabel"),
    profileName: mockup("profileName"),
    clinicName: mockup("clinicName"),
    caseGroup: mockup("caseGroup"),
    planningGroup: mockup("planningGroup"),
    filesGroup: mockup("filesGroup"),
    outputGroup: mockup("outputGroup"),
    images: mockup("images"),
    calibration: mockup("calibration"),
    measurements: mockup("measurements"),
    simulation: mockup("simulation"),
    addFile: mockup("addFile"),
    lateralFile: mockup("lateralFile"),
    cranialFile: mockup("cranialFile"),
    examsFile: mockup("examsFile"),
    report: mockup("report"),
  }

  return (
    <section aria-labelledby="orthovet-hero-title" className={styles.hero}>
      <div className={styles.panel}>
        <header className={styles.navbar}>
          <Link aria-label={header("homeLabel")} className={styles.brand} href="/">
            <Image alt="" height={27} src="/brand/logo_vet_v2_black_spaced.svg" width={160} />
          </Link>

          <nav aria-label={header("navigationLabel")} className={styles.desktopNav}>
            {navigationItems.map((item) => (
              <Link href={`#${item}`} key={item}>{header(`navigation.${item}`)}</Link>
            ))}
          </nav>

          <div className={styles.actions}>
            <Link className={styles.login} href="/login">{header("login")}</Link>
            <Link className={styles.demo} href="/register">{header("demo")}</Link>
            <details className={styles.mobileMenu}>
              <summary aria-label={header("navigationLabel")}>
                <span />
                <span />
                <span />
              </summary>
              <nav aria-label={header("navigationLabel")}>
                {navigationItems.map((item) => (
                  <Link href={`#${item}`} key={item}>{header(`navigation.${item}`)}</Link>
                ))}
                <Link href="/login">{header("login")}</Link>
              </nav>
            </details>
          </div>
        </header>

        <div className={styles.copy}>
          <p className={styles.eyebrow}>
            {hero("eyebrow")}
            <ChevronRight aria-hidden="true" size={13} strokeWidth={1.5} />
          </p>
          <h1 id="orthovet-hero-title">
            <span>{hero("titleLine1")}</span>
            <span>{hero("titleLine2")}</span>
          </h1>
          <Link className={styles.primaryAction} href="#platform">
            {hero("primaryAction")}
            <ArrowUpRight aria-hidden="true" size={16} />
          </Link>
        </div>

        <div className={styles.productStage}>
          <div aria-hidden="true" className={styles.ambientShadow} />
          <div className={styles.productMockup}>
            <MarketingProductMockup activeStage="measurements" copy={workspace} showProductPanel={false} sidebarCopy={sidebarCopy} />
          </div>
        </div>
      </div>
    </section>
  )
}

export { HeroSection }
