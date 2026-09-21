import { z } from "zod"

import { evaluatePasswordPolicy } from "@/lib/password-policy"

type PasswordValidationMessages = {
  lowercase: string
  max: string
  min: string
  noSpaces: string
  number: string
  special: string
  uppercase: string
}

function createPasswordSchema(messages: PasswordValidationMessages) {
  return z.string().superRefine((password, context) => {
    const status = evaluatePasswordPolicy(password)

    if (!status.hasMinimumLength) {
      context.addIssue({ code: "custom", message: messages.min })
    }

    if (!status.hasValidUtf8ByteLength) {
      context.addIssue({ code: "custom", message: messages.max })
    }

    if (!status.hasUppercase) {
      context.addIssue({ code: "custom", message: messages.uppercase })
    }

    if (!status.hasLowercase) {
      context.addIssue({ code: "custom", message: messages.lowercase })
    }

    if (!status.hasNumber) {
      context.addIssue({ code: "custom", message: messages.number })
    }

    if (!status.hasSpecialCharacter) {
      context.addIssue({ code: "custom", message: messages.special })
    }

    if (!status.hasNoWhitespace) {
      context.addIssue({ code: "custom", message: messages.noSpaces })
    }
  })
}

export { createPasswordSchema }
export type { PasswordValidationMessages }
