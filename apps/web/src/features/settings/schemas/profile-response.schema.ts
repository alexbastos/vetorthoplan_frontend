import { z } from "zod"

import type { SettingsUser } from "../types/settings"

const NullableStringSchema = z.preprocess(normalizeNullableString, z.string().nullable())
const NullableDateSchema = z.preprocess(normalizeNullableString, z.string().date().nullable())
const NullableAvatarUrlSchema = z.preprocess(
  normalizeNullableString,
  z.string().url().refine(isHttpUrl).nullable(),
)
const NullableCountrySchema = z.preprocess(
  normalizeNullableString,
  z.string().length(2).transform((country) => country.toUpperCase()).nullable(),
)

const SettingsUserResponseSchema: z.ZodType<SettingsUser> = z.object({
  email: z.string().trim().email(),
  emailVerified: z.boolean(),
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  profile: z.object({
    address: z.object({
      city: NullableStringSchema,
      country: NullableCountrySchema,
      state: NullableStringSchema,
      street: NullableStringSchema,
      zipCode: NullableStringSchema,
    }),
    avatarUrl: NullableAvatarUrlSchema,
    bio: NullableStringSchema,
    birthDate: NullableDateSchema,
    locale: NullableStringSchema,
    phone: NullableStringSchema,
    timezone: NullableStringSchema,
  }),
  role: z.enum(["ADMIN", "USER"]),
})

function parseSettingsUserResponse(value: unknown): SettingsUser | undefined {
  const result = SettingsUserResponseSchema.safeParse(value)
  return result.success ? result.data : undefined
}

function normalizeNullableString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() || null : value
}

function isHttpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol
    return protocol === "http:" || protocol === "https:"
  } catch {
    return false
  }
}

export { parseSettingsUserResponse }
