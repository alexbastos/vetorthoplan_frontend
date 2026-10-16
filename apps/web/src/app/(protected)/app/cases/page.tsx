import type { Metadata } from "next"

import { CasesPage } from "@/features/clinical"

export const metadata: Metadata = { title: "Casos clínicos" }

export default function ClinicalCasesRoute() {
  return <CasesPage />
}
