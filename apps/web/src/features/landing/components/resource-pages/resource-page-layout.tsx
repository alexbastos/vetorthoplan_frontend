import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"

import { ResourceHeader } from "./resource-header"
import { ResourceCallToAction } from "./resource-call-to-action"
import styles from "./resource-pages.module.css"
import { UniversalFooter } from "@/components/shared/universal-footer"
import { LandingSectionDivider } from "../landing-section-divider"

async function ResourcePageLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("resourcePages.shared")

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#resource-content">{t("skipToContent")}</a>
      <ResourceHeader />
      <main className={styles.main} id="resource-content" tabIndex={-1}>{children}</main>
      <ResourceCallToAction />
      <LandingSectionDivider dots={false} />
      <UniversalFooter variant="resource" />
    </div>
  )
}

export { ResourcePageLayout }
