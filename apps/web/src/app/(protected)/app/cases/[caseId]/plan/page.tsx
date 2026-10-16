import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { CaseWorkspacePage } from "@/features/cases"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cases.workspace")
  return { title: t("metadataTitle") }
}

export default async function CasePlanRoute({ params }: PageProps<"/app/cases/[caseId]/plan">) {
  const { caseId } = await params
  return <CaseWorkspacePage caseId={caseId} />
}
