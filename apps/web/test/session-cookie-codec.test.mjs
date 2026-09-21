import assert from "node:assert/strict"
import test from "node:test"

import {
  openSessionToken,
  sealSessionToken,
} from "../src/lib/server/session-cookie-codec.ts"

const CURRENT_KEY = Buffer.alloc(32, 17)
const OTHER_KEY = Buffer.alloc(32, 29)
const NOW = new Date("2026-09-10T12:00:00.000Z")
const OPTIONS = {
  additionalAuthenticatedData: "vetorthoplan_session_access:vetorthoplan-session-token",
  key: CURRENT_KEY,
  maxAgeSeconds: 900,
  now: NOW,
}

test("round-trips a token without persisting its plaintext", () => {
  const token = "sensitive-access-token"
  const firstCookie = sealSessionToken(token, OPTIONS)
  const secondCookie = sealSessionToken(token, OPTIONS)

  assert.equal(firstCookie.includes(token), false)
  assert.notEqual(firstCookie, secondCookie)
  assert.deepEqual(openSessionToken(firstCookie, OPTIONS), {
    status: "valid",
    token,
  })
})

test("rejects tampering, another key, and another cookie purpose", () => {
  const cookie = sealSessionToken("sensitive-access-token", OPTIONS)
  const replacement = cookie.endsWith("A") ? "B" : "A"
  const tamperedCookie = `${cookie.slice(0, -1)}${replacement}`

  assert.deepEqual(openSessionToken(tamperedCookie, OPTIONS), { status: "invalid" })
  assert.deepEqual(openSessionToken(cookie, { ...OPTIONS, key: OTHER_KEY }), {
    status: "invalid",
  })
  assert.deepEqual(
    openSessionToken(cookie, {
      ...OPTIONS,
      additionalAuthenticatedData: "vetorthoplan_session_refresh:vetorthoplan-session-token",
    }),
    { status: "invalid" }
  )
})

test("enforces the authenticated server-side lifetime", () => {
  const cookie = sealSessionToken("sensitive-access-token", OPTIONS)

  assert.deepEqual(
    openSessionToken(cookie, {
      ...OPTIONS,
      now: new Date(NOW.getTime() + 900_000),
    }),
    { status: "expired" }
  )
  assert.deepEqual(
    openSessionToken(cookie, { ...OPTIONS, maxAgeSeconds: 901 }),
    { status: "invalid" }
  )
})

test("rejects payloads that exceed the safe cookie limit", () => {
  assert.throws(
    () => sealSessionToken("x".repeat(4_000), OPTIONS),
    /safe cookie size/
  )
})
