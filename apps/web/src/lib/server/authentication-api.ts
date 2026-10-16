import "server-only"

import { ApiHttpClient, AuthenticationApiClient } from "@capta/api-client"

import { getServerEnvironment, type ServerEnvironment } from "./environment"

function createAuthenticationApiClient(environment: ServerEnvironment = getServerEnvironment()) {
  const httpClient = new ApiHttpClient({ baseUrl: environment.authenticationApiBaseUrl })

  return new AuthenticationApiClient(httpClient)
}

export { createAuthenticationApiClient }
