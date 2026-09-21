import { z } from "zod"

import { createPasswordSchema, type PasswordValidationMessages } from "./password.schema"

function createResetPasswordSchema(messages: PasswordValidationMessages & { mismatch: string }) {
  return z.object({
    confirmPassword: z.string(),
    password: createPasswordSchema(messages),
  }).refine(({ confirmPassword, password }) => password === confirmPassword, {
    message: messages.mismatch,
    path: ["confirmPassword"],
  })
}

type ResetPasswordValues = z.infer<ReturnType<typeof createResetPasswordSchema>>

export { createResetPasswordSchema }
export type { ResetPasswordValues }
