import type { Metadata } from "next"
import type { ReactNode } from "react"

import { LegalPageLayout } from "@/features/legal/components/legal-page-layout"

// The document shells must not be indexed before the approved copy is supplied.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function LegalLayout({ children }: { children: ReactNode }) {
  return <LegalPageLayout>{children}</LegalPageLayout>
}
