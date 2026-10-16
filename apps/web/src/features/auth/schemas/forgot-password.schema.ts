import { z } from "zod"

function createForgotPasswordSchema(invalidEmail: string) {
  return z.object({ email: z.string().trim().email(invalidEmail) })
}

type ForgotPasswordValues = z.infer<ReturnType<typeof createForgotPasswordSchema>>

export { createForgotPasswordSchema }
export type { ForgotPasswordValues }
