import { z } from "zod"

function createVerifyEmailSchema(invalidLink: string) {
  return z.object({ token: z.string().trim().min(1, invalidLink).max(4096) })
}

type VerifyEmailValues = z.infer<ReturnType<typeof createVerifyEmailSchema>>

export { createVerifyEmailSchema }
export type { VerifyEmailValues }
