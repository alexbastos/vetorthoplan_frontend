import { z } from "zod"

import { createPasswordSchema, type PasswordValidationMessages } from "@/features/auth/schemas/password.schema"

type ChangePasswordValidationMessages = PasswordValidationMessages & {
  differentFromCurrent: string
  mismatch: string
  required: string
}

function createChangePasswordSchema(messages: ChangePasswordValidationMessages) {
  return z.object({
    confirmPassword: z.string(),
    currentPassword: z.string().min(1, messages.required).max(4096),
    newPassword: createPasswordSchema(messages),
  })
    .refine(({ currentPassword, newPassword }) => currentPassword !== newPassword, {
      message: messages.differentFromCurrent,
      path: ["newPassword"],
    })
    .refine(({ confirmPassword, newPassword }) => newPassword === confirmPassword, {
    message: messages.mismatch,
    path: ["confirmPassword"],
  })
}

type ChangePasswordValues = z.infer<ReturnType<typeof createChangePasswordSchema>>

export { createChangePasswordSchema }
export type { ChangePasswordValidationMessages, ChangePasswordValues }
