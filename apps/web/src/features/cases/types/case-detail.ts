import type { GetCaseResponse } from "@vetorthoplan/api-client/clinical-contract"

type CaseDetailStatus = "DRAFT" | "IN_PLANNING" | "READY" | "ARCHIVED"

type CaseDetail = Readonly<{
  id: string
  title: string
  patient: Readonly<{
    name: string
    species: string
    breed: string | null
    sex: "FEMALE" | "MALE" | "UNKNOWN" | null
    birthDate: string | null
    approximateAgeMonths: number | null
    ageSource: GetCaseResponse["age_source"]
    ageReferenceDate: string | null
    weightKg: string | null
  }>
  clinicalNotes: string | null
  status: CaseDetailStatus
  createdAt: string
  updatedAt: string
}>

export type { CaseDetail, CaseDetailStatus }
