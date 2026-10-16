import assert from "node:assert/strict"
import test from "node:test"

import { parseAuthenticationOutcome } from "../src/lib/server/login-authentication.ts"
import {
  initialLoginHandoffMachine,
  transitionLoginHandoff,
} from "../src/components/shared/login-handoff/login-handoff-machine.ts"

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

test("starts the destination transition only after the loader and destination are both ready", () => {
  const authenticating = transitionLoginHandoff(initialLoginHandoffMachine, { type: "begin" })
  const waiting = transitionLoginHandoff(authenticating, { type: "request-succeeded" })
  const loaderReady = transitionLoginHandoff(waiting, { type: "loader-settled" })

  assert.equal(loaderReady.phase, "awaiting-destination")

  const exiting = transitionLoginHandoff(loaderReady, { type: "destination-ready" })
  const entering = transitionLoginHandoff(exiting, { type: "loader-exited" })
  const ready = transitionLoginHandoff(entering, { type: "destination-entered" })

  assert.equal(exiting.phase, "exiting-loader")
  assert.equal(entering.phase, "entering-destination")
  assert.deepEqual(ready, initialLoginHandoffMachine)
})

test("destination readiness is order-independent and duplicate events are harmless", () => {
  const authenticating = transitionLoginHandoff(initialLoginHandoffMachine, { type: "begin" })
  const waiting = transitionLoginHandoff(authenticating, { type: "request-succeeded" })
  const destinationReady = transitionLoginHandoff(waiting, { type: "destination-ready" })
  const duplicateDestinationReady = transitionLoginHandoff(destinationReady, { type: "destination-ready" })
  const exiting = transitionLoginHandoff(duplicateDestinationReady, { type: "loader-settled" })

  assert.deepEqual(duplicateDestinationReady, destinationReady)
  assert.equal(exiting.phase, "exiting-loader")
})
