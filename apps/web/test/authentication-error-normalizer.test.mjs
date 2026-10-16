import assert from "node:assert/strict"
import test from "node:test"

import { normalizeAuthenticationError } from "../../../packages/api-client/src/error-normalizer.ts"

function upstreamError(status, code) {
  return {
    data: { code, message: "remote message must not be exposed" },
    headers: new Headers(),
    status,
  }
}

test("allowlists documented MFA failure reasons", () => {
  assert.deepEqual(normalizeAuthenticationError(upstreamError(401, "MFA_CODE_INVALID")), {
    code: "UNAUTHORIZED",
    reason: "MFA_CODE_INVALID",
    retryable: false,
    status: 401,
  })
})

test("does not preserve unknown upstream error codes or messages", () => {
  assert.deepEqual(normalizeAuthenticationError(upstreamError(401, "SECRET_INTERNAL_REASON")), {
    code: "UNAUTHORIZED",
    retryable: false,
    status: 401,
  })
})
