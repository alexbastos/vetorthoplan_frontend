import { z } from "zod"

import { ageMonthsAtDate, parseDeclaredAge, utcDateOnly } from "../lib/case-age"
import { isValidCaseWeightInput } from "./case-weight.schema"

type NewCaseValidationMessages = {
  ageMonths: string
  ageYears: string
  ageLimit: string
  birthDate: string
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

function createNewCaseFormSchema(messages: NewCaseValidationMessages, referenceDate: () => string = utcDateOnly) {
  return z.object({
    ageYears: z.string(),
    ageMonths: z.string(),
    birthDate: z.string(),
    breed: z.string().trim().max(120, messages.breedMax),
    clinicalNotes: z.string().trim().max(4_000, messages.clinicalNotesMax),
    patientName: z.string().trim().min(1, messages.patientNameRequired).max(120, messages.patientNameMax),
    sex: z.enum(["female", "male"], { error: messages.sexRequired }),
    species: z.string().trim().min(1, messages.speciesRequired).max(80, messages.speciesMax),
    title: z.string().trim().min(1, messages.titleRequired).max(200, messages.titleMax),
    weightKg: z.string(),
  }).superRefine((values, context) => {
    if (values.birthDate) {
      if (ageMonthsAtDate(values.birthDate, referenceDate()) === null) {
        context.addIssue({ code: "custom", message: messages.birthDate, path: ["birthDate"] })
      }
    } else {
      const age = parseDeclaredAge(values.ageYears, values.ageMonths)
      if (age.kind === "invalid") context.addIssue({ code: "custom", path: [age.field],
        message: age.reason === "limit" ? messages.ageLimit : age.reason === "years" ? messages.ageYears : messages.ageMonths })
    }

    if (!isValidCaseWeightInput(values.weightKg)) {
      context.addIssue({ code: "custom", message: messages.weight, path: ["weightKg"] })
    }
  })
}

type NewCaseFormValues = z.infer<ReturnType<typeof createNewCaseFormSchema>>

export { createNewCaseFormSchema }
export type { NewCaseFormValues, NewCaseValidationMessages }
