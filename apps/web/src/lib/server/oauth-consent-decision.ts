import "server-only"

import type { AuthenticationApiClient } from "@capta/api-client"

import {
  createOAuthAuthorizationErrorRedirect,
  interpretOAuthAuthorizationResponse,
} from "./oauth-authorization-response"
import {
  getOAuthAuthorizationRequestForUpstream,
  getRequestedScopes,
} from "./oauth-authorization-request"
import {
  isOAuthTransactionBoundToSubject,
  type OAuthTransaction,
} from "./oauth-transaction"

const MAX_CONSENT_FORM_LENGTH = 256
const TRANSACTION_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/
const MAX_CONSENT_MESSAGE_LENGTH = 512
const MAX_IDEMPOTENT_OPERATIONS = 1_000

type OAuthConsentDecision = "allow" | "deny"

type OAuthConsentDecisionOutcome =
  | { location: string; state: "redirect"; terminal: true }
  | { consentRecorded: boolean; state: "reauthenticate"; terminal: false }
  | { consentRecorded: boolean; state: "unavailable"; terminal: false }
  | { reason: OAuthConsentDecisionFailure; state: "terminal-error"; terminal: true }

type OAuthConsentDecisionFailure =
  | "consent_rejected"
  | "invalid_access_denied_redirect"
  | "invalid_consent_response"
  | "invalid_consent_scopes"
  | "invalid_transaction_phase"
  | "repeated_consent_required"
  | "subject_mismatch"
  | "unexpected_consent_status"
  | "upstream_authorization_invalid"

type ProcessOAuthConsentDecisionOptions = {
  transaction: OAuthTransaction
} & (
  | { decision: "deny" }
  | {
      accessToken: string
      client: AuthenticationApiClient
      decision: "allow"
      subjectId: string
    }
)

type ConsentOperation = {
  expiresAtEpochSeconds: number
  promise: Promise<OAuthConsentDecisionOutcome>
}

const consentOperations = new Map<string, ConsentOperation>()

class OAuthConsentDecisionRequestError extends Error {
  constructor() {
    super("The OAuth consent decision request is invalid")
    this.name = "OAuthConsentDecisionRequestError"
  }
}

function parseOAuthConsentDecisionRequest(rawBody: string): {
  decision: OAuthConsentDecision
  transactionId: string
} {
  if (rawBody.length === 0 || rawBody.length > MAX_CONSENT_FORM_LENGTH) {
    throw new OAuthConsentDecisionRequestError()
  }

  const parameters = new URLSearchParams(rawBody)
  const parameterNames = [...parameters.keys()]
  const decisions = parameters.getAll("decision")
  const transactionIds = parameters.getAll("transaction")

  if (
    parameterNames.length !== 2 ||
    new Set(parameterNames).size !== 2 ||
    !parameterNames.every((name) => name === "decision" || name === "transaction") ||
    decisions.length !== 1 ||
    transactionIds.length !== 1 ||
    (decisions[0] !== "allow" && decisions[0] !== "deny") ||
    !TRANSACTION_ID_PATTERN.test(transactionIds[0])
  ) {
    throw new OAuthConsentDecisionRequestError()
  }

  return { decision: decisions[0], transactionId: transactionIds[0] }
}

function processOAuthConsentDecision(
  options: ProcessOAuthConsentDecisionOptions
): Promise<OAuthConsentDecisionOutcome> {
  pruneExpiredOperations()

  const existingOperation = consentOperations.get(options.transaction.id)

  if (existingOperation) {
    return existingOperation.promise
  }

  if (consentOperations.size >= MAX_IDEMPOTENT_OPERATIONS) {
    const oldestTransactionId = consentOperations.keys().next().value as string | undefined

    if (oldestTransactionId) {
      consentOperations.delete(oldestTransactionId)
    }
  }

  const promise = performOAuthConsentDecision(options)
  const operation: ConsentOperation = {
    expiresAtEpochSeconds: options.transaction.expiresAtEpochSeconds,
    promise,
  }
  consentOperations.set(options.transaction.id, operation)

  void promise.then(
    (outcome) => {
      if (!outcome.terminal) {
        deleteConsentOperation(options.transaction.id, operation)
        return
      }

      const delayMilliseconds = Math.max(
        1,
        (options.transaction.expiresAtEpochSeconds - getCurrentEpochSeconds()) * 1_000
      )
      const cleanup = setTimeout(
        () => deleteConsentOperation(options.transaction.id, operation),
        delayMilliseconds
      )
      cleanup.unref()
    },
    () => deleteConsentOperation(options.transaction.id, operation)
  )

  return promise
}

