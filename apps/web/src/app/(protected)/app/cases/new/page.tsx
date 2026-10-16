import type { Metadata } from "next"

import { CreateCasePage } from "@/features/clinical"

export const metadata: Metadata = { title: "Criar caso clínico" }

export default function NewClinicalCaseRoute() {
  return <CreateCasePage />
}
