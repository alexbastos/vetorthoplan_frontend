import type { ReactNode } from "react"
import { ClinicalContextGate } from "@/features/cases"

export default function ClinicalCasesLayout({ children }: { children: ReactNode }) {
  return <ClinicalContextGate>{children}</ClinicalContextGate>
}