async function performOAuthConsentDecision(
  options: ProcessOAuthConsentDecisionOptions
): Promise<OAuthConsentDecisionOutcome> {
  const { decision, transaction } = options

  if (transaction.phase !== "consent" && transaction.phase !== "approved") {
    return { reason: "invalid_transaction_phase", state: "terminal-error", terminal: true }
  }

  if (decision === "deny") {
    const location = createOAuthAuthorizationErrorRedirect(transaction, "access_denied")

    return location
      ? { location, state: "redirect", terminal: true }
      : {
          reason: "invalid_access_denied_redirect",
          state: "terminal-error",
          terminal: true,
        }
  }

  if (!isOAuthTransactionBoundToSubject(transaction, options.subjectId)) {
    return { reason: "subject_mismatch", state: "terminal-error", terminal: true }
  }

  const scopes = [...getRequestedScopes(transaction.request)]

  if (scopes.length === 0) {
    return { reason: "invalid_consent_scopes", state: "terminal-error", terminal: true }
  }

  let consentRecorded = transaction.phase === "approved"

  if (!consentRecorded) {
    try {
      const consentResponse = await options.client.consent(
        {
          client_id: transaction.request.client_id,
          scopes,
        },
        { accessToken: options.accessToken }
      )

      if (consentResponse.status === 401) {
        return { consentRecorded: false, state: "reauthenticate", terminal: false }
      }

      if (consentResponse.status >= 500) {
        return { consentRecorded: false, state: "unavailable", terminal: false }
      }

      if (consentResponse.status !== 200) {
        return {
          reason:
            consentResponse.status === 400
              ? "consent_rejected"
              : "unexpected_consent_status",
          state: "terminal-error",
          terminal: true,
        }
      }

      if (!isValidConsentSuccessResponse(consentResponse.data)) {
        return { reason: "invalid_consent_response", state: "terminal-error", terminal: true }
      }

      consentRecorded = true
    } catch {
      return { consentRecorded: false, state: "unavailable", terminal: false }
    }
  }

  try {
    const authorizationResponse = await options.client.authorize(
      getOAuthAuthorizationRequestForUpstream(
        transaction.request,
        transaction.authenticationPromptSatisfied
      ),
      { accessToken: options.accessToken }
    )
    const authorizationDecision = interpretOAuthAuthorizationResponse(
      authorizationResponse,
      transaction
    )

    if (authorizationDecision.state === "redirect") {
      return { location: authorizationDecision.location, state: "redirect", terminal: true }
    }

    if (authorizationDecision.state === "reauthenticate") {
      return { consentRecorded, state: "reauthenticate", terminal: false }
    }

    if (authorizationDecision.state === "upstream-unavailable") {
      return { consentRecorded, state: "unavailable", terminal: false }
    }

    return {
      reason:
        authorizationDecision.state === "consent-required"
          ? "repeated_consent_required"
          : "upstream_authorization_invalid",
      state: "terminal-error",
      terminal: true,
    }
  } catch {
    return { consentRecorded, state: "unavailable", terminal: false }
  }
}

function isValidConsentSuccessResponse(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }

  const keys = Object.keys(value)

  return (
    keys.length === 1 &&
    keys[0] === "message" &&
    typeof value.message === "string" &&
    value.message.length > 0 &&
    value.message.length <= MAX_CONSENT_MESSAGE_LENGTH
  )
}

function pruneExpiredOperations(): void {
  const nowEpochSeconds = getCurrentEpochSeconds()

  for (const [transactionId, operation] of consentOperations) {
    if (operation.expiresAtEpochSeconds <= nowEpochSeconds) {
      consentOperations.delete(transactionId)
    }
  }
}

function deleteConsentOperation(transactionId: string, operation: ConsentOperation): void {
  if (consentOperations.get(transactionId) === operation) {
    consentOperations.delete(transactionId)
  }
}

function getCurrentEpochSeconds(): number {
  return Math.floor(Date.now() / 1_000)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export {
  OAuthConsentDecisionRequestError,
  parseOAuthConsentDecisionRequest,
  processOAuthConsentDecision,
}
export type {
  OAuthConsentDecision,
  OAuthConsentDecisionFailure,
  OAuthConsentDecisionOutcome,
  ProcessOAuthConsentDecisionOptions,
}
