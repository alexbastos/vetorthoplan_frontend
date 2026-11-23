import type { ReactNode } from "react"

import { LegalHeader } from "./legal-header"
import styles from "./legal-page.module.css"
import { UniversalFooter } from "@/components/shared/universal-footer"
import { LandingSectionDivider } from "@/features/landing/components/landing-section-divider"

type LegalPageLayoutProps = {
  children: ReactNode
}

function LegalPageLayout({ children }: LegalPageLayoutProps) {
  return (
    <div className="flex min-h-svh flex-1 flex-col bg-card text-foreground" data-legal-layout>
      <LegalHeader />
      <main className={`${styles.frame} relative flex-1`}>
        {children}
      </main>
      <LandingSectionDivider className={styles.divider} />
      <UniversalFooter />
    </div>
  )
}

export { LegalPageLayout }
