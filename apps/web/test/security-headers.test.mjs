import assert from "node:assert/strict"
import test from "node:test"

import {
  BASELINE_CONTENT_SECURITY_POLICY,
  CONTENT_SECURITY_POLICY_REPORT_ONLY_HEADER,
  createContentSecurityPolicyNonce,
  createGlobalSecurityHeaders,
  createReportOnlyContentSecurityPolicy,
  GOOGLE_POPUP_SECURITY_HEADERS,
  isReportOnlyContentSecurityPolicyEnabled,
  SENSITIVE_ROUTE_HEADERS,
} from "../security-headers.ts"

function toHeaderMap(headers) {
  return new Map(headers.map(({ key, value }) => [key.toLowerCase(), value]))
}

test("global production headers apply the restrictive baseline", () => {
  const headers = createGlobalSecurityHeaders(true)
  const headerMap = toHeaderMap(headers)

  assert.equal(headerMap.size, headers.length, "header names must be unique")
  assert.equal(headerMap.get("content-security-policy"), BASELINE_CONTENT_SECURITY_POLICY)
  assert.equal(headerMap.get("cross-origin-opener-policy"), "same-origin")
  assert.equal(headerMap.get("cross-origin-resource-policy"), "same-origin")
  assert.equal(headerMap.get("referrer-policy"), "strict-origin-when-cross-origin")
  assert.equal(headerMap.get("strict-transport-security"), "max-age=31536000")
  assert.equal(headerMap.get("x-content-type-options"), "nosniff")
  assert.equal(headerMap.get("x-frame-options"), "DENY")
  assert.equal(headerMap.get("x-xss-protection"), "0")
})

test("baseline CSP restricts navigation and embedding without weakening scripts", () => {
  assert.match(BASELINE_CONTENT_SECURITY_POLICY, /base-uri 'none'/)
  assert.match(BASELINE_CONTENT_SECURITY_POLICY, /form-action 'self'/)
  assert.match(BASELINE_CONTENT_SECURITY_POLICY, /frame-ancestors 'none'/)
  assert.match(BASELINE_CONTENT_SECURITY_POLICY, /object-src 'none'/)
  assert.doesNotMatch(BASELINE_CONTENT_SECURITY_POLICY, /script-src/)
  assert.doesNotMatch(BASELINE_CONTENT_SECURITY_POLICY, /unsafe-inline|unsafe-eval/)
})

test("HSTS is never emitted by the development server", () => {
  const headerMap = toHeaderMap(createGlobalSecurityHeaders(false))

  assert.equal(headerMap.has("strict-transport-security"), false)
})

test("report-only CSP is opt-in and accepts only the explicit true value", () => {
  assert.equal(isReportOnlyContentSecurityPolicyEnabled(undefined), false)
  assert.equal(isReportOnlyContentSecurityPolicyEnabled(""), false)
  assert.equal(isReportOnlyContentSecurityPolicyEnabled("false"), false)
  assert.equal(isReportOnlyContentSecurityPolicyEnabled("TRUE"), false)
  assert.equal(isReportOnlyContentSecurityPolicyEnabled("true"), true)
})

test("Google popup and sensitive routes narrow only their intended headers", () => {
  assert.deepEqual(GOOGLE_POPUP_SECURITY_HEADERS, [
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  ])
  assert.deepEqual(SENSITIVE_ROUTE_HEADERS, [
    { key: "Cache-Control", value: "no-store" },
    { key: "Referrer-Policy", value: "no-referrer" },
  ])
})

test("creates an unpredictable canonical base64url nonce", () => {
  const firstNonce = createContentSecurityPolicyNonce()
  const secondNonce = createContentSecurityPolicyNonce()

  assert.match(firstNonce, /^[A-Za-z0-9_-]{22}$/)
  assert.match(secondNonce, /^[A-Za-z0-9_-]{22}$/)
  assert.notEqual(firstNonce, secondNonce)
})

test("production report-only CSP trusts nonced scripts without unsafe script directives", () => {
  const nonce = "A".repeat(22)
  const policy = createReportOnlyContentSecurityPolicy({
    allowGoogleIdentity: false,
    isDevelopment: false,
    nonce,
  })
  const scriptDirective = getDirective(policy, "script-src")

  assert.equal(
    CONTENT_SECURITY_POLICY_REPORT_ONLY_HEADER,
    "Content-Security-Policy-Report-Only",
  )
  assert.match(scriptDirective, new RegExp(`'nonce-${nonce}'`))
  assert.match(scriptDirective, /'strict-dynamic'/)
  assert.doesNotMatch(scriptDirective, /'unsafe-inline'|'unsafe-eval'/)
  assert.equal(getDirective(policy, "script-src-attr"), "script-src-attr 'none'")
  assert.equal(getDirective(policy, "style-src-attr"), "style-src-attr 'unsafe-inline'")
  assert.equal(getDirective(policy, "img-src"), "img-src 'self' blob: data:")
  assert.equal(getDirective(policy, "media-src"), "media-src 'self'")
})

test("Google and development exceptions are narrowly scoped", () => {
  const nonce = "B".repeat(22)
  const defaultPolicy = createReportOnlyContentSecurityPolicy({
    allowGoogleIdentity: false,
    isDevelopment: false,
    nonce,
  })
  const googleDevelopmentPolicy = createReportOnlyContentSecurityPolicy({
    allowGoogleIdentity: true,
    isDevelopment: true,
    nonce,
  })

  assert.doesNotMatch(defaultPolicy, /accounts\.google\.com/)
  assert.doesNotMatch(defaultPolicy, /'unsafe-eval'|ws:/)
  assert.match(
    getDirective(googleDevelopmentPolicy, "script-src"),
    /https:\/\/accounts\.google\.com\/gsi\/client/,
  )
  assert.match(
    getDirective(googleDevelopmentPolicy, "connect-src"),
    /https:\/\/accounts\.google\.com\/gsi\/.*ws:/,
  )
  assert.match(getDirective(googleDevelopmentPolicy, "script-src"), /'unsafe-eval'/)
})

test("rejects a nonce that could alter the CSP header", () => {
  assert.throws(
    () =>
      createReportOnlyContentSecurityPolicy({
        allowGoogleIdentity: false,
        isDevelopment: false,
        nonce: "invalid'; script-src *",
      }),
    /Invalid CSP nonce/,
  )
})

function getDirective(policy, name) {
  const directive = policy.split("; ").find((candidate) =>
    candidate.startsWith(`${name} `),
  )

  assert.ok(directive, `missing ${name}`)
  return directive
}
