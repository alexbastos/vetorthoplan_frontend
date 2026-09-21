import type { DeleteCurrentUserAvatarResponse } from "@vetorthoplan/api-client"
import { z } from "zod"

import type { AvatarUploadResult } from "../types/settings"

const AvatarUploadResponseSchema: z.ZodType<AvatarUploadResult> = z.object({
  avatarUrl: z.string().trim().url().refine(isHttpUrl),
})

const AvatarDeleteResponseSchema: z.ZodType<DeleteCurrentUserAvatarResponse> = z.object({
  message: z.string().trim().min(1),
})

function parseAvatarUploadResponse(value: unknown): AvatarUploadResult | undefined {
  const result = AvatarUploadResponseSchema.safeParse(value)
  return result.success ? result.data : undefined
}

function isAvatarDeleteResponse(value: unknown): value is DeleteCurrentUserAvatarResponse {
  return AvatarDeleteResponseSchema.safeParse(value).success
}

function isHttpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol
    return protocol === "http:" || protocol === "https:"
  } catch {
    return false
  }
}

export { isAvatarDeleteResponse, parseAvatarUploadResponse }
