import "server-only"

import { getApiErrorLogContext, normalizeAuthenticationError, type NormalizedAuthenticationError } from "@capta/api-client"
import { NextResponse } from "next/server"
import { z } from "zod"

import { appLocales, isValidTimeZone } from "@/i18n/config"
import type { AuthBffErrorCode } from "@/features/auth/types/auth"
import { satisfiesPasswordPolicy } from "@/lib/password-policy"

import { createAuthenticationApiClient } from "./authentication-api"
import { isBrazilianPhone, isBrazilianPostalCode } from "../brazilian-input"
import { getServerEnvironment } from "./environment"
import {
  assertTrustedMutationRequest,
  readBoundedRequestBody,
  RequestSecurityError,
  type MutationRequestBody,
} from "./request-security"

type AuthenticationAction =
  | "change-password"
  | "delete-avatar"
  | "forgot-password"
  | "link-social-account"
  | "login"
  | "login-history"
  | "logout"
  | "mfa-email-code"
  | "mfa-setup"
  | "mfa-verify"
  | "mfa-verify-setup"
  | "register"
  | "reset-password"
  | "resend-verification"
  | "revoke-session"
  | "session"
  | "social-login"
  | "unlink-social-account"
  | "update-profile"
  | "upload-avatar"
  | "verify-email"

type PublicAuthenticationError = {
  code: AuthBffErrorCode
  retryable: boolean
  status: 400 | 401 | 403 | 409 | 429 | 503
}

const NO_STORE_HEADERS = {
  "cache-control": "no-store",
  vary: "Origin, Sec-Fetch-Site",
  "x-content-type-options": "nosniff",
}

const MAX_JSON_BODY_BYTES = 32 * 1024

const NewPasswordRequestSchema = z.string().refine(satisfiesPasswordPolicy)

const RegisterRequestSchema = z
  .object({
    email: z.string().trim().email(),
    name: z.string().trim().min(2).max(100),
    password: NewPasswordRequestSchema,
  })
  .strict()

const LoginRequestSchema = z
  .object({
    email: z.string().trim().email(),
    password: z.string().min(8).max(1024),
  })
  .strict()

const MfaMethodSchema = z.enum(["TOTP", "EMAIL", "RECOVERY"])

const MfaVerifyRequestSchema = z
  .object({
    challengeToken: z.string().trim().min(1).max(16_384),
    code: z.string().trim().min(1).max(64),
    method: MfaMethodSchema,
  })
  .strict()
  .refine(
    ({ code, method }) => method === "RECOVERY" ? /^[A-Za-z0-9]{8}-[A-Za-z0-9]{8}$/.test(code) : /^\d{6}$/.test(code),
    { path: ["code"] },
  )

const MfaEmailCodeRequestSchema = z
  .object({ challengeToken: z.string().trim().min(1).max(16_384) })
  .strict()

const SocialLoginRequestSchema = z
  .object({
    provider: z.literal("GOOGLE"),
    token: z.string().trim().min(1).max(16_384),
  })
  .strict()

const VerifyEmailRequestSchema = z.object({ token: z.string().trim().min(1).max(4096) }).strict()

const ForgotPasswordRequestSchema = z.object({ email: z.string().trim().email() }).strict()

const ResendVerificationRequestSchema = z.object({ email: z.string().trim().email() }).strict()

const ResetPasswordRequestSchema = z
  .object({
    newPassword: NewPasswordRequestSchema,
    token: z.string().trim().min(1),
  })
  .strict()

const ChangePasswordRequestSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: NewPasswordRequestSchema,
  })
  .strict()
  .refine(({ currentPassword, newPassword }) => currentPassword !== newPassword, { path: ["newPassword"] })

const NullableBioSchema = z.string().trim().max(500).nullable()

