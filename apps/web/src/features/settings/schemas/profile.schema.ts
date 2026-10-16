import type { UpdateCurrentUserInput } from "@capta/api-client"
import { z } from "zod"

import { appLocales, isValidTimeZone } from "@/i18n/config"
import { isBrazilianPhone, isBrazilianPostalCode } from "@/lib/brazilian-input"

import type { ProfileUpdateRequest } from "../types/settings"

type ProfileValidationMessages = {
  bioMax: string
  fullName: string
  invalidDate: string
  invalidEmail: string
  invalidPhone: string
  invalidPostalCode: string
  invalidTimeZone: string
  invalidUrl: string
}

function createProfileSchema(messages: ProfileValidationMessages) {
  return z.object({
    avatarUrl: z.union([z.literal(""), z.string().trim().url(messages.invalidUrl)]),
    bio: z.string().trim().max(500, messages.bioMax),
    birthDate: z.union([z.literal(""), z.string().date(messages.invalidDate)]),
    city: z.string().trim().max(100),
    country: z.string().trim().refine((value) => value.length === 0 || value.length === 2),
    email: z.string().trim().email(messages.invalidEmail),
    locale: z.enum(appLocales),
    name: z.string().trim().min(2, messages.fullName).max(100),
    phone: z.string().trim().refine(isBrazilianPhone, messages.invalidPhone),
    state: z.string().trim().max(50),
    street: z.string().trim().max(255),
    timezone: z.string().trim().max(50).refine(
      (value) => value.length === 0 || isValidTimeZone(value),
      messages.invalidTimeZone,
    ),
    zipCode: z.string().trim().refine(isBrazilianPostalCode, messages.invalidPostalCode),
  })
}

type ProfileValues = z.infer<ReturnType<typeof createProfileSchema>>

function createProfileUpdateRequest(values: ProfileValues): ProfileUpdateRequest {
  const request = {
    address: {
      city: toNullableProfileValue(values.city),
      country: toNullableProfileValue(values.country),
      state: toNullableProfileValue(values.state),
      street: toNullableProfileValue(values.street),
      zipCode: toNullableProfileValue(values.zipCode),
    },
    bio: toNullableProfileValue(values.bio),
    birthDate: toNullableProfileValue(values.birthDate),
    locale: toNullableProfileValue(values.locale),
    name: values.name.trim(),
    phone: toNullableProfileValue(values.phone),
    timezone: toNullableProfileValue(values.timezone),
  } satisfies UpdateCurrentUserInput

  return request
}

function toNullableProfileValue(value: string): string | null {
  return value.trim() || null
}

export { createProfileSchema, createProfileUpdateRequest }
export type { ProfileValues }
