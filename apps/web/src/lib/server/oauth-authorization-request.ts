import "server-only"

import type { OAuthAuthorizeQuery } from "@vetorthoplan/api-client"

const AUTHORIZATION_PARAMETER_NAMES = [
  "response_type",
  "client_id",
  "redirect_uri",
  "scope",
  "state",
  "code_challenge",
  "code_challenge_method",
  "nonce",
  "prompt",
] as const

const AUTHORIZATION_PARAMETER_NAME_SET = new Set<string>(AUTHORIZATION_PARAMETER_NAMES)
const MAX_AUTHORIZATION_QUERY_LENGTH = 2_048
const MAX_CLIENT_ID_LENGTH = 128
const MAX_REDIRECT_URI_LENGTH = 1_024
const MAX_SCOPE_LENGTH = 512
const MAX_SCOPE_COUNT = 20
const MAX_SCOPE_TOKEN_LENGTH = 128
const MAX_NONCE_LENGTH = 512
const MAX_PROMPT_LENGTH = 64
const PKCE_S256_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/
const NON_QUOTE_ASCII_PATTERN = /^[\x21\x23-\x5B\x5D-\x7E]+$/
const STATE_PATTERN = /^(?:[\x21\x23-\x5B\x5D-\x7E]){16,512}$/
const VISIBLE_ASCII_PATTERN = /^[\x21-\x7E]+$/
const SUPPORTED_PROMPTS = new Set<OAuthPrompt>(["consent", "login", "none", "select_account"])

type OAuthAuthorizationParameterName = (typeof AUTHORIZATION_PARAMETER_NAMES)[number]
type OAuthAuthorizationErrorCode = "invalid_request" | "invalid_scope" | "unsupported_response_type"
type OAuthAuthorizationValidationReason =
  | "duplicate_parameter"
  | "invalid_parameter"
  | "missing_parameter"
  | "request_too_large"
  | "unknown_parameter"
  | "unsupported_value"

type OAuthPrompt = "consent" | "login" | "none" | "select_account"
type ValidatedOAuthAuthorizationRequest = Readonly<OAuthAuthorizeQuery>

class OAuthAuthorizationRequestError extends Error {
  readonly code: OAuthAuthorizationErrorCode
  readonly parameter: string | undefined
  readonly reason: OAuthAuthorizationValidationReason

  constructor(
    code: OAuthAuthorizationErrorCode,
    reason: OAuthAuthorizationValidationReason,
    parameter?: string
  ) {
    super("The OAuth authorization request is invalid")
    this.name = "OAuthAuthorizationRequestError"
    this.code = code
    this.parameter = parameter
    this.reason = reason
  }
}

