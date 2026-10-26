import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"
import { createHash } from "node:crypto"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript," }
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })
const { createClinicalIdentityCookies } = await import("../src/lib/server/clinical-identity-cookies.ts")
const { resolveClinicalIdentity, ClinicalIdentityError } = await import("../src/lib/server/clinical-identity.ts")
const { createClinicalApiClient } = await import("../src/lib/server/clinical-api.ts")
const { getClinicalServerEnvironment } = await import("../src/lib/server/environment.ts")
const { fetchClinicalContext } = await import("../src/features/cases/services/clinical-context-api.ts")
const { createCaseFetch } = await import("../src/features/cases/services/case-fetch.ts")
const origin = "https://clinical.example"
const authOrigin = "https://authentication.example"
const organization = { id: "org-one", name: "Clínica sintética", memberRole: "OWNER", isActive: true }
const second = { ...organization, id: "org-two", name: "Outra clínica sintética" }
const general = "general-login-token"
const scoped = "clinical-organization-token"
const token = { accessToken: scoped, refreshToken: "organization-refresh-token", organizationId: organization.id, expiresIn: 900 }
const ownerId = "user-one"
const environment = { CLINICAL_API_BASE_URL: origin, CLINICAL_API_IDENTITY_MODE: "jwt", NODE_ENV: "production" }
const now = new Date("2026-10-21T18:00:00Z")
const secrets = { current: Buffer.alloc(32, 1).toString("base64url") }
function jar() {
  const values = new Map(), writes = []
  const store = { get: name => values.has(name) ? { value: values.get(name) } : undefined,
    set: (name, value, options) => { writes.push({ name, value, options }); if (options.maxAge === 0) values.delete(name); else values.set(name, value) } }
  return { values, writes, cookies: (overrides = {}) => createClinicalIdentityCookies(store, store, { secrets, authOrigin, clinicalOrigin: origin, production: true, now, ...overrides }) }
}
function request(cookies, fetchImpl, overrides = {}) {
  return resolveClinicalIdentity({ ownerId, accessToken: general, authOrigin, cookies, fetchImpl, ...overrides })
}
const okFetch = (organizations = [organization], response = token) => async (url, init) => Response.json(init.method === "GET" ? organizations : response)

test("single active organization exchanges an empty JSON object and only the scoped Bearer reaches clinical HTTP", async () => {
  const j = jar(), calls = []
  const identity = await request(j.cookies(), async (url, init) => {
    calls.push({ url: String(url), init })
    assert.equal(init.headers.get("authorization"), `Bearer ${general}`)
    assert.equal(init.headers.has("x-tenant-id"), false)
    if (init.method === "POST") {
      assert.equal(String(url), `${authOrigin}/authentication_api/api/v1/auth/organizations/org-one/token`)
      assert.equal(init.body, "{}"); assert.equal(init.headers.get("content-type"), "application/json")
    }
    return Response.json(init.method === "GET" ? [organization] : token)
  })
  assert.equal(identity.state, "ready"); assert.equal(identity.organization.id, organization.id)
  assert.deepEqual(calls.map(item => item.init.method), ["GET", "POST"])
  const clinical = createClinicalApiClient({ environment, accessToken: identity.accessToken, fetch: async (url, init) => {
    assert.equal(String(url), `${origin}/api/v1/cases`)
    assert.equal(init.headers.get("authorization"), `Bearer ${scoped}`)
    assert.equal(init.credentials, "omit"); assert.equal(init.redirect, "manual")
    return Response.json({ items: [] })
  } })
  await clinical.request({ method: "get", path: "/api/v1/cases" })
  for (const { value, options } of j.writes) {
    assert.equal(value.includes(scoped), false); assert.equal(value.includes(general), false)
    assert.equal(options.httpOnly, true); assert.equal(options.secure, true); assert.equal(options.path, "/")
  }
  assert.equal(JSON.stringify(j.writes).includes(token.refreshToken), false)
})

