import assert from "node:assert/strict"
import test from "node:test"

import { formatMfaCode, isValidMfaCode } from "../src/features/auth/lib/mfa-challenge.ts"

test("formats and validates six-digit one-time codes", () => {
  assert.equal(formatMfaCode("12 a34-567", "TOTP"), "123456")
  assert.equal(formatMfaCode("98.7654", "EMAIL"), "987654")
  assert.equal(isValidMfaCode("123456", "TOTP"), true)
  assert.equal(isValidMfaCode("12345", "EMAIL"), false)
})

test("formats and validates recovery codes", () => {
  assert.equal(formatMfaCode("abcd1234 efgh5678", "RECOVERY"), "ABCD1234-EFGH5678")
  assert.equal(isValidMfaCode("ABCD1234-EFGH5678", "RECOVERY"), true)
  assert.equal(isValidMfaCode("ABCD1234EFGH5678", "RECOVERY"), false)
})
