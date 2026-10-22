import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript," }
  if (specifier === "next/server") return nextResolve("next/server.js", context)
  if (context.parentURL?.includes("/node_modules/")) return nextResolve(specifier, context)
  if (context.parentURL?.endsWith("/cases-bff-route.ts")) {
    if (specifier === "./session") return { shortCircuit: true, url: "data:text/javascript,export const resolveServerSession = options => globalThis.clinicalTestSession(options)" }
    if (specifier === "./authentication-api") return { shortCircuit: true, url: "data:text/javascript,export const createAuthenticationApiClient = () => ({})" }
    if (specifier === "./auth-bff-route") return { shortCircuit: true, url: "data:text/javascript,export const getForwardedClientMetadata = () => ({}); export const createUnauthenticatedResponse = () => globalThis.clinicalTestAnonymous()" }
  }
  if (specifier.startsWith("@/")) return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context)
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })
const { NextRequest, NextResponse } = await import("next/server.js")
const { withAuthenticatedCasesRoute, createCasesResponse } = await import("../src/lib/server/cases-bff-route.ts")
const contextRoute = await import("../src/app/api/cases/context/route.ts")
const { clearSessionCookies } = await import("../src/lib/server/session-cookies.ts")
const base = "https://gateway.example"
const app = "http://localhost:3000"
const organization = { id: "org-one", name: "Clínica sintética", memberRole: "OWNER", isActive: true }
const scoped = "clinical-scoped-token"
const general = "general-login-token"
const cookieHeader = response => response.cookies.getAll().filter(cookie => cookie.value).map(cookie => `${cookie.name}=${cookie.value}`).join("; ")
function setup() {
  const previousFetch = globalThis.fetch
  const before = { ...process.env }
  Object.assign(process.env, { NODE_ENV: "test", APP_ORIGIN: app, AUTHENTICATION_API_BASE_URL: base,
    CLINICAL_API_BASE_URL: base, CLINICAL_API_IDENTITY_MODE: "jwt", SESSION_COOKIE_SECRET: Buffer.alloc(32, 3).toString("base64url") })
  delete process.env.SESSION_COOKIE_PREVIOUS_SECRET
  globalThis.clinicalTestSession = async () => ({ state: "authenticated", accessToken: general, user: { id: "user-one" } })
  globalThis.clinicalTestAnonymous = () => NextResponse.json({ error: { code: "SESSION_UNAVAILABLE", retryable: false } }, { status: 401 })
  const calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })
    if (String(url).endsWith("/organizations")) return Response.json([organization])
    if (String(url).endsWith("/token")) return Response.json({ accessToken: scoped, refreshToken: "organization-refresh", organizationId: organization.id, expiresIn: 900 })
    assert.equal(init.headers.get("authorization"), `Bearer ${scoped}`)
    return Response.json({ ok: true })
  }
  const close = () => {
    globalThis.fetch = previousFetch
    delete globalThis.clinicalTestSession; delete globalThis.clinicalTestAnonymous
    for (const key of Object.keys(process.env)) if (!Object.hasOwn(before, key)) delete process.env[key]
    Object.assign(process.env, before)
  }
  return { calls, close }
}

test("context POST and protected clinical route roundtrip use encrypted cookies and a scoped Bearer without exposing either token", async () => {
  const s = setup()
  try {
    const resolved = await contextRoute.POST(new NextRequest(`${app}/api/cases/context`, { method: "POST", headers: { origin: app } }))
    assert.equal(resolved.status, 200)
    const body = await resolved.json()
    assert.equal(body.state, "ready"); assert.equal(body.organization.id, organization.id)
    assert.equal(JSON.stringify(body).includes("Token"), false)
    assert.match(resolved.headers.get("set-cookie"), /HttpOnly/)
    const response = await withAuthenticatedCasesRoute(new NextRequest(`${app}/api/cases`, { headers: { cookie: cookieHeader(resolved), "x-clinical-organization": organization.id } }),
      async (_, client) => { const result = await client.request({ method: "get", path: "/api/v1/cases" }); return createCasesResponse(result.data, result.status) })
    assert.equal(response.status, 200)
    assert.equal(response.headers.get("cache-control"), "no-store")
    assert.equal(s.calls.filter(call => call.url.endsWith("/token")).length, 1, "clinical request should reuse scoped cookie")
    assert.equal(s.calls.filter(call => call.url.endsWith("/organizations")).length, 2, "membership must be fresh")
    assert.equal(s.calls.at(-1).init.headers.get("authorization"), `Bearer ${scoped}`)
  } finally { s.close() }
})

