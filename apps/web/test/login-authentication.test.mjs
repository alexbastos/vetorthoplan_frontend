import assert from "node:assert/strict"
import test from "node:test"

import { parseAuthenticationOutcome } from "../src/lib/server/login-authentication.ts"

test("keeps session tokens server-side for an authenticated outcome", () => {
  assert.deepEqual(parseAuthenticationOutcome({
    accessToken: "access-token",
    refreshToken: "refresh-token",
    type: "authenticated",
  }), {
    tokens: {
      accessToken: "access-token",
      refreshToken: "refresh-token",
    },
    type: "authenticated",
  })
})

test("converts an MFA response into the public challenge shape", () => {
  assert.deepEqual(parseAuthenticationOutcome({
    availableMethods: ["TOTP", "EMAIL", "TOTP", "UNSUPPORTED"],
    mfaToken: "temporary-token",
    type: "mfa_required",
  }), {
    availableMethods: ["TOTP", "EMAIL"],
    challengeToken: "temporary-token",
    type: "mfa_required",
  })
})

test("rejects malformed authentication responses", () => {
  assert.equal(parseAuthenticationOutcome({ type: "authenticated" }), undefined)
  assert.equal(parseAuthenticationOutcome({ availableMethods: [], mfaToken: "token", type: "mfa_required" }), undefined)
  assert.equal(parseAuthenticationOutcome(null), undefined)
})