// A API continua sendo a autoridade sobre client_id, redirect_uri e scopes.
function parseOAuthAuthorizationRequest(
  rawQuery: string
): ValidatedOAuthAuthorizationRequest {
  const normalizedQuery = rawQuery.startsWith("?") ? rawQuery.slice(1) : rawQuery

  if (normalizedQuery.length > MAX_AUTHORIZATION_QUERY_LENGTH) {
    throwValidationError("invalid_request", "request_too_large")
  }

  const searchParams = new URLSearchParams(normalizedQuery)
  const entries = [...searchParams.entries()]

  if (entries.length > AUTHORIZATION_PARAMETER_NAMES.length) {
    throwValidationError("invalid_request", "request_too_large")
  }

  const parameters = new Map<OAuthAuthorizationParameterName, string>()

  for (const [name, value] of entries) {
    if (!AUTHORIZATION_PARAMETER_NAME_SET.has(name)) {
      throwValidationError("invalid_request", "unknown_parameter", name)
    }

    const parameterName = name as OAuthAuthorizationParameterName

    if (parameters.has(parameterName)) {
      throwValidationError("invalid_request", "duplicate_parameter", parameterName)
    }

    parameters.set(parameterName, value)
  }

  const responseType = getRequiredParameter(parameters, "response_type")

  if (responseType !== "code") {
    throwValidationError("unsupported_response_type", "unsupported_value", "response_type")
  }

  const clientId = getRequiredParameter(parameters, "client_id")

  if (
    clientId.length > MAX_CLIENT_ID_LENGTH ||
    !VISIBLE_ASCII_PATTERN.test(clientId)
  ) {
    throwValidationError("invalid_request", "invalid_parameter", "client_id")
  }

  const redirectUri = getRequiredParameter(parameters, "redirect_uri")
  validateRedirectUri(redirectUri)

  const state = getRequiredParameter(parameters, "state")

  if (!STATE_PATTERN.test(state)) {
    throwValidationError("invalid_request", "invalid_parameter", "state")
  }

  const codeChallenge = getRequiredParameter(parameters, "code_challenge")

  if (!PKCE_S256_CHALLENGE_PATTERN.test(codeChallenge)) {
    throwValidationError("invalid_request", "invalid_parameter", "code_challenge")
  }

  const codeChallengeMethod = getRequiredParameter(parameters, "code_challenge_method")

  if (codeChallengeMethod !== "S256") {
    throwValidationError("invalid_request", "unsupported_value", "code_challenge_method")
  }

  const scope = getOptionalParameter(parameters, "scope")
  validateScope(scope)

  const nonce = getOptionalParameter(parameters, "nonce")
  validateNonce(nonce)

  const prompt = getOptionalParameter(parameters, "prompt")
  validatePrompt(prompt)

  return Object.freeze({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    ...(scope === undefined ? {} : { scope }),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    ...(nonce === undefined ? {} : { nonce }),
    ...(prompt === undefined ? {} : { prompt }),
  })
}

function serializeOAuthAuthorizationRequest(request: ValidatedOAuthAuthorizationRequest): string {
  const searchParams = new URLSearchParams()

  searchParams.set("response_type", request.response_type)
  searchParams.set("client_id", request.client_id)
  searchParams.set("redirect_uri", request.redirect_uri)

  if (request.scope !== undefined) {
    searchParams.set("scope", request.scope)
  }

  searchParams.set("state", request.state)
  searchParams.set("code_challenge", request.code_challenge)
  searchParams.set("code_challenge_method", request.code_challenge_method)

  if (request.nonce !== undefined) {
    searchParams.set("nonce", request.nonce)
  }

  if (request.prompt !== undefined) {
    searchParams.set("prompt", request.prompt)
  }

  return searchParams.toString()
}

function getRequestedScopes(request: ValidatedOAuthAuthorizationRequest): readonly string[] {
  return Object.freeze(request.scope?.split(" ") ?? [])
}

function getRequestedPrompts(request: ValidatedOAuthAuthorizationRequest): readonly OAuthPrompt[] {
  return Object.freeze((request.prompt?.split(" ") ?? []) as OAuthPrompt[])
}

function requiresOAuthAuthenticationPrompt(request: ValidatedOAuthAuthorizationRequest): boolean {
  const prompts = getRequestedPrompts(request)
  return prompts.includes("login") || prompts.includes("select_account")
}

function getOAuthAuthorizationRequestForUpstream(
  request: ValidatedOAuthAuthorizationRequest,
  authenticationPromptSatisfied: boolean
): ValidatedOAuthAuthorizationRequest {
  if (!authenticationPromptSatisfied || request.prompt === undefined) {
    return request
  }

  const remainingPrompts = getRequestedPrompts(request).filter(
    (prompt) => prompt !== "login" && prompt !== "select_account"
  )
  const { prompt: _prompt, ...requestWithoutPrompt } = request

  return Object.freeze({
    ...requestWithoutPrompt,
    ...(remainingPrompts.length === 0 ? {} : { prompt: remainingPrompts.join(" ") }),
  })
}

function getRequiredParameter(
  parameters: ReadonlyMap<OAuthAuthorizationParameterName, string>,
  name: OAuthAuthorizationParameterName
): string {
  const value = parameters.get(name)

  if (value === undefined || value.length === 0) {
    throwValidationError("invalid_request", "missing_parameter", name)
  }

  return value
}