const UpdateProfileRequestSchema = z
  .object({
    address: z
      .object({
        city: z.string().trim().max(100).nullable().optional(),
        country: z.string().trim().length(2).nullable().optional(),
        state: z.string().trim().max(50).nullable().optional(),
        street: z.string().trim().max(255).nullable().optional(),
        zipCode: z.string().trim().refine(isBrazilianPostalCode).nullable().optional(),
      })
      .strict()
      .optional(),
    bio: NullableBioSchema.optional(),
    birthDate: z.string().date().nullable().optional(),
    locale: z.enum(appLocales).nullable().optional(),
    name: z.string().trim().min(2).max(100).optional(),
    phone: z.string().trim().max(20).refine(isBrazilianPhone).nullable().optional(),
    timezone: z.string().trim().max(50).refine(isValidTimeZone).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0)

const LinkSocialAccountRequestSchema = z
  .object({
    provider: z.enum(["GOOGLE", "APPLE", "FACEBOOK", "GITHUB"]),
    token: z.string().trim().min(1).max(16_384),
  })
  .strict()

const RouteIdentifierSchema = z.string().trim().min(1).max(256)

async function getAuthenticationRouteClient(
  request: Request,
  body: MutationRequestBody = "application/json"
) {
  const environment = getServerEnvironment()
  await assertTrustedMutationRequest(request, environment.appOrigin, {
    body,
    method: "POST",
  })

  return createAuthenticationApiClient(environment)
}

async function parseJsonBody<Output>(request: Request, schema: z.ZodType<Output>): Promise<Output | undefined> {
  try {
    const bytes = await readBoundedRequestBody(request, MAX_JSON_BODY_BYTES)
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown
    const result = schema.safeParse(value)
    return result.success ? result.data : undefined
  } catch (error) {
    if (error instanceof RequestSecurityError) {
      throw error
    }

    return undefined
  }
}

function createSuccessResponse(status = 200): NextResponse {
  return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS, status })
}

function createNoStoreJsonResponse<Data>(data: Data, status = 200): NextResponse {
  return NextResponse.json(data, { headers: NO_STORE_HEADERS, status })
}

function createInvalidRequestResponse(): NextResponse {
  return createAuthenticationErrorResponse(undefined, { data: undefined, headers: new Headers(), status: 400 })
}

function createUnauthenticatedResponse(): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: "SESSION_UNAVAILABLE",
        retryable: false,
      },
    },
    { headers: NO_STORE_HEADERS, status: 401 }
  )
}

function createUpstreamErrorResponse(action: AuthenticationAction, upstreamResponse: unknown): NextResponse {
  logAuthenticationFailure(action, upstreamResponse)
  return createAuthenticationErrorResponse(action, upstreamResponse)
}

function createUnexpectedRouteErrorResponse(action: AuthenticationAction, error: unknown): NextResponse {
  if (error instanceof RequestSecurityError) {
    return NextResponse.json(
      { error: { code: "REQUEST_NOT_ALLOWED", retryable: false } },
      { headers: NO_STORE_HEADERS, status: error.status }
    )
  }

  logUnexpectedAuthenticationFailure(action, error)

  return createAuthenticationErrorResponse(action, error)
}

function createAuthenticationErrorResponse(action: AuthenticationAction | undefined, error: unknown): NextResponse {
  const normalized = normalizeAuthenticationError(error)
  const publicError = getPublicAuthenticationError(action, normalized)

  return NextResponse.json(
    {
      error: {
        code: publicError.code,
        retryable: publicError.retryable,
      },
    },
    { headers: NO_STORE_HEADERS, status: publicError.status }
  )
}