test("none/multiple active organizations do not issue a token; inactive and unauthorized choices cannot grant access", async () => {
  for (const [items, state] of [[[], "no_organizations"], [[{ ...organization, isActive: false }], "no_organizations"], [[organization, second], "selection_required"]]) {
    const result = await request(jar().cookies(), async (_, init) => { assert.equal(init.method, "GET"); return Response.json(items) })
    assert.equal(result.state, state)
    assert.equal(JSON.stringify(result).includes("accessToken"), false)
    assert.ok(result.organizations.every(item => !Object.hasOwn(item, "isActive")))
  }
  await assert.rejects(request(jar().cookies(), async (_, init) => { assert.equal(init.method, "GET"); return Response.json([organization]) }, { chosenOrganizationId: second.id }), error => error.status === 404)
  await assert.rejects(request(jar().cookies(), () => assert.fail("invalid parameter must not call upstream"), { chosenOrganizationId: "x".repeat(256) }), error => error.status === 400)
})

test("organization IDs are opaque 1–255 strings and encoded in the path, with only the required empty JSON object", async () => {
  const item = { ...organization, id: "org /?# ç" }
  const result = await request(jar().cookies(), async (url, init) => {
    if (init.method === "GET") return Response.json([item, second])
    assert.equal(new URL(url).pathname, `/authentication_api/api/v1/auth/organizations/${encodeURIComponent(item.id)}/token`)
    assert.equal(init.body, "{}")
    assert.equal(init.headers.get("content-type"), "application/json")
    return Response.json({ ...token, organizationId: item.id })
  }, { chosenOrganizationId: item.id })
  assert.equal(result.organization.id, item.id)
})

test("cached access is bound to account, organization, session, origins and expiry; tampered cookies fail closed", async () => {
  const j = jar(), cookies = j.cookies()
  await request(cookies, okFetch())
  const binding = createHash("sha256").update(JSON.stringify([general, "OWNER"])).digest("hex")
  assert.equal(cookies.access(ownerId, organization.id, binding), scoped)
  assert.equal(cookies.access("another-user", organization.id, binding), undefined)
  assert.equal(cookies.access(ownerId, second.id, binding), undefined)
  assert.equal(cookies.access(ownerId, organization.id, "other-session"), undefined)
  assert.equal(j.cookies({ clinicalOrigin: "https://other.example" }).access(ownerId, organization.id, binding), undefined)
  assert.equal(j.cookies({ now: new Date(now.getTime() + 886_000) }).access(ownerId, organization.id, binding), undefined)
  assert.equal(j.cookies({ now: new Date(now.getTime() + 901_000) }).access(ownerId, organization.id, binding), undefined)
  assert.equal(cookies.selection("another-user"), undefined)
  const accessName = [...j.values.keys()].find(name => name.endsWith("clinical_access"))
  j.values.set(accessName, `${j.values.get(accessName)}x`)
  assert.equal(cookies.access(ownerId, organization.id, binding), undefined)
})

test("cache revalidates membership every request, revocation cannot silently switch tenant, and role/session changes re-exchange", async () => {
  const j = jar(); await request(j.cookies(), okFetch())
  const methods = []
  await request(j.cookies(), async (_, init) => { methods.push(init.method); return Response.json([organization]) })
  assert.deepEqual(methods, ["GET"])
  let exchanges = 0
  const changed = { ...organization, memberRole: "MEMBER" }
  await request(j.cookies(), async (_, init) => { if (init.method === "POST") exchanges++; return Response.json(init.method === "GET" ? [changed] : token) })
  assert.equal(exchanges, 1)
  const revoked = await request(j.cookies(), async (_, init) => { assert.equal(init.method, "GET"); return Response.json([second]) })
  assert.equal(revoked.state, "selection_required")
  assert.equal(j.values.size, 0)
  const another = jar(); await request(another.cookies(), okFetch())
  let fresh = false
  await request(another.cookies(), async (_, init) => { fresh ||= init.method === "POST"; return Response.json(init.method === "GET" ? [organization] : token) }, { accessToken: "new-login-session" })
  assert.equal(fresh, true)
})

