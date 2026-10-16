import { z } from "zod"

import { createPasswordSchema, type PasswordValidationMessages } from "./password.schema"

function createRegisterSchema(messages: PasswordValidationMessages & { fullName: string; invalidEmail: string }) {
  return z.object({
    email: z.string().trim().email(messages.invalidEmail),
    name: z.string().trim().min(2, messages.fullName).max(100),
    password: createPasswordSchema(messages),
  })
}

type RegisterValues = z.infer<ReturnType<typeof createRegisterSchema>>

export { createRegisterSchema }
export type { RegisterValues }
