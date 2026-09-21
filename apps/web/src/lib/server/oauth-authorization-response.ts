import "server-only"

import type { AuthenticationApiClient } from "@vetorthoplan/api-client"

import { getRequestedScopes } from "./oauth-authorization-request"
import type { OAuthTransaction } from "./oauth-transaction"

const MAX_LOCATION_LENGTH = 6_144
const MAX_OAUTH_RESPONSE_QUERY_LENGTH = 4_096
const MAX_AUTHORIZATION_CODE_LENGTH = 2_048
const MAX_ERROR_LENGTH = 128
const MAX_ERROR_DESCRIPTION_LENGTH = 512
const MAX_ERROR_URI_LENGTH = 1_024
const MAX_SCOPE_LENGTH = 512
const AUTHORIZATION_CODE_PATTERN = /^[\x21-\x7E]+$/
const ERROR_PATTERN = /^[A-Za-z0-9_]+$/
const ERROR_DESCRIPTION_PATTERN = /^[\x20-\x21\x23-\x5B\x5D-\x7E]*$/
const RESERVED_RESPONSE_PARAMETERS = [
  "code",
  "error",
  "error_description",
  "error_uri",
  "state",
] as const
const SUCCESS_RESPONSE_PARAMETERS = new Set(["code", "state"])
const ERROR_RESPONSE_PARAMETERS = new Set([
  "error",
  "error_description",
  "error_uri",
  "state",
])
const LOCAL_OAUTH_ERROR_CODES = new Set(["access_denied", "consent_required"])

type OAuthAuthorizeHttpResult = Awaited<ReturnType<AuthenticationApiClient["authorize"]>>

type OAuthAuthorizationResponseDecision =
  | { location: string; state: "redirect" }
  | { state: "consent-required" }
  | { state: "reauthenticate" }
  | { state: "upstream-unavailable" }
  | { reason: OAuthAuthorizationResponseFailure; state: "invalid" }

type OAuthAuthorizationResponseFailure =
  | "automatic_redirect_followed"
  | "invalid_consent_response"
  | "invalid_redirect_location"
  | "invalid_unauthorized_response"
  | "unexpected_status"

// Location nunca é seguido pelo BFF e deve corresponder à transação original.
function interpretOAuthAuthorizationResponse(
  upstreamResponse: OAuthAuthorizeHttpResult,
  transaction: OAuthTransaction
): OAuthAuthorizationResponseDecision {
  if (upstreamResponse.response.redirected) {
    return { reason: "automatic_redirect_followed", state: "invalid" }
  }

  if (upstreamResponse.status === 302) {
    const location = upstreamResponse.headers.get("location")

    return location && isValidAuthorizationRedirect(location, transaction)
      ? { location, state: "redirect" }
      : { reason: "invalid_redirect_location", state: "invalid" }
  }

  if (upstreamResponse.status === 401) {
    return isUnauthorizedResponse(upstreamResponse.data)
      ? { state: "reauthenticate" }
      : { reason: "invalid_unauthorized_response", state: "invalid" }
  }

  if (upstreamResponse.status === 403) {
    return isConsentRequiredResponse(upstreamResponse.data, transaction)
      ? { state: "consent-required" }
      : { reason: "invalid_consent_response", state: "invalid" }
  }

  if (upstreamResponse.status >= 500) {
    return { state: "upstream-unavailable" }
  }

  return { reason: "unexpected_status", state: "invalid" }
}

function isValidAuthorizationRedirect(location: string, transaction: OAuthTransaction): boolean {
  if (
    location.length > MAX_LOCATION_LENGTH ||
    /[\u0000-\u001F\u007F]/.test(location)
  ) {
    return false
  }

  const redirectUri = transaction.request.redirect_uri
  let registeredDestination: URL
  let receivedDestination: URL

  try {
    registeredDestination = new URL(redirectUri)
    receivedDestination = new URL(location)
  } catch {
    return false
  }

  if (
    receivedDestination.username !== "" ||
    receivedDestination.password !== "" ||
    receivedDestination.hash !== "" ||
    receivedDestination.protocol !== registeredDestination.protocol ||
    receivedDestination.origin !== registeredDestination.origin ||
    receivedDestination.pathname !== registeredDestination.pathname ||
    RESERVED_RESPONSE_PARAMETERS.some((parameter) =>
      registeredDestination.searchParams.has(parameter)
    )
  ) {
    return false
  }

  const expectedPrefix = getRedirectResponsePrefix(redirectUri)

  if (!location.startsWith(expectedPrefix)) {
    return false
  }

  const responseQuery = location.slice(expectedPrefix.length)

  if (
    responseQuery.length === 0 ||
    responseQuery.length > MAX_OAUTH_RESPONSE_QUERY_LENGTH ||
    responseQuery.includes("#")
  ) {
    return false
  }

  const responseParameters = new URLSearchParams(responseQuery)

  if (
    responseParameters.getAll("state").length !== 1 ||
    responseParameters.get("state") !== transaction.request.state ||
    receivedDestination.searchParams.getAll("state").length !== 1
  ) {
    return false
  }

  const codes = responseParameters.getAll("code")
  const errors = responseParameters.getAll("error")

  if (codes.length === 1 && errors.length === 0) {
    return (
      codes[0].length <= MAX_AUTHORIZATION_CODE_LENGTH &&
      AUTHORIZATION_CODE_PATTERN.test(codes[0]) &&
      hasOnlyAllowedParameters(responseParameters, SUCCESS_RESPONSE_PARAMETERS)
    )
  }

  if (errors.length === 1 && codes.length === 0) {
    return (
      errors[0].length <= MAX_ERROR_LENGTH &&
      ERROR_PATTERN.test(errors[0]) &&
      isValidErrorDescription(responseParameters) &&
      isValidErrorUri(responseParameters) &&
      hasOnlyAllowedParameters(responseParameters, ERROR_RESPONSE_PARAMETERS)
    )
  }

  return false
}

