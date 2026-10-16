import { z } from "zod"

import { isBrazilianPostalCode } from "@/lib/brazilian-input"
import { parseJsonBody } from "@/lib/server/auth-bff-route"
import { createSettingsResponse, withAuthenticatedSettingsRoute } from "@/lib/server/settings-bff-route"
import { lookupBrazilianPostalCode } from "@/lib/server/viacep"
import type { NextRequest } from "next/server"

const PostalCodeRequestSchema = z.object({
  postalCode: z.string().refine(isBrazilianPostalCode),
}).strict()

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  return withAuthenticatedSettingsRoute(request, {
    action: "session",
    body: "application/json",
    method: "POST",
  }, async () => {
    const input = await parseJsonBody(request, PostalCodeRequestSchema)

    if (!input) {
      return createSettingsResponse({
        error: {
          code: "INVALID_POSTAL_CODE",
          retryable: false,
        },
      }, 400)
    }

    try {
      const result = await lookupBrazilianPostalCode(input.postalCode)

      if (result.kind === "not-found") {
        return createSettingsResponse({
          error: {
            code: "POSTAL_CODE_NOT_FOUND",
            retryable: false,
          },
        }, 404)
      }

      if (result.kind === "unavailable") {
        return createSettingsResponse({
          error: {
            code: "POSTAL_CODE_UNAVAILABLE",
            retryable: true,
          },
        }, 503)
      }

      return createSettingsResponse({ address: result.address })
    } catch {
      return createSettingsResponse({
        error: {
          code: "POSTAL_CODE_REQUEST_FAILED",
          retryable: true,
        },
      }, 503)
    }
  })
}
