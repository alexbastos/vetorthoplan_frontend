import "server-only"

import { z } from "zod"

const SERVER_ENVIRONMENT_VARIABLES = [
  "AUTHENTICATION_API_BASE_URL",
  "APP_ORIGIN",
  "OAUTH_TRANSACTION_SECRET",
  "SESSION_COOKIE_PREVIOUS_SECRET",
  "SESSION_COOKIE_SECRET",
] as const

type ServerEnvironmentVariable = (typeof SERVER_ENVIRONMENT_VARIABLES)[number]

declare const oauthTransactionSecretBrand: unique symbol
type OAuthTransactionSecret = string & {
  readonly [oauthTransactionSecretBrand]: true
}

declare const sessionCookieSecretBrand: unique symbol
type SessionCookieSecret = string & {
  readonly [sessionCookieSecretBrand]: true
}

type SessionCookieSecrets = Readonly<{
  current: SessionCookieSecret
  previous?: SessionCookieSecret
}>

const CanonicalOriginSchema = z
  .string()
  .min(1)
  .refine((value) => value === value.trim(), "must not contain surrounding whitespace")
  .url()
  .transform((value) => new URL(value))
  .refine((url) => url.username === "" && url.password === "", "must not include credentials")
  .refine(
    (url) => url.pathname === "/" && url.search === "" && url.hash === "",
    "must be an origin without a path, query parameters, or fragments"
  )

const ServerEnvironmentSchema = z.object({
  AUTHENTICATION_API_BASE_URL: CanonicalOriginSchema
    .refine((url) => url.protocol === "https:", "must use HTTPS")
    .transform((url) => url.origin),
  APP_ORIGIN: CanonicalOriginSchema
    .refine(
      (url) => url.protocol === "https:" || (url.protocol === "http:" && isLoopbackHost(url.hostname)),
      "must use HTTPS, except for an HTTP loopback origin"
    )
    .transform((url) => url.origin),
})

const RuntimeSecretSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, "must be an unpadded 32-byte base64url value")
  .refine(
    (value) => Buffer.from(value, "base64url").length === 32,
    "must decode to exactly 32 bytes"
  )

const SessionServerEnvironmentSchema = ServerEnvironmentSchema.extend({
  SESSION_COOKIE_PREVIOUS_SECRET: z
    .union([RuntimeSecretSchema, z.literal("")])
    .optional()
    .transform((value) => (value ? (value as SessionCookieSecret) : undefined)),
  SESSION_COOKIE_SECRET: RuntimeSecretSchema.transform(
    (value) => value as SessionCookieSecret
  ),
})

const OAuthServerEnvironmentSchema = SessionServerEnvironmentSchema.extend({
  OAUTH_TRANSACTION_SECRET: RuntimeSecretSchema.transform(
    (value) => value as OAuthTransactionSecret
  ),
})

type ServerEnvironment = {
  authenticationApiBaseUrl: string
  appOrigin: string
}

type SessionServerEnvironment = ServerEnvironment & {
  sessionCookieSecrets: SessionCookieSecrets
}

type OAuthServerEnvironment = SessionServerEnvironment & {
  oauthTransactionSecret: OAuthTransactionSecret
}

class ServerEnvironmentConfigurationError extends Error {
  readonly variables: readonly ServerEnvironmentVariable[]

  constructor(variables: Iterable<ServerEnvironmentVariable>) {
    const uniqueVariables = [...new Set(variables)].sort()

    super(`Invalid server configuration: ${uniqueVariables.join(", ")}`)
    this.name = "ServerEnvironmentConfigurationError"
    this.variables = Object.freeze(uniqueVariables)
  }
}

function getServerEnvironment(environment: NodeJS.ProcessEnv = process.env): ServerEnvironment {
  const result = ServerEnvironmentSchema.safeParse(environment)

  if (!result.success) {
    throw createConfigurationError(result.error)
  }

  assertProductionAppOrigin(environment, result.data.APP_ORIGIN)

  return {
    authenticationApiBaseUrl: result.data.AUTHENTICATION_API_BASE_URL,
    appOrigin: result.data.APP_ORIGIN,
  }
}

