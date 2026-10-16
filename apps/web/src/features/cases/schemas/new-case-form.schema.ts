import { z } from "zod"

type NewCaseValidationMessages = {
  ageYears: string
  birthDate: string
  birthDateOrAge: string
  breedMax: string
  clinicalNotesMax: string
  patientNameMax: string
  patientNameRequired: string
  sexRequired: string
  speciesMax: string
  speciesRequired: string
  titleMax: string
  titleRequired: string
  weight: string
}

function createNewCaseFormSchema(messages: NewCaseValidationMessages) {
  return z.object({
    ageYears: z.string(),
    birthDate: z.string(),
    breed: z.string().trim().max(120, messages.breedMax),
    clinicalNotes: z.string().trim().max(1_000, messages.clinicalNotesMax),
    patientName: z.string().trim().min(1, messages.patientNameRequired).max(120, messages.patientNameMax),
    sex: z.enum(["female", "male"]).optional(),
    species: z.string().trim().min(1, messages.speciesRequired).max(80, messages.speciesMax),
    title: z.string().trim().min(1, messages.titleRequired).max(160, messages.titleMax),
    weightKg: z.string(),
  }).superRefine((values, context) => {
    if (!values.sex) {
      context.addIssue({ code: "custom", message: messages.sexRequired, path: ["sex"] })
    }

    if (values.ageYears && values.birthDate) {
      context.addIssue({ code: "custom", message: messages.birthDateOrAge, path: ["birthDate"] })
    }

    if (values.ageYears) {
      const years = Number(values.ageYears)

      if (!/^\d+$/.test(values.ageYears) || !Number.isInteger(years) || years < 0 || years > 80) {
        context.addIssue({ code: "custom", message: messages.ageYears, path: ["ageYears"] })
      }
    }

    if (values.birthDate && !isValidPastDate(values.birthDate)) {
      context.addIssue({ code: "custom", message: messages.birthDate, path: ["birthDate"] })
    }

    if (values.weightKg) {
      const normalizedWeight = values.weightKg.replace(",", ".")
      const weight = Number(normalizedWeight)

      if (!/^\d+(?:[.,]\d{1,2})?$/.test(values.weightKg) || !Number.isFinite(weight) || weight <= 0 || weight > 1_000) {
        context.addIssue({ code: "custom", message: messages.weight, path: ["weightKg"] })
      }
    }
  })
}

function isValidPastDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) {
    return false
  }

  const [, year, month, day] = match
  const parsedDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  const isValidDate = parsedDate.getUTCFullYear() === Number(year)
    && parsedDate.getUTCMonth() === Number(month) - 1
    && parsedDate.getUTCDate() === Number(day)

  if (!isValidDate) {
    return false
  }

  const today = new Date()
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())

  return parsedDate.getTime() <= todayUtc
}

type NewCaseFormValues = z.infer<ReturnType<typeof createNewCaseFormSchema>>

export { createNewCaseFormSchema }
export type { NewCaseFormValues, NewCaseValidationMessages }
