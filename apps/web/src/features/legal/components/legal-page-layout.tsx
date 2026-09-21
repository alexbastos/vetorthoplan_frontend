import type { ReactNode } from "react"

import { LegalHeader } from "./legal-header"
import styles from "./legal-page.module.css"

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
    </div>
  )
}

export { LegalPageLayout }