test("missing/mismatched expected organization and untrusted mutations cannot reach a clinical write", async () => {
  const s = setup()
  try {
    for (const headers of [{}, { "x-clinical-organization": "other-org" }]) {
      const response = await withAuthenticatedCasesRoute(new NextRequest(`${app}/api/cases`, { headers }), () => assert.fail("context mismatch must not reach mutation"))
      assert.equal(response.status, 409)
      assert.equal((await response.json()).error.code, "CLINICAL_CONTEXT_CHANGED")
    }
    const requestsBefore = s.calls.length
    const crossOrigin = await contextRoute.PUT(new NextRequest(`${app}/api/cases/context`, { method: "PUT", headers: { origin: "https://untrusted.example", "content-type": "application/json" }, body: JSON.stringify({ organizationId: organization.id }) }))
    assert.equal(crossOrigin.status, 403); assert.equal(s.calls.length, requestsBefore)
    assert.equal(s.calls.filter(call => call.url.endsWith("/token")).length, 0)
  } finally { s.close() }
})

test("clinical 401/403 clears scoped access, preserves rotated general cookies and never retries a clinical POST", async () => {
  for (const status of [401, 403]) {
    const s = setup()
    try {
      globalThis.clinicalTestSession = async options => {
        options.cookieWriter.set("rotated-general-cookie", "encrypted", { httpOnly: true, path: "/", sameSite: "lax", secure: false, priority: "high", maxAge: 900 })
        return { state: "authenticated", accessToken: general, user: { id: "user-one" } }
      }
      const initial = globalThis.fetch
      let writes = 0
      globalThis.fetch = async (url, init) => {
        if (String(url).endsWith("/api/v1/cases")) { writes++; return Response.json({ message: "private trace", code: "private" }, { status }) }
        return initial(url, init)
      }
      const response = await withAuthenticatedCasesRoute(new NextRequest(`${app}/api/cases`, { method: "POST", headers: { origin: app, "content-type": "application/json", "x-clinical-organization": organization.id }, body: "{}" }), async (_, client) => {
        await client.request({ method: "post", path: "/api/v1/cases", body: { title: "synthetic", animal_name: "synthetic", species: "Canina", sex: "MALE" } })
        return createCasesResponse({ error: { code: "SERVICE_UNAVAILABLE" } }, 503)
      }, { method: "POST", body: "application/json" })
      assert.equal(response.status, status); assert.equal(writes, 1)
      assert.equal(response.cookies.get("rotated-general-cookie").value, "encrypted")
      assert.equal(response.cookies.get("vetorthoplan_clinical_access").value, "")
      assert.equal(JSON.stringify(await response.json()).includes("private"), false)
    } finally { s.close() }
  }
})

test("selection PUT validates membership and body strictly before issuing a token; logout clears the clinical context", async () => {
  const s = setup()
  try {
    for (const [body, expected] of [[{ organizationId: "other-org" }, 404], [{ organizationId: organization.id, tenant_id: "forged" }, 400], [{ organizationId: "" }, 400]]) {
      const response = await contextRoute.PUT(new NextRequest(`${app}/api/cases/context`, { method: "PUT", headers: { origin: app, "content-type": "application/json" }, body: JSON.stringify(body) }))
      assert.equal(response.status, expected)
    }
    assert.equal(s.calls.filter(call => call.url.endsWith("/token")).length, 0)
    const cleared = []
    clearSessionCookies({ set: (name, value, options) => cleared.push({ name, value, options }) })
    assert.ok(cleared.some(cookie => cookie.name === "vetorthoplan_clinical_access" && cookie.options.maxAge === 0))
    assert.ok(cleared.some(cookie => cookie.name === "vetorthoplan_clinical_organization" && cookie.options.maxAge === 0))
  } finally { s.close() }
})

test("explicit selection amongst several organizations pins subsequent calls; a stale tab is refused before reaching clinical HTTP", async () => {
  const s = setup()
  try {
    const second = { ...organization, id: "org-two", name: "Outra clínica" }
    let exchanges = 0
    globalThis.fetch = async (url, init) => {
      if (String(url).endsWith("/organizations")) return Response.json([organization, second])
      if (String(url).endsWith("/token")) { exchanges++; return Response.json({ accessToken: scoped, refreshToken: "scoped-refresh", organizationId: second.id, expiresIn: 900 }) }
      assert.fail("stale context must not reach clinical HTTP")
    }
    const initial = await contextRoute.POST(new NextRequest(`${app}/api/cases/context`, { method: "POST", headers: { origin: app } }))
    assert.equal((await initial.json()).state, "selection_required"); assert.equal(exchanges, 0)
    const chosen = await contextRoute.PUT(new NextRequest(`${app}/api/cases/context`, { method: "PUT", headers: { origin: app, "content-type": "application/json" }, body: JSON.stringify({ organizationId: second.id }) }))
    assert.equal(chosen.status, 200); assert.equal((await chosen.json()).organization.id, second.id)
    const stale = await withAuthenticatedCasesRoute(new NextRequest(`${app}/api/cases`, { headers: { cookie: cookieHeader(chosen), "x-clinical-organization": organization.id } }), () => assert.fail("stale handler must not run"))
    assert.equal(stale.status, 409); assert.equal(exchanges, 1)
  } finally { s.close() }
})