test("clinical cookies support key rotation, isolate their purposes and remain separate from the general session", async () => {
  const j = jar(); await request(j.cookies(), okFetch())
  const binding = createHash("sha256").update(JSON.stringify([general, "OWNER"])).digest("hex")
  const next = { current: Buffer.alloc(32, 2).toString("base64url"), previous: secrets.current }
  assert.equal(j.cookies({ secrets: next }).access(ownerId, organization.id, binding), scoped)
  assert.equal(j.cookies({ secrets: { current: next.current } }).access(ownerId, organization.id, binding), undefined)
  const accessName = [...j.values.keys()].find(name => name.endsWith("clinical_access"))
  const selectionName = [...j.values.keys()].find(name => name.endsWith("clinical_organization"))
  const original = j.values.get(accessName)
  j.values.set(accessName, j.values.get(selectionName)); j.values.set(selectionName, original)
  assert.equal(j.cookies().access(ownerId, organization.id, binding), undefined)
  assert.equal(j.cookies().selection(ownerId), undefined)
  j.cookies().clear(); assert.equal(j.values.size, 0)
})

test("expired access renews by organization exchange without using or replacing a general refresh token", async () => {
  const j = jar(); await request(j.cookies(), okFetch())
  const result = await request(j.cookies({ now: new Date(now.getTime() + 901_000) }), async (url, init) => {
    assert.equal(String(url).includes("/auth/refresh"), false)
    assert.equal(init.headers.get("authorization"), `Bearer ${general}`)
    return Response.json(init.method === "GET" ? [organization] : { ...token, accessToken: "new-clinical-token" })
  })
  assert.equal(result.accessToken, "new-clinical-token")
  assert.ok(j.writes.every(write => /clinical_(access|organization)$/.test(write.name)))
})

test("wrong organization, login-token reuse, malformed responses and provider errors never produce a usable clinical context", async () => {
  for (const body of [{ ...token, organizationId: second.id }, { ...token, accessToken: general }, { ...token, expiresIn: 0 }, { ...token, expiresIn: "900" }, { ...token, accessToken: "bad\ntoken" }, { accessToken: scoped }]) {
    await assert.rejects(request(jar().cookies(), okFetch([organization], body)), error => error.status === 502)
  }
  for (const status of [400, 401, 403, 404, 429, 500, 302]) {
    await assert.rejects(request(jar().cookies(), async (_, init) => init.method === "GET" ? Response.json([organization]) : Response.json({ statusCode: status, error: "private", code: "private", message: "private-secret" }, { status })),
      error => error instanceof ClinicalIdentityError && error.status === (status === 500 ? 503 : status === 302 ? 502 : status) && !error.message.includes("private"))
  }
  for (const body of [[organization, organization], [{ ...organization, isActive: undefined }], {}]) await assert.rejects(request(jar().cookies(), okFetch(body)), error => error.status === 502)
  await assert.rejects(request(jar().cookies(), async () => { throw Error("private-secret") }), error => error.status === 503 && !error.message.includes("private"))
})

test("an expected organization mismatch is rejected before token exchange or clinical mutation", async () => {
  const j = jar(); await request(j.cookies(), okFetch())
  for (const expectedOrganizationId of [undefined, second.id]) {
    await assert.rejects(request(j.cookies(), async (_, init) => { assert.equal(init.method, "GET"); return Response.json([organization, second]) }, { requireExpectedOrganization: true, expectedOrganizationId }), error => error.status === 409 && error.code === "CLINICAL_CONTEXT_CHANGED")
  }
})

