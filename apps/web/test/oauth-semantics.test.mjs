import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { shortCircuit: true, url: "data:text/javascript,export {}" }
    }

    if (specifier.startsWith("./") && !specifier.endsWith(".ts")) {
      return nextResolve(`${specifier}.ts`, context)
    }

    return nextResolve(specifier, context)
  },
})

const {
  getOAuthAuthorizationRequestForUpstream,
  parseOAuthAuthorizationRequest,
  requiresOAuthAuthenticationPrompt,
} = await import("../src/lib/server/oauth-authorization-request.ts")
const {
  isOAuthTransactionBoundToSubject,
  markOAuthTransactionApproved,
  markOAuthTransactionAuthenticationRequired,
  markOAuthTransactionAuthenticationSatisfied,
  markOAuthTransactionConsentRequired,
  readOAuthTransaction,
  setOAuthTransactionCookie,
} = await import("../src/lib/server/oauth-transaction.ts")
const {
  createOAuthAuthorizationErrorRedirect,
  interpretOAuthAuthorizationResponse,
} = await import("../src/lib/server/oauth-authorization-response.ts")
const { processOAuthConsentDecision } = await import(
  "../src/lib/server/oauth-consent-decision.ts"
)

const NOW = new Date("2026-09-10T12:00:00.000Z")
const SECRET = Buffer.alloc(32, 19).toString("base64url")

test("consumes login and account-selection prompts after fresh authentication", () => {
  const request = createRequest({ prompt: "login consent select_account" })

  assert.equal(requiresOAuthAuthenticationPrompt(request), true)
  assert.equal(
    getOAuthAuthorizationRequestForUpstream(request, false).prompt,
    "login consent select_account"
  )
  assert.equal(getOAuthAuthorizationRequestForUpstream(request, true).prompt, "consent")
})

test("keeps prompt=none non-interactive after session resolution", () => {
  const request = createRequest({ prompt: "none" })

  assert.equal(requiresOAuthAuthenticationPrompt(request), false)
  assert.equal(getOAuthAuthorizationRequestForUpstream(request, true).prompt, "none")
})

test("binds consent and approval to the authenticated account", () => {
  const cookies = createCookieStore()
  const options = { now: NOW, secret: SECRET }
  const initial = setOAuthTransactionCookie(cookies, createRequest(), options)
  const awaitingAuthentication = markOAuthTransactionAuthenticationRequired(
    cookies,
    initial,
    options
  )
  const authenticated = markOAuthTransactionAuthenticationSatisfied(
    cookies,
    awaitingAuthentication,
    options
  )
  const consent = markOAuthTransactionConsentRequired(
    cookies,
    authenticated,
    "user-a",
    options
  )

  assert.equal(isOAuthTransactionBoundToSubject(consent, "user-a"), true)
  assert.equal(isOAuthTransactionBoundToSubject(consent, "user-b"), false)

  const approved = markOAuthTransactionApproved(cookies, consent, options)
  const restored = readOAuthTransaction(cookies, {
    expectedTransactionId: approved.id,
    ...options,
  })

  assert.equal(restored.status, "valid")
  assert.equal(restored.transaction.phase, "approved")
  assert.equal(restored.transaction.subjectId, "user-a")
  assert.equal(restored.transaction.authenticationPromptSatisfied, true)
})

test("rejects consent-required when the original request omitted scope", () => {
  const transaction = createTransaction(createRequest({ scope: undefined }))
  const decision = interpretOAuthAuthorizationResponse(
    createUpstreamResult(403, {
      client_id: transaction.request.client_id,
      error: "consent_required",
    }),
    transaction
  )

  assert.deepEqual(decision, { reason: "invalid_consent_response", state: "invalid" })
})

test("never sends an empty consent grant upstream", async () => {
  const transaction = {
    ...createTransaction(createRequest({ scope: undefined })),
    phase: "consent",
    subjectId: "user-a",
  }
  let called = false
  const client = {
    async authorize() {
      called = true
      throw new Error("unexpected authorize call")
    },
    async consent() {
      called = true
      throw new Error("unexpected consent call")
    },
  }

  const outcome = await processOAuthConsentDecision({
    accessToken: "access-token",
    client,
    decision: "allow",
    subjectId: "user-a",
    transaction,
  })

  assert.deepEqual(outcome, {
    reason: "invalid_consent_scopes",
    state: "terminal-error",
    terminal: true,
  })
  assert.equal(called, false)
})

test("creates a validated consent-required redirect with the original state", () => {
  const transaction = createTransaction(createRequest())
  const location = createOAuthAuthorizationErrorRedirect(transaction, "consent_required")

  assert.equal(
    location,
    `https://client.example.com/callback?error=consent_required&state=${transaction.request.state}`
  )
})

function createRequest(overrides = {}) {
  const values = {
    client_id: "client-123",
    code_challenge: "A".repeat(43),
    code_challenge_method: "S256",
    redirect_uri: "https://client.example.com/callback",
    response_type: "code",
    scope: "openid profile",
    state: "state-value-1234567890",
    ...overrides,
  }
  const parameters = new URLSearchParams()

  for (const [name, value] of Object.entries(values)) {
    if (value !== undefined) {
      parameters.set(name, value)
    }
  }

  return parseOAuthAuthorizationRequest(parameters.toString())
}

function createTransaction(request) {
  return {
    authenticationPromptSatisfied: false,
    createdAtEpochSeconds: Math.floor(NOW.getTime() / 1_000),
    expiresAtEpochSeconds: Math.floor(NOW.getTime() / 1_000) + 600,
    id: "A".repeat(22),
    phase: "authorization",
    request,
  }
}

function createUpstreamResult(status, data) {
  const response = new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" },
    status,
  })

  return { data, headers: response.headers, response, status }
}

function createCookieStore() {
  const values = new Map()

  return {
    get(name) {
      const value = values.get(name)
      return value === undefined ? undefined : { value }
    },
    set(name, value) {
      values.set(name, value)
    },
  }
}
