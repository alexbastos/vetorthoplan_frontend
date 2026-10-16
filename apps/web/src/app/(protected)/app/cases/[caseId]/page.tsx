import type { Metadata } from "next"

import { CaseWorkspace } from "@/features/clinical"

export const metadata: Metadata = { title: "Planejamento TPLO" }

export default async function ClinicalCaseRoute({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params
  return <CaseWorkspace caseId={caseId} />
}
