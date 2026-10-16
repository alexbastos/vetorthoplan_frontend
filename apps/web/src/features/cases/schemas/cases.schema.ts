import { z } from "zod"

import type { CaseSummary, CreateCaseInput } from "../types/cases"

const PatientAgeSchema = z.discriminatedUnion("kind", [
  z.object({ birthDate: z.string().date(), kind: z.literal("birth-date") }),
  z.object({ kind: z.literal("approximate-years"), years: z.number().int().min(0).max(80) }),
]).nullable()

const CreateCaseInputSchema: z.ZodType<CreateCaseInput> = z.object({
  clinicalNotes: z.string().trim().max(1_000).nullable(),
  patient: z.object({
    age: PatientAgeSchema,
    breed: z.string().trim().min(1).max(120).nullable(),
    name: z.string().trim().min(1).max(120),
    sex: z.enum(["female", "male", "not-informed"]),
    species: z.string().trim().min(1).max(80),
    weightKg: z.number().positive().max(1_000).nullable(),
  }),
  title: z.string().trim().min(1).max(160),
})

const CaseSummarySchema: z.ZodType<CaseSummary> = z.object({
  clinicalNotes: z.string().trim().max(1_000).nullable().optional(),
  createdAt: z.string().datetime({ offset: true }),
  fileCount: z.number().int().nonnegative().optional(),
  id: z.string().trim().min(1).max(128),
  patient: z.object({
    age: PatientAgeSchema.optional(),
    breed: z.string().trim().min(1).max(120).nullable(),
    name: z.string().trim().min(1).max(120),
    sex: z.enum(["female", "male", "not-informed"]).optional(),
    species: z.string().trim().min(1).max(80),
    weightKg: z.number().positive().max(1_000).nullable().optional(),
  }),
  status: z.enum(["archived", "completed", "draft", "in-progress"]),
  thumbnailUrl: z.string().url().nullable().optional(),
  title: z.string().trim().min(1).max(160),
  updatedAt: z.string().datetime({ offset: true }),
})

const CasesListResponseSchema = z.object({ cases: z.array(CaseSummarySchema) })
const CaseResponseSchema = z.object({ case: CaseSummarySchema })

function parseCreateCaseInput(value: unknown): CreateCaseInput | undefined {
  const result = CreateCaseInputSchema.safeParse(value)
  return result.success ? result.data : undefined
}

function parseCaseResponse(value: unknown): CaseSummary | undefined {
  const result = CaseResponseSchema.safeParse(value)
  return result.success ? result.data.case : undefined
}

function parseCasesListResponse(value: unknown): readonly CaseSummary[] | undefined {
  const result = CasesListResponseSchema.safeParse(value)
  return result.success ? result.data.cases : undefined
}

export { CaseSummarySchema, parseCaseResponse, parseCasesListResponse, parseCreateCaseInput }
