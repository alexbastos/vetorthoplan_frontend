import type { paths } from "./generated/authentication-api"

// Supplemental contract supplied by the backend on 2026-10-21 and matched to
// its public OpenAPI on 2026-10-22. The canonical generated snapshot predates it.
export type OrganizationTokenResponse = {
  accessToken: string
  refreshToken: string
  organizationId: string
  expiresIn: number
}
export type OrganizationIdentityPaths = Pick<paths, "/authentication_api/api/v1/organizations"> & {
  "/authentication_api/api/v1/auth/organizations/{orgId}/token": {
    post: {
      parameters: { path: { orgId: string } }
      responses: { 200: { content: { "application/json": OrganizationTokenResponse } } }
    }
  }
}
