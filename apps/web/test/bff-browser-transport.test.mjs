import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript," }
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })

const { authBffClient } = await import("../src/features/auth/services/auth-bff-client.ts")
const { settingsBffClient } = await import("../src/features/settings/services/settings-bff-client.ts")
const { createCaseFetch } = await import("../src/features/cases/services/case-fetch.ts")
const { assertTrustedMutationRequest, RequestSecurityError } = await import("../src/lib/server/request-security.ts")
const origin = "https://app.example"

// Simulate an intermediary supplying an unsupported default when no media type
// was sent. This is a regression fixture, not a claim about gateway internals.
function throughIntermediary(calls) {
  return async (path, init) => {
    assert.match(path, /^\/api\//)
    const headers = new Headers(init.headers)
    headers.set("origin", origin)
    if (!headers.has("content-type")) headers.set("content-type", "text/plain")
    const request = new Request(new URL(path, origin), { ...init, headers })
    calls.push({ path, init, request })
    try {
      await assertTrustedMutationRequest(request, origin, { method: init.method.toUpperCase(), body: "none" })
      return Response.json({ error: { code: "SESSION_UNAVAILABLE", retryable: false } }, { status: 401 })
    } catch (error) {
      if (!(error instanceof RequestSecurityError)) throw error
      return Response.json({ error: { code: "REQUEST_NOT_ALLOWED", retryable: false } }, { status: error.status })
    }
  }
}

test("empty auth/settings mutations reach authentication through an intermediary without gaining a JSON body", async () => {
  const previousFetch = globalThis.fetch
  const previousWindow = globalThis.window
  const calls = []
  globalThis.window = { setTimeout, clearTimeout }
  globalThis.fetch = throughIntermediary(calls)
  try {
    for (const call of [
      () => authBffClient.session(),
      () => authBffClient.logout(),
      () => settingsBffClient.getProfile(),
      () => settingsBffClient.getActiveSessions(),
      () => settingsBffClient.getTwoFactorAuthenticationStatus(),
      () => settingsBffClient.beginTotpSetup(),
      () => settingsBffClient.deleteAvatar(),
      () => settingsBffClient.revokeActiveSession("synthetic-session"),
    ]) {
      const result = await call()
      assert.equal(result.status, 401, "an empty request must reach authentication rather than fail with 415")
      assert.equal(result.error.code, "SESSION_UNAVAILABLE")
    }
    assert.equal(calls.length, 8)
    for (const { init, request } of calls) {
      assert.equal(init.body, undefined)
      assert.equal(request.body, null)
      assert.equal(init.credentials, "same-origin")
      assert.equal(new Headers(init.headers).get("content-type"), "application/json")
    }
  } finally { globalThis.fetch = previousFetch; globalThis.window = previousWindow }
})

test("bodyless case mutations declare JSON and preserve tenant context while reads keep their media type", async () => {
  const calls = []
  const transport = createCaseFetch(throughIntermediary(calls), () => "synthetic-org", () => {})
  for (const method of ["POST", "DELETE"]) {
    const response = await transport("/api/cases/synthetic/action", { method, headers: { authorization: "must-be-removed" } })
    assert.equal(response.status, 401)
    const { init, request } = calls.at(-1)
    assert.equal(request.body, null)
    assert.equal(init.headers.get("content-type"), "application/json")
    assert.equal(init.headers.get("x-clinical-organization"), "synthetic-org")
    assert.equal(init.headers.has("authorization"), false)
  }
  const read = createCaseFetch(async (_, init) => {
    assert.equal(init.headers.has("content-type"), false)
    return Response.json({})
  }, () => undefined, () => {})
  await read("/api/cases")
})

test("JSON writes keep their payload and multipart avatar uploads leave the boundary to fetch", async () => {
  const previousFetch = globalThis.fetch
  const previousWindow = globalThis.window
  const calls = []
  globalThis.window = { setTimeout, clearTimeout }
  globalThis.fetch = async (path, init) => { calls.push({ path, init }); return Response.json({ success: true }) }
  try {
    const profile = { name: "Synthetic profile" }
    await settingsBffClient.updateProfile(profile)
    assert.equal(calls[0].init.body, JSON.stringify(profile))
    assert.equal(new Headers(calls[0].init.headers).get("content-type"), "application/json")
    const avatar = new File(["synthetic"], "avatar.png", { type: "image/png" })
    await settingsBffClient.uploadAvatar(avatar)
    assert.equal(calls[1].init.body instanceof FormData, true)
    assert.equal(calls[1].init.body.get("avatar"), avatar)
    assert.equal(new Headers(calls[1].init.headers).has("content-type"), false)
  } finally { globalThis.fetch = previousFetch; globalThis.window = previousWindow }
})