function getRedirectResponsePrefix(redirectUri: string): string {
  if (!redirectUri.includes("?")) {
    return `${redirectUri}?`
  }

  return redirectUri.endsWith("?") || redirectUri.endsWith("&")
    ? redirectUri
    : `${redirectUri}&`
}

function createOAuthAuthorizationErrorRedirect(
  transaction: OAuthTransaction,
  error: "access_denied" | "consent_required"
): string | undefined {
  if (!LOCAL_OAUTH_ERROR_CODES.has(error)) {
    return undefined
  }

  const responseParameters = new URLSearchParams({
    error,
    state: transaction.request.state,
  })
  const location = `${getRedirectResponsePrefix(transaction.request.redirect_uri)}${responseParameters.toString()}`

  return isValidAuthorizationRedirect(location, transaction) ? location : undefined
}

function hasOnlyAllowedParameters(
  parameters: URLSearchParams,
  allowedParameters: ReadonlySet<string>
): boolean {
  const names = [...parameters.keys()]

  return (
    names.every((name) => allowedParameters.has(name)) &&
    new Set(names).size === names.length
  )
}

function isValidErrorDescription(parameters: URLSearchParams): boolean {
  const descriptions = parameters.getAll("error_description")

  return (
    descriptions.length <= 1 &&
    (descriptions.length === 0 ||
      (descriptions[0].length <= MAX_ERROR_DESCRIPTION_LENGTH &&
        ERROR_DESCRIPTION_PATTERN.test(descriptions[0])))
  )
}

function isValidErrorUri(parameters: URLSearchParams): boolean {
  const errorUris = parameters.getAll("error_uri")

  if (errorUris.length === 0) {
    return true
  }

  if (errorUris.length !== 1 || errorUris[0].length > MAX_ERROR_URI_LENGTH) {
    return false
  }

  try {
    const errorUri = new URL(errorUris[0])

    return (
      errorUri.protocol === "https:" &&
      errorUri.username === "" &&
      errorUri.password === "" &&
      errorUri.hash === ""
    )
  } catch {
    return false
  }
}

function isUnauthorizedResponse(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["error"]) &&
    typeof value.error === "string" &&
    value.error.length > 0 &&
    value.error.length <= MAX_ERROR_LENGTH &&
    ERROR_PATTERN.test(value.error)
  )
}

function isConsentRequiredResponse(value: unknown, transaction: OAuthTransaction): boolean {
  const requestedScopes = new Set(getRequestedScopes(transaction.request))

  if (
    requestedScopes.size === 0 ||
    !isRecord(value) ||
    !hasOnlyKeys(
      value,
      value.scope === undefined
        ? ["client_id", "error"]
        : ["client_id", "error", "scope"]
    ) ||
    value.error !== "consent_required" ||
    value.client_id !== transaction.request.client_id
  ) {
    return false
  }

  if (value.scope === undefined) {
    return true
  }

  if (
    typeof value.scope !== "string" ||
    value.scope.length === 0 ||
    value.scope.length > MAX_SCOPE_LENGTH
  ) {
    return false
  }

  const consentScopes = value.scope.split(" ")

  return (
    consentScopes.every((scope) => requestedScopes.has(scope)) &&
    new Set(consentScopes).size === consentScopes.length
  )
}

function hasOnlyKeys(value: Record<string, unknown>, expectedKeys: readonly string[]): boolean {
  const keys = Object.keys(value)

  return keys.length === expectedKeys.length && keys.every((key) => expectedKeys.includes(key))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export { createOAuthAuthorizationErrorRedirect, interpretOAuthAuthorizationResponse }
export type {
  OAuthAuthorizationResponseDecision,
  OAuthAuthorizationResponseFailure,
}
