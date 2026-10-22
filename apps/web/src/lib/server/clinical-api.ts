import "server-only"

import { ApiHttpClient } from "@vetorthoplan/api-client/http-client"
import type { paths as ClinicalPaths } from "@vetorthoplan/api-client/clinical"

import { getClinicalServerEnvironment } from "./environment"
import type { ClinicalAccessToken } from "./clinical-identity"

type ClinicalApiClientOptions = Readonly<{
  environment?: NodeJS.ProcessEnv
  fetch?: typeof fetch
  accessToken?: ClinicalAccessToken
  onAccessRejected?: (status: 401 | 403) => void
}>

function createClinicalApiClient(options: ClinicalApiClientOptions = {}): ApiHttpClient<ClinicalPaths> {
  const environment = getClinicalServerEnvironment(options.environment)
  if (environment.identityMode === "jwt" && !options.accessToken) throw new Error("Clinical organization token required")
  if (environment.identityMode === "local" && options.accessToken) throw new Error("Clinical token cannot be used in local identity mode")
  const fetchImpl = options.fetch ?? fetch

  return new ApiHttpClient<ClinicalPaths>({
    baseUrl: environment.clinicalApiBaseUrl,
    fetch: environment.identityMode === "local" ? options.fetch : async (input, init) => {
      const url = new URL(String(input))
      if (url.origin !== environment.clinicalApiBaseUrl || !url.pathname.startsWith("/api/v1/")) throw new Error("Invalid clinical token destination")
      const headers = new Headers(init?.headers)
      headers.set("authorization", `Bearer ${options.accessToken}`)
      const response = await fetchImpl(input, { ...init, headers, credentials: "omit", redirect: "manual" })
      if (response.status === 401 || response.status === 403) options.onAccessRejected?.(response.status)
      return response
    },
  })
}

export { createClinicalApiClient }