function getPublicAuthenticationError(
  action: AuthenticationAction | undefined,
  normalized: NormalizedAuthenticationError
): PublicAuthenticationError {
  if (action === "mfa-email-code" || action === "mfa-verify" || action === "mfa-verify-setup") {
    const mfaError = getPublicMfaError(normalized)

    if (mfaError) {
      return mfaError
    }
  }

  if (normalized.code === "RATE_LIMITED") {
    return {
      code: "RATE_LIMITED",
      retryable: normalized.retryable,
      status: 429,
    }
  }

  if (normalized.code === "SERVICE_UNAVAILABLE") {
    return {
      code: "SERVICE_UNAVAILABLE",
      retryable: normalized.retryable,
      status: 503,
    }
  }

  if (normalized.code === "NETWORK_ERROR") {
    return {
      code: "NETWORK_ERROR",
      retryable: normalized.retryable,
      status: 503,
    }
  }

  if (normalized.code === "UNAUTHORIZED" && action === "login") {
    return {
      code: "INVALID_CREDENTIALS",
      retryable: false,
      status: 401,
    }
  }

  if (normalized.code === "FORBIDDEN" && action === "login") {
    return {
      code: "ACCOUNT_REQUIRES_ACTION",
      retryable: false,
      status: 403,
    }
  }

  if (normalized.code === "CONFLICT" && action === "register") {
    return {
      code: "REGISTRATION_CONFLICT",
      retryable: false,
      status: 409,
    }
  }

  if (normalized.code === "BAD_REQUEST" && action === "reset-password") {
    return {
      code: "INVALID_RECOVERY_LINK",
      retryable: false,
      status: 400,
    }
  }

  if (normalized.code === "BAD_REQUEST" && action === "verify-email") {
    return {
      code: "INVALID_VERIFICATION_LINK",
      retryable: false,
      status: 400,
    }
  }

  if (normalized.code === "BAD_REQUEST" && action === "social-login") {
    return {
      code: "SOCIAL_AUTH_FAILED",
      retryable: false,
      status: 400,
    }
  }

  if (normalized.code === "BAD_REQUEST") {
    return {
      code: "VALIDATION_ERROR",
      retryable: false,
      status: 400,
    }
  }

  return {
    code: "AUTHENTICATION_REQUEST_FAILED",
    retryable: false,
    status: 503,
  }
}

function getPublicMfaError(normalized: NormalizedAuthenticationError): PublicAuthenticationError | undefined {
  if (normalized.reason === "MFA_CODE_INVALID") {
    return { code: "MFA_CODE_INVALID", retryable: true, status: 401 }
  }

  if (normalized.reason === "MFA_TOKEN_EXPIRED") {
    return { code: "MFA_CHALLENGE_EXPIRED", retryable: false, status: 401 }
  }

  if (["INVALID_TOKEN", "MFA_NOT_ENABLED", "MFA_SETUP_NOT_STARTED", "MFA_TOKEN_INVALID", "MISSING_TOKEN", "TOKEN_REVOKED", "USER_NOT_FOUND"].includes(normalized.reason ?? "")) {
    return { code: "MFA_CHALLENGE_INVALID", retryable: false, status: 401 }
  }

  if (normalized.reason === "MFA_METHOD_NOT_ALLOWED") {
    return { code: "MFA_METHOD_NOT_ALLOWED", retryable: false, status: 400 }
  }

  if (normalized.reason === "MFA_ATTEMPTS_EXCEEDED") {
    return { code: "MFA_ATTEMPTS_EXCEEDED", retryable: false, status: 429 }
  }

  if (normalized.reason === "USER_INACTIVE") {
    return { code: "ACCOUNT_REQUIRES_ACTION", retryable: false, status: 403 }
  }

  return undefined
}

function logAuthenticationFailure(action: AuthenticationAction, upstreamResponse: unknown): void {
  console.error("Authentication API request failed", {
    action,
    ...getApiErrorLogContext(upstreamResponse),
  })
}

function logUnexpectedAuthenticationFailure(action: AuthenticationAction, error: unknown): void {
  console.error("Authentication BFF request failed", {
    action,
    failureType: error instanceof Error ? error.name : "UnknownError",
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

export {
  ChangePasswordRequestSchema,
  createInvalidRequestResponse,
  createNoStoreJsonResponse,
  createSuccessResponse,
  createUnauthenticatedResponse,
  createUnexpectedRouteErrorResponse,
  createUpstreamErrorResponse,
  getAuthenticationRouteClient,
  LinkSocialAccountRequestSchema,
  LoginRequestSchema,
  logAuthenticationFailure,
  logUnexpectedAuthenticationFailure,
  parseJsonBody,
  MfaEmailCodeRequestSchema,
  MfaVerifyRequestSchema,
  RegisterRequestSchema,
  ResendVerificationRequestSchema,
  ResetPasswordRequestSchema,
  RouteIdentifierSchema,
  SocialLoginRequestSchema,
  UpdateProfileRequestSchema,
  VerifyEmailRequestSchema,
  ForgotPasswordRequestSchema,
}