function getOptionalParameter(
  parameters: ReadonlyMap<OAuthAuthorizationParameterName, string>,
  name: OAuthAuthorizationParameterName
): string | undefined {
  const value = parameters.get(name)

  if (value !== undefined && value.length === 0) {
    throwValidationError("invalid_request", "invalid_parameter", name)
  }

  return value
}

function validateRedirectUri(value: string): void {
  if (
    value.length > MAX_REDIRECT_URI_LENGTH ||
    value.includes("\\") ||
    value.includes("#") ||
    /[\u0000-\u001F\u007F]/.test(value)
  ) {
    throwValidationError("invalid_request", "invalid_parameter", "redirect_uri")
  }

  let redirectUri: URL

  try {
    redirectUri = new URL(value)
  } catch {
    throwValidationError("invalid_request", "invalid_parameter", "redirect_uri")
  }

  if (
    redirectUri.username !== "" ||
    redirectUri.password !== "" ||
    redirectUri.hash !== "" ||
    (redirectUri.protocol !== "https:" && !isHttpLoopbackUri(redirectUri))
  ) {
    throwValidationError("invalid_request", "invalid_parameter", "redirect_uri")
  }
}

function isHttpLoopbackUri(url: URL): boolean {
  if (url.protocol !== "http:") {
    return false
  }

  const hostname = url.hostname.toLowerCase()

  if (hostname === "localhost" || hostname === "[::1]") {
    return true
  }

  const octets = hostname.split(".")

  return (
    octets.length === 4 &&
    octets[0] === "127" &&
    octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255)
  )
}

function validateScope(value: string | undefined): void {
  if (value === undefined) {
    return
  }

  if (value.length > MAX_SCOPE_LENGTH) {
    throwValidationError("invalid_scope", "invalid_parameter", "scope")
  }

  const scopes = value.split(" ")

  if (
    scopes.length > MAX_SCOPE_COUNT ||
    scopes.some(
      (scope) =>
        scope.length === 0 ||
        scope.length > MAX_SCOPE_TOKEN_LENGTH ||
        !NON_QUOTE_ASCII_PATTERN.test(scope)
    ) ||
    new Set(scopes).size !== scopes.length
  ) {
    throwValidationError("invalid_scope", "invalid_parameter", "scope")
  }
}

function validateNonce(value: string | undefined): void {
  if (
    value !== undefined &&
    (value.length > MAX_NONCE_LENGTH || !NON_QUOTE_ASCII_PATTERN.test(value))
  ) {
    throwValidationError("invalid_request", "invalid_parameter", "nonce")
  }
}

function validatePrompt(value: string | undefined): void {
  if (value === undefined) {
    return
  }

  const prompts = value.split(" ")

  if (
    value.length > MAX_PROMPT_LENGTH ||
    prompts.some((prompt) => !SUPPORTED_PROMPTS.has(prompt as OAuthPrompt)) ||
    new Set(prompts).size !== prompts.length ||
    (prompts.includes("none") && prompts.length !== 1)
  ) {
    throwValidationError("invalid_request", "unsupported_value", "prompt")
  }
}

function throwValidationError(
  code: OAuthAuthorizationErrorCode,
  reason: OAuthAuthorizationValidationReason,
  parameter?: string
): never {
  throw new OAuthAuthorizationRequestError(code, reason, parameter)
}

export {
  getOAuthAuthorizationRequestForUpstream,
  getRequestedPrompts,
  getRequestedScopes,
  OAuthAuthorizationRequestError,
  parseOAuthAuthorizationRequest,
  requiresOAuthAuthenticationPrompt,
  serializeOAuthAuthorizationRequest,
}
export type {
  OAuthAuthorizationErrorCode,
  OAuthAuthorizationValidationReason,
  OAuthPrompt,
  ValidatedOAuthAuthorizationRequest,
}