function getSessionServerEnvironment(
  environment: NodeJS.ProcessEnv = process.env
): SessionServerEnvironment {
  const result = SessionServerEnvironmentSchema.safeParse(environment)

  if (!result.success) {
    throw createConfigurationError(result.error)
  }

  assertProductionAppOrigin(environment, result.data.APP_ORIGIN)
  assertDistinctSessionSecrets(
    result.data.SESSION_COOKIE_SECRET,
    result.data.SESSION_COOKIE_PREVIOUS_SECRET
  )
  return {
    authenticationApiBaseUrl: result.data.AUTHENTICATION_API_BASE_URL,
    appOrigin: result.data.APP_ORIGIN,
    sessionCookieSecrets: createSessionCookieSecrets(result.data),
  }
}

function getOAuthServerEnvironment(
  environment: NodeJS.ProcessEnv = process.env
): OAuthServerEnvironment {
  const result = OAuthServerEnvironmentSchema.safeParse(environment)

  if (!result.success) {
    throw createConfigurationError(result.error)
  }

  assertProductionAppOrigin(environment, result.data.APP_ORIGIN)
  assertDistinctSessionSecrets(
    result.data.SESSION_COOKIE_SECRET,
    result.data.SESSION_COOKIE_PREVIOUS_SECRET
  )
  assertPurposeSeparatedSecrets(
    result.data.OAUTH_TRANSACTION_SECRET,
    result.data.SESSION_COOKIE_SECRET,
    result.data.SESSION_COOKIE_PREVIOUS_SECRET
  )

  return {
    authenticationApiBaseUrl: result.data.AUTHENTICATION_API_BASE_URL,
    appOrigin: result.data.APP_ORIGIN,
    oauthTransactionSecret: result.data.OAUTH_TRANSACTION_SECRET,
    sessionCookieSecrets: createSessionCookieSecrets(result.data),
  }
}

function validateServerRuntimeEnvironment(environment: NodeJS.ProcessEnv = process.env): void {
  getOAuthServerEnvironment(environment)
}

function createSessionCookieSecrets(environment: {
  SESSION_COOKIE_PREVIOUS_SECRET?: SessionCookieSecret
  SESSION_COOKIE_SECRET: SessionCookieSecret
}): SessionCookieSecrets {
  return Object.freeze({
    current: environment.SESSION_COOKIE_SECRET,
    ...(environment.SESSION_COOKIE_PREVIOUS_SECRET
      ? { previous: environment.SESSION_COOKIE_PREVIOUS_SECRET }
      : {}),
  })
}

function assertDistinctSessionSecrets(
  current: SessionCookieSecret,
  previous: SessionCookieSecret | undefined
): void {
  if (previous === current) {
    throw new ServerEnvironmentConfigurationError(["SESSION_COOKIE_PREVIOUS_SECRET"])
  }
}

function assertPurposeSeparatedSecrets(
  oauthTransactionSecret: OAuthTransactionSecret,
  sessionCookieSecret: SessionCookieSecret,
  previousSessionCookieSecret: SessionCookieSecret | undefined
): void {
  if (oauthTransactionSecret === (sessionCookieSecret as string)) {
    throw new ServerEnvironmentConfigurationError([
      "OAUTH_TRANSACTION_SECRET",
      "SESSION_COOKIE_SECRET",
    ])
  }

  if (oauthTransactionSecret === (previousSessionCookieSecret as string | undefined)) {
    throw new ServerEnvironmentConfigurationError([
      "OAUTH_TRANSACTION_SECRET",
      "SESSION_COOKIE_PREVIOUS_SECRET",
    ])
  }
}

function assertProductionAppOrigin(environment: NodeJS.ProcessEnv, appOrigin: string): void {
  if (environment.NODE_ENV === "production" && !appOrigin.startsWith("https://")) {
    throw new ServerEnvironmentConfigurationError(["APP_ORIGIN"])
  }
}

function createConfigurationError(error: z.ZodError): ServerEnvironmentConfigurationError {
  const variables = error.issues.flatMap((issue) => {
    const variable = issue.path[0]

    return typeof variable === "string" && isServerEnvironmentVariable(variable)
      ? [variable]
      : []
  })

  return new ServerEnvironmentConfigurationError(
    variables.length > 0 ? variables : SERVER_ENVIRONMENT_VARIABLES
  )
}

function isServerEnvironmentVariable(value: string): value is ServerEnvironmentVariable {
  return SERVER_ENVIRONMENT_VARIABLES.some((variable) => variable === value)
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
}

export {
  getOAuthServerEnvironment,
  getSessionServerEnvironment,
  getServerEnvironment,
  validateServerRuntimeEnvironment,
}
export type {
  OAuthTransactionSecret,
  ServerEnvironment,
  SessionCookieSecrets,
}
