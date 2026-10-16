import { z } from "zod"

function createLoginSchema(messages: { invalidEmail: string; passwordMin: string }) {
  return z.object({
    email: z.string().trim().email(messages.invalidEmail),
    password: z.string().min(8, messages.passwordMin),
  })
}

type LoginValues = z.infer<ReturnType<typeof createLoginSchema>>

export { createLoginSchema }
export type { LoginValues }
