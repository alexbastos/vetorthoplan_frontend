import "server-only"

import type { AuthenticationApiClient } from "@vetorthoplan/api-client"

import {
  getRequestedPrompts,
  OAuthAuthorizationRequestError,
  parseOAuthAuthorizationRequest,
} from "./oauth-authorization-request"
import {
  clearOAuthTransactionCookie,
  markOAuthTransactionAuthenticationRequired,
  markOAuthTransactionAuthenticationSatisfied,
  readOAuthTransaction,
  setOAuthTransactionCookie,
  type OAuthTransaction,
} from "./oauth-transaction"
import type { OAuthTransactionSecret } from "./environment"
import { resolveServerSession, type AuthenticatedServerSession } from "./session"
import type { SessionCookieStore } from "./session-cookies"

const OAUTH_TRANSACTION_QUERY_PARAMETER = "transaction"
const MAX_OAUTH_ENTRY_QUERY_LENGTH = 2_048
const TRANSACTION_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/

type OAuthAuthorizationFlowOptions = {
  client: AuthenticationApiClient
  cookieReader: Pick<SessionCookieStore, "get">
  cookieWriter: Pick<SessionCookieStore, "set">
  rawQuery: string
  transactionSecret: OAuthTransactionSecret
}

type OAuthAuthorizationFlowResult =
  | {
      session: AuthenticatedServerSession
      state: "authenticated"
      transaction: OAuthTransaction
    }
  | {
      state: "login-required"
      transaction: OAuthTransaction
    }
  | {
      state: "non-interactive-login-required"
      transaction: OAuthTransaction
    }
  | {
      state: "unavailable"
      transaction: OAuthTransaction
    }

type OAuthAuthorizationContinuationFailure =
  | "expired"
  | "invalid"
  | "mismatched"
  | "missing"

class OAuthAuthorizationContinuationError extends Error {
  constructor(readonly reason: OAuthAuthorizationContinuationFailure) {
    super("The pending OAuth authorization transaction is not valid")
    this.name = "OAuthAuthorizationContinuationError"
  }
}

async function prepareOAuthAuthorizationFlow({
  client,
  cookieReader,
  cookieWriter,
  rawQuery,
  transactionSecret,
}: OAuthAuthorizationFlowOptions): Promise<OAuthAuthorizationFlowResult> {
  let transaction = resolveOAuthAuthorizationTransaction({
    cookieReader,
    cookieWriter,
    rawQuery,
    transactionSecret,
  })
  const session = await resolveServerSession({ client, cookieReader, cookieWriter })

  if (session.state === "authenticated") {
    if (transaction.phase === "authentication") {
      transaction = markOAuthTransactionAuthenticationSatisfied(
        cookieWriter,
        transaction,
        { secret: transactionSecret }
      )
    }

    return { session, state: "authenticated", transaction }
  }

  if (session.state === "anonymous") {
    if (getRequestedPrompts(transaction.request).includes("none")) {
      return { state: "non-interactive-login-required", transaction }
    }

    return {
      state: "login-required",
      transaction: markOAuthTransactionAuthenticationRequired(
        cookieWriter,
        transaction,
        { secret: transactionSecret }
      ),
    }
  }

  return { state: "unavailable", transaction }
}

function createOAuthAuthorizationResumePath(transactionId: string): string {
  return createOAuthTransactionPath("/oauth/authorize", transactionId)
}

function createOAuthConsentPath(transactionId: string): string {
  return createOAuthTransactionPath("/oauth/consent", transactionId)
}

function createOAuthTransactionPath(pathname: string, transactionId: string): string {
  if (!TRANSACTION_ID_PATTERN.test(transactionId)) {
    throw new OAuthAuthorizationContinuationError("invalid")
  }

  const searchParams = new URLSearchParams({
    [OAUTH_TRANSACTION_QUERY_PARAMETER]: transactionId,
  })

  return `${pathname}?${searchParams.toString()}`
}

type ResolveOAuthAuthorizationTransactionOptions = Pick<
  OAuthAuthorizationFlowOptions,
  "cookieReader" | "cookieWriter" | "rawQuery" | "transactionSecret"
>

function resolveOAuthAuthorizationTransaction({
  cookieReader,
  cookieWriter,
  rawQuery,
  transactionSecret,
}: ResolveOAuthAuthorizationTransactionOptions): OAuthTransaction {
  const normalizedQuery = rawQuery.startsWith("?") ? rawQuery.slice(1) : rawQuery

  if (normalizedQuery.length > MAX_OAUTH_ENTRY_QUERY_LENGTH) {
    throw new OAuthAuthorizationContinuationError("invalid")
  }

  const searchParams = new URLSearchParams(normalizedQuery)
  const transactionIds = searchParams.getAll(OAUTH_TRANSACTION_QUERY_PARAMETER)

  if (transactionIds.length === 0) {
    const request = parseOAuthAuthorizationRequest(normalizedQuery)

    return setOAuthTransactionCookie(cookieWriter, request, {
      secret: transactionSecret,
    })
  }

  if (transactionIds.length !== 1 || [...searchParams.keys()].length !== 1) {
    throw new OAuthAuthorizationContinuationError("invalid")
  }

  const result = readOAuthTransaction(cookieReader, {
    expectedTransactionId: transactionIds[0],
    secret: transactionSecret,
  })

  if (result.status === "valid") {
    return result.transaction
  }

  if (result.status === "expired" || result.status === "invalid") {
    clearOAuthTransactionCookie(cookieWriter)
  }

  throw new OAuthAuthorizationContinuationError(result.status)
}

export {
  createOAuthConsentPath,
  createOAuthAuthorizationResumePath,
  OAuthAuthorizationContinuationError,
  OAuthAuthorizationRequestError,
  prepareOAuthAuthorizationFlow,
}
export type {
  OAuthAuthorizationContinuationFailure,
  OAuthAuthorizationFlowOptions,
  OAuthAuthorizationFlowResult,
}
