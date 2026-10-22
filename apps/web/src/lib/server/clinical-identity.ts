import "server-only"

import { createHash } from "node:crypto"
import { ApiHttpClient } from "@vetorthoplan/api-client/http-client"
import type { OrganizationIdentityPaths } from "@vetorthoplan/api-client/organization-token-contract"
import { z } from "zod"
import type { ClinicalIdentityCookies } from "./clinical-identity-cookies"

const OrganizationIdSchema = z.string().min(1).max(255)
const OrganizationsSchema = z.array(z.object({ id: OrganizationIdSchema, name: z.string().min(1), memberRole: z.string(), isActive: z.boolean() }))
const TokenSchema = z.object({ accessToken: z.string().min(1).regex(/^[\x21-\x7E]+$/), refreshToken: z.string().min(1), organizationId: OrganizationIdSchema, expiresIn: z.number().int().positive().max(Number.MAX_SAFE_INTEGER) })
declare const clinicalTokenBrand: unique symbol
type ClinicalAccessToken = string & { readonly [clinicalTokenBrand]: true }
type Organization = { id: string; name: string; memberRole: string }
type IdentityResult = { state: "ready"; organization: Organization; organizations: Organization[]; accessToken: ClinicalAccessToken }
  | { state: "selection_required" | "no_organizations"; organizations: Organization[] }
type IdentityRequest = {
  ownerId: string; accessToken: string; authOrigin: string; cookies: ClinicalIdentityCookies
  chosenOrganizationId?: string; expectedOrganizationId?: string; requireExpectedOrganization?: boolean
  signal?: AbortSignal; fetchImpl?: typeof fetch
}
type TokenExchangeResult = Awaited<ReturnType<ApiHttpClient<OrganizationIdentityPaths>["request"]>>
// Only in-flight exchanges are shared, scoped to origins/organization/owner and
// a digest of this session's access token. No token remains in a process cache.
const exchanges = new Map<string, Promise<TokenExchangeResult>>()
class ClinicalIdentityError extends Error {
  readonly status: 400 | 401 | 403 | 404 | 409 | 429 | 502 | 503
  readonly code: string
  constructor(status: ClinicalIdentityError["status"], code: string) { super(code); this.name = "ClinicalIdentityError"; this.status = status; this.code = code }
}

async function resolveClinicalIdentity(options: IdentityRequest): Promise<IdentityResult> {
  const { ownerId, accessToken, cookies, signal } = options
  if (options.chosenOrganizationId !== undefined && !OrganizationIdSchema.safeParse(options.chosenOrganizationId).success) throw new ClinicalIdentityError(400, "VALIDATION_ERROR")
  const client = new ApiHttpClient<OrganizationIdentityPaths>({ baseUrl: options.authOrigin, fetch: options.fetchImpl })
  const headers = { authorization: `Bearer ${accessToken}` }
  try {
    const response = await client.request({ method: "get", path: "/authentication_api/api/v1/organizations", headers, signal })
    assertSuccess(response.status)
    const parsed = OrganizationsSchema.safeParse(response.data)
    if (!parsed.success || new Set(parsed.data.map(item => item.id)).size !== parsed.data.length) throw new ClinicalIdentityError(502, "INVALID_RESPONSE")
    const organizations = parsed.data.filter(item => item.isActive).map(({ id, name, memberRole }) => ({ id, name, memberRole }))
    const previous = cookies.selection(ownerId)
    const selected = options.chosenOrganizationId ?? previous ?? (organizations.length === 1 ? organizations[0].id : undefined)
    if (selected !== undefined && !organizations.some(item => item.id === selected)) {
      cookies.clear()
      if (options.chosenOrganizationId !== undefined) throw new ClinicalIdentityError(404, "CLINICAL_ORGANIZATION_UNAVAILABLE")
      return { state: organizations.length ? "selection_required" : "no_organizations", organizations }
    }
    if (!selected) { if (!organizations.length) cookies.clear(); return { state: organizations.length ? "selection_required" : "no_organizations", organizations } }
    if (options.requireExpectedOrganization && options.expectedOrganizationId !== selected) throw new ClinicalIdentityError(409, "CLINICAL_CONTEXT_CHANGED")
    const organization = organizations.find(item => item.id === selected)!
    const binding = createHash("sha256").update(JSON.stringify([accessToken, organization.memberRole])).digest("hex")
    let clinicalToken = cookies.access(ownerId, selected, binding)
    if (!clinicalToken) {
      const key = createHash("sha256").update(JSON.stringify([options.authOrigin, ownerId, selected, binding])).digest("hex")
      let exchange = exchanges.get(key)
      if (!exchange) {
        exchange = client.request({ method: "post", path: "/authentication_api/api/v1/auth/organizations/{orgId}/token", pathParams: { orgId: selected }, headers })
          .finally(() => exchanges.delete(key))
        exchanges.set(key, exchange)
      }
      const tokenResponse = await exchange
      if (signal?.aborted) throw new ClinicalIdentityError(503, "SERVICE_UNAVAILABLE")
      assertSuccess(tokenResponse.status)
      const token = TokenSchema.safeParse(tokenResponse.data)
      if (!token.success || token.data.organizationId !== selected || token.data.accessToken === accessToken) throw new ClinicalIdentityError(502, "INVALID_RESPONSE")
      clinicalToken = token.data.accessToken
      // The general login session remains intact. The organization refreshToken
      // is not persisted or used on the general refresh endpoint; re-exchange on expiry.
      cookies.setAccess(ownerId, selected, binding, clinicalToken, token.data.expiresIn)
    }
    if (previous !== selected) cookies.setSelection(ownerId, selected)
    return { state: "ready", organization, organizations, accessToken: clinicalToken as ClinicalAccessToken }
  } catch (error) {
    if (error instanceof ClinicalIdentityError) {
      if (error.status === 401 || error.status === 403 || error.status === 404) cookies.clearAccess()
      throw error
    }
    throw new ClinicalIdentityError(error instanceof SyntaxError ? 502 : 503, error instanceof SyntaxError ? "INVALID_RESPONSE" : "SERVICE_UNAVAILABLE")
  }
}
function assertSuccess(status: number) {
  if (status === 200) return
  if (status === 401) throw new ClinicalIdentityError(401, "SESSION_UNAVAILABLE")
  if (status === 403) throw new ClinicalIdentityError(403, "ACCESS_DENIED")
  if (status === 404) throw new ClinicalIdentityError(404, "CLINICAL_ORGANIZATION_UNAVAILABLE")
  if (status === 429) throw new ClinicalIdentityError(429, "RATE_LIMITED")
  if (status === 400) throw new ClinicalIdentityError(400, "VALIDATION_ERROR")
  throw new ClinicalIdentityError(status >= 500 ? 503 : 502, status >= 500 ? "SERVICE_UNAVAILABLE" : "INVALID_RESPONSE")
}
export { ClinicalIdentityError, OrganizationIdSchema, resolveClinicalIdentity }
export type { ClinicalAccessToken, Organization, IdentityResult }
