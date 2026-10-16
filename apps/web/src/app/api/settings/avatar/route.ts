import type { NextRequest } from "next/server"

import { MAX_AVATAR_SIZE_BYTES, validateAvatarFile } from "@/features/settings/lib/avatar-file-policy"
import { isAvatarDeleteResponse, parseAvatarUploadResponse } from "@/features/settings/schemas/avatar-response.schema"
import {
  createInvalidRequestResponse,
  createUnauthenticatedResponse,
  createUpstreamErrorResponse,
  logAuthenticationFailure,
} from "@/lib/server/auth-bff-route"
import {
  readBoundedRequestBody,
  RequestSecurityError,
} from "@/lib/server/request-security"
import { createSettingsResponse, withAuthenticatedSettingsRoute } from "@/lib/server/settings-bff-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAX_MULTIPART_SIZE_BYTES = MAX_AVATAR_SIZE_BYTES + 64 * 1024

export async function POST(request: NextRequest) {
  return withAuthenticatedSettingsRoute(request, {
    action: "upload-avatar",
    body: "multipart/form-data",
    method: "POST",
  }, async (context) => {
    const avatar = await readAvatar(request)

    if (!avatar) {
      return createInvalidRequestResponse()
    }

    const upstreamResponse = await context.client.uploadCurrentUserAvatar(avatar, {
      accessToken: context.session.accessToken,
    })

    const uploadResult = upstreamResponse.status === 200
      ? parseAvatarUploadResponse(upstreamResponse.data)
      : undefined

    if (!uploadResult) {
      return createUpstreamErrorResponse("upload-avatar", upstreamResponse)
    }

    return createSettingsResponse(uploadResult)
  })
}

export async function DELETE(request: NextRequest) {
  return withAuthenticatedSettingsRoute(request, {
    action: "delete-avatar",
    body: "none",
    method: "DELETE",
  }, async (context) => {
    const upstreamResponse = await context.client.deleteCurrentUserAvatar({
      accessToken: context.session.accessToken,
    })

    if (upstreamResponse.status === 404) {
      logAuthenticationFailure("delete-avatar", upstreamResponse)
      return createUnauthenticatedResponse()
    }

    if (upstreamResponse.status !== 200 || !isAvatarDeleteResponse(upstreamResponse.data)) {
      return createUpstreamErrorResponse("delete-avatar", upstreamResponse)
    }

    return createSettingsResponse({ avatarUrl: null })
  })
}

async function readAvatar(request: NextRequest): Promise<File | undefined> {
  const contentType = request.headers.get("content-type")

  if (!contentType) {
    return undefined
  }

  try {
    const body = await readBoundedRequestBody(request, MAX_MULTIPART_SIZE_BYTES)
    const formData = await new Response(body.buffer as ArrayBuffer, {
      headers: { "content-type": contentType },
    }).formData()
    const avatar = formData.get("avatar")

    if (!(avatar instanceof File)) {
      return undefined
    }

    const validation = await validateAvatarFile(avatar)
    return validation.ok ? avatar : undefined
  } catch (error) {
    if (error instanceof RequestSecurityError) {
      throw error
    }

    return undefined
  }
}