test("concurrent cold requests share one scoped exchange; aborting a waiter does not cancel the others", async () => {
  let release, started, count = 0
  const barrier = new Promise(resolve => { release = resolve })
  const begin = new Promise(resolve => { started = resolve })
  const abort = new AbortController()
  const fetchImpl = async (_, init) => {
    if (init.method === "GET") return Response.json([organization])
    count++; started(); await barrier; assert.equal(init.signal.aborted, false); return Response.json(token)
  }
  const first = request(jar().cookies(), fetchImpl, { signal: abort.signal })
  const rejected = assert.rejects(first, error => error.status === 503)
  await begin
  const second = request(jar().cookies(), fetchImpl)
  await new Promise(resolve => setImmediate(resolve))
  abort.abort(); release()
  await rejected; assert.equal((await second).state, "ready"); assert.equal(count, 1)
})

test("JWT mode requires HTTPS and an issued token, keeps local mode restricted, and never forwards Bearer to storage/health or follows redirects", async () => {
  assert.equal(getClinicalServerEnvironment(environment).identityMode, "jwt")
  assert.throws(() => getClinicalServerEnvironment({ ...environment, CLINICAL_API_BASE_URL: "http://localhost:8000" }))
  assert.throws(() => createClinicalApiClient({ environment }))
  assert.throws(() => createClinicalApiClient({ environment: { ...environment, CLINICAL_API_IDENTITY_MODE: "local" } }))
  assert.throws(() => createClinicalApiClient({ environment: { ...environment, NODE_ENV: "test", CLINICAL_API_IDENTITY_MODE: "local" }, accessToken: scoped }))
  let calls = 0, rejected
  const client = createClinicalApiClient({ environment, accessToken: scoped, onAccessRejected: status => { rejected = status }, fetch: async (_, init) => { calls++; assert.equal(init.redirect, "manual"); return Response.json({}, { status: 401 }) } })
  await assert.rejects(client.request({ method: "get", path: "/health/live" }))
  assert.equal(calls, 0)
  await client.request({ method: "get", path: "/api/v1/cases" })
  assert.equal(rejected, 401); assert.equal(calls, 1)
})

test("browser context contains only public organization data; selection sends only the selected ID", async () => {
  const publicOrganization = { id: organization.id, name: organization.name, memberRole: organization.memberRole }
  for (const organizationId of [undefined, organization.id]) {
    const value = await fetchClinicalContext({ organizationId, fetchImpl: async (url, init) => {
      assert.equal(url, "/api/cases/context"); assert.equal(init.method, organizationId ? "PUT" : "POST")
      assert.equal(init.credentials, "same-origin"); assert.equal(init.cache, "no-store")
      assert.equal(init.body, organizationId ? JSON.stringify({ organizationId }) : undefined)
      return Response.json({ state: "ready", mode: "jwt", organization: publicOrganization, organizations: [publicOrganization], accessToken: "must-be-stripped", refreshToken: "must-be-stripped" })
    } })
    assert.equal(JSON.stringify(value).includes("must-be-stripped"), false)
  }
  await assert.rejects(fetchClinicalContext({ fetchImpl: async () => Response.json({ state: "ready", mode: "jwt", organization: null, organizations: [] }) }), error => error.code === "INVALID_RESPONSE")
})

test("browser transport pins the expected organization, detects context changes, does not retry and cannot carry auth tokens to storage", async () => {
  let notified = 0, calls = 0
  const transport = createCaseFetch(async (url, init) => {
    calls++; assert.equal(init.headers.get("x-clinical-organization"), encodeURIComponent("org /?# ç"))
    assert.equal(init.headers.has("authorization"), false)
    return Response.json({ error: { code: "CLINICAL_CONTEXT_CHANGED", retryable: false } }, { status: 409 })
  }, () => "org /?# ç", () => { notified++ })
  const response = await transport("/api/cases", { method: "POST", headers: { authorization: "must-be-removed" } })
  assert.equal(response.status, 409); assert.equal(notified, 1); assert.equal(calls, 1)
  assert.equal((await response.json()).error.code, "CLINICAL_CONTEXT_CHANGED")
  await assert.rejects(transport("https://storage.example/upload"))
  await assert.rejects(transport("/api/cases-untrusted"))
  assert.equal(calls, 1)
})
