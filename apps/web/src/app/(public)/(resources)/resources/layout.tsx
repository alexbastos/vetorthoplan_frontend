import type { Metadata } from "next"
import type { ReactNode } from "react"

import { ResourcePageLayout } from "@/features/landing/components/resource-pages/resource-page-layout"

// Keep presentation pages out of search until the content is approved.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function ResourcesLayout({ children }: { children: ReactNode }) {
  return <ResourcePageLayout>{children}</ResourcePageLayout>
}
