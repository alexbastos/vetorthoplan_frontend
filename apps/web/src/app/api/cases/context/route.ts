import type { NextRequest } from "next/server"
import { z } from "zod"

import { clinicalCookiesForRequest, createCasesResponse, withAuthenticatedCasesSession } from "@/lib/server/cases-bff-route"
import { getClinicalServerEnvironment, getServerEnvironment } from "@/lib/server/environment"
import { ClinicalIdentityError, OrganizationIdSchema, resolveClinicalIdentity } from "@/lib/server/clinical-identity"
import { readBoundedRequestBody } from "@/lib/server/request-security"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// POST because resolving context may exchange a token and write HttpOnly cookies.
export async function POST(request: NextRequest) {
  return withAuthenticatedCasesSession(request, async (session, writer) => {
    if (getClinicalServerEnvironment().identityMode === "local") return createCasesResponse({ state: "ready", mode: "local", organization: null, organizations: [] })
    const result = await resolveClinicalIdentity({ ownerId: session.user.id, accessToken: session.accessToken,
      authOrigin: getServerEnvironment().authenticationApiBaseUrl, cookies: clinicalCookiesForRequest(request, writer), signal: request.signal })
    return result.state === "ready" ? createCasesResponse({ state: "ready", mode: "jwt", organization: result.organization, organizations: result.organizations })
      : createCasesResponse({ ...result, mode: "jwt" })
  }, { body: "none", method: "POST" })
}

export async function PUT(request: NextRequest) {
  return withAuthenticatedCasesSession(request, async (session, writer) => {
    if (getClinicalServerEnvironment().identityMode !== "jwt") throw new ClinicalIdentityError(400, "VALIDATION_ERROR")
    let body: unknown
    try { body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await readBoundedRequestBody(request, 4096))) }
    catch (error) { if (error instanceof SyntaxError || error instanceof TypeError) throw new ClinicalIdentityError(400, "VALIDATION_ERROR"); throw error }
    const parsed = z.object({ organizationId: OrganizationIdSchema }).strict().safeParse(body)
    if (!parsed.success) throw new ClinicalIdentityError(400, "VALIDATION_ERROR")
    const result = await resolveClinicalIdentity({ ownerId: session.user.id, accessToken: session.accessToken,
      authOrigin: getServerEnvironment().authenticationApiBaseUrl, cookies: clinicalCookiesForRequest(request, writer),
      chosenOrganizationId: parsed.data.organizationId, signal: request.signal })
    if (result.state !== "ready") throw new ClinicalIdentityError(403, "CLINICAL_ORGANIZATION_REQUIRED")
    return createCasesResponse({ state: "ready", mode: "jwt", organization: result.organization, organizations: result.organizations })
  }, { body: "application/json", method: "PUT" })
}
