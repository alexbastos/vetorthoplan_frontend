import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"
import { imagePlanFixture, populatedDocument } from "./fixtures/image-plan.mjs"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript," }
  if (specifier === "next/server") return nextResolve("next/server.js", context)
  if (context.parentURL?.includes("/node_modules/")) return nextResolve(specifier, context)
  if (context.parentURL?.endsWith("/cases-bff-route.ts")) {
    if (specifier === "./session") return { shortCircuit: true, url: "data:text/javascript,export const resolveServerSession=options=>globalThis.planTestSession(options)" }
    if (specifier === "./authentication-api") return { shortCircuit: true, url: "data:text/javascript,export const createAuthenticationApiClient=()=>({})" }
    if (specifier === "./auth-bff-route") return { shortCircuit: true, url: "data:text/javascript,export const getForwardedClientMetadata=()=>({});export const createUnauthenticatedResponse=()=>globalThis.planTestAnonymous()" }
  }
  if (specifier.startsWith("@/")) return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context)
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })
const { NextRequest, NextResponse } = await import("next/server.js")
const { getImagePlanForBff, saveImageCalibrationForBff } = await import("../src/lib/server/image-plan-bff.ts")
const { ApiHttpClient } = await import("../../../packages/api-client/src/http-client.ts")
const { QueryClient } = await import("@tanstack/react-query")
const { requestCalibrationSave } = await import("../src/features/cases/lib/image-plan-saving.ts")
const { imagePlanQueryOptions } = await import("../src/features/cases/lib/image-plan-query-options.ts")
const { createCaseFetch } = await import("../src/features/cases/services/case-fetch.ts")
const route = await import("../src/app/api/cases/[caseId]/images/[imageId]/plan/route.ts")
const f = imagePlanFixture()
const { caseId, identity: { imageId } } = f
const read = data => async () => ({ status: 200, data })
const forbidden = () => assert.fail("must not contact this operation")
const command = { baseRevision: 0, calibration: f.line }
const save = (input, image = f.readyImage, plan = f.initial, write = async (_path, body) => ({ status: 200, data: f.persist(body) }), signal) =>
  saveImageCalibrationForBff(caseId, imageId, input, read(image), read(plan), write, signal)

test("GET checks case membership and readiness, projects a real revision-zero plan, and strips operational data", async () => {
  const seen = [], signal = new AbortController().signal
  const result = await getImagePlanForBff(caseId, imageId, async (path, passed) => {
    seen.push("image"); assert.deepEqual(path, { image_id: imageId }); assert.equal(passed, signal)
    return { status: 200, data: f.readyImage }
  }, async (path, passed) => {
    seen.push("plan"); assert.deepEqual(path, { image_id: imageId }); assert.equal(passed, signal)
    return { status: 200, data: { ...f.initial, tenant_id: "private-tenant", trace_id: "private-trace" } }
  }, signal)
  assert.deepEqual(seen, ["image", "plan"])
  assert.deepEqual(result, { status: 200, body: f.publicPlan(f.initial) })
  assert.equal(JSON.stringify(result).includes("private"), false)
  for (const [image, status] of [[{ ...f.readyImage, case_id: "00000000-0000-4000-8000-000000000999" }, 404], [{ ...f.readyImage, status: "PROCESSING" }, 409]]) {
    assert.equal((await getImagePlanForBff(caseId, imageId, read(image), forbidden)).status, status)
  }
  const absent = await getImagePlanForBff(caseId, imageId, read(f.readyImage), async () => ({ status: 404, data: { code: "IMAGE_NOT_FOUND" } }))
  assert.equal(absent.status, 404, "404 must not become an invented empty plan")
})

test("calibration-only PUT preserves the complete stored plan and uses typed clinical HTTP with the original revision and signal", async () => {
  const existing = { ...f.initial, revision: 3, updated_at: "2026-10-23T18:00:00Z", document: populatedDocument(f) }
  const calls = [], signal = new AbortController().signal
  const client = new ApiHttpClient({ baseUrl: "https://clinical.example", fetch: async (url, init) => {
    calls.push({ url: String(url), init })
    return Response.json(f.persist(JSON.parse(init.body)))
  } })
  const result = await save({ baseRevision: 3, calibration: f.circle }, f.readyImage, existing,
    (pathParams, body, passed) => { assert.equal(passed, signal); return client.request({ method: "put", path: "/api/v1/images/{image_id}/plan", pathParams, body, signal: passed }) }, signal)
  assert.equal(result.status, 200)
  assert.equal(result.body.revision, 4)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, `https://clinical.example/api/v1/images/${imageId}/plan`)
  assert.equal(calls[0].init.method, "PUT")
  const payload = JSON.parse(calls[0].init.body)
  assert.equal(payload.base_revision, 3)
  assert.equal(payload.document.calibration.result, undefined)
  assert.deepEqual(payload.document, { ...existing.document, calibration: f.circle })
  assert.ok(result.body.document.calibration.result)
  for (const key of ["objects", "tplo", "tplo_landmarks", "tplo_measurement", "clinical_validation"]) assert.deepEqual(result.body.document[key], existing.document[key])
})

test("invalid IDs, unknown write fields, forged results and degenerate references fail before any upstream read", async () => {
  const bad = [null, {}, { ...command, baseRevision: -1 }, { ...command, baseRevision: Number.MAX_SAFE_INTEGER },
    { ...command, document: {} }, { ...command, tenant_id: "other" },
    { ...command, calibration: { ...f.line, result: { mm_per_pixel: 100 } } },
    { ...command, calibration: { ...f.line, end: f.line.start } },
    { ...command, calibration: { ...f.circle, edge: f.circle.center } },
    { ...command, calibration: { ...f.line, known_length_mm: 0 } },
    { ...command, calibration: { ...f.line, known_length_mm: 10001 } },
    { ...command, calibration: { ...f.line, start: { x: -0.1, y: 0 } } },
    { ...command, calibration: { ...f.line, start: { x: NaN, y: 0 } } }]
  for (const value of bad) assert.equal((await saveImageCalibrationForBff(caseId, imageId, value, forbidden, forbidden, forbidden)).status, 400)
  assert.equal((await saveImageCalibrationForBff("../case", imageId, command, forbidden, forbidden, forbidden)).status, 400)
  const controller = new AbortController(); controller.abort()
  assert.equal((await saveImageCalibrationForBff(caseId, imageId, command, forbidden, forbidden, forbidden, controller.signal)).body.error.uncertain, false)
})

test("stale revision, unknown stored fields, missing dimensions and known DICOM anisotropy never issue PUT", async () => {
  const conflict = await save(command, f.readyImage, { ...f.initial, revision: 2, updated_at: "2026-10-23T18:00:00Z" }, forbidden)
  assert.deepEqual(conflict.body.error, { code: "PLAN_REVISION_CONFLICT", currentRevision: 2, retryable: false, uncertain: false })
  for (const document of [{ ...f.initial.document, future_geometry: {} },
    { ...f.initial.document, objects: [{ id: "00000000-0000-4000-8000-000000000900", type: "NEW_TOOL" }] }]) {
    assert.equal((await save(command, f.readyImage, { ...f.initial, document }, forbidden)).status, 502)
  }
  assert.equal((await save(command, { ...f.readyImage, width_px: null }, f.initial, forbidden)).body.error.code, "IMAGE_DIMENSIONS_REQUIRED")
  for (const spacing of ["pixel_spacing_mm", "imager_pixel_spacing_mm"]) {
    const image = { ...f.readyImage, kind: "DICOM", [spacing]: [0.4, 0.2] }
    assert.equal((await save(command, image, f.initial, forbidden)).body.error.code, "CALIBRATION_GEOMETRY_UNSUPPORTED")
    assert.equal((await getImagePlanForBff(caseId, imageId, read(image), read(f.initial))).status, 200, "saved plans remain readable")
  }
  assert.equal((await save(command, { ...f.readyImage, kind: "DICOM", pixel_spacing_mm: [0.2, 0.2] })).status, 200)
})

test("unknown or malformed plans cannot masquerade as revision zero or cause destructive replacement", async () => {
  for (const plan of [{ ...f.initial, updated_at: "2026-10-23T18:00:00Z" },
    { ...f.initial, document: { ...f.initial.document, calibration: f.line } },
    { ...f.initial, revision: 1 }, { ...f.initial, image_id: "00000000-0000-4000-8000-000000000999" },
    { ...f.initial, document: { ...f.initial.document, objects: Array(501).fill({}) } }]) {
    assert.equal((await getImagePlanForBff(caseId, imageId, read(f.readyImage), read(plan))).status, 502)
    assert.equal((await save(command, f.readyImage, plan, forbidden)).status, 502)
  }
})

test("upstream failures are sanitized and distinguish a definitive refusal from an ambiguous write", async () => {
  for (const [status, code, expected] of [[409, "PLAN_REVISION_CONFLICT", "PLAN_REVISION_CONFLICT"],
    [409, "IMAGE_NOT_READY", "IMAGE_NOT_READY"], [409, "PRIVATE_CONFLICT", "PLAN_SAVE_NOT_ALLOWED"],
    [422, "CLINICAL_VALIDATION_INVALID", "CLINICAL_VALIDATION_INVALID"], [404, "IMAGE_NOT_FOUND", "IMAGE_NOT_FOUND"],
    [403, "PRIVATE", "ACCESS_DENIED"], [422, "PRIVATE", "VALIDATION_ERROR"], [500, "PRIVATE", "SERVICE_UNAVAILABLE"]]) {
    let writes = 0
    const result = await save(command, f.readyImage, f.initial, async () => { writes++; return { status, data: {
      code, message: "private-message", trace_id: "private-trace", details: { current_revision: 2, storage_key: "private-key" },
    } } })
    assert.equal(result.body.error.code, expected)
    assert.equal(result.body.error.uncertain, status === 500)
    assert.equal(JSON.stringify(result).includes("private"), false)
    assert.equal(writes, 1)
  }
  assert.equal((await save(command, f.readyImage, f.initial, async () => { throw new TypeError("response lost") })).body.error.uncertain, true)
  const before = await saveImageCalibrationForBff(caseId, imageId, command, read(f.readyImage), async () => { throw new TypeError("read failed") }, forbidden)
  assert.equal(before.body.error.uncertain, false)
})

test("a malformed successful PUT is uncertain, never accepted as a saved calibration", async () => {
  const valid = f.persist({ base_revision: 0, document: { ...f.initial.document, calibration: f.line } })
  const bad = [{ ...valid, revision: 4 }, { ...valid, image_id: "00000000-0000-4000-8000-000000000999" },
    { ...valid, document: { ...valid.document, calibration: { ...f.circle, result: valid.document.calibration.result } } },
    { ...valid, document: { ...valid.document, calibration: f.line } },
    { ...valid, document: { ...valid.document, calibration: { ...f.line, result: { ...valid.document.calibration.result, mm_per_pixel: -1 } } } }]
  for (const data of bad) {
    const result = await save(command, f.readyImage, f.initial, async () => ({ status: 200, data }))
    assert.equal(result.status, 502)
    assert.equal(result.body.error.uncertain, true)
  }
})

test("real backend error details do not hide readiness or clinical-validation refusals", async () => {
  for (const [status, code, details] of [
    [409, "IMAGE_NOT_READY", { image_id: imageId }],
    [422, "CLINICAL_VALIDATION_INVALID", {}],
    [409, "PLAN_REVISION_CONFLICT", { current_revision: "invalid private hint" }],
  ]) {
    const result = await save(command, f.readyImage, f.initial, async () => ({ status,
      data: { code, message: "private clinical reason", details, trace_id: "private trace" },
    }))
    assert.deepEqual(result, { status, body: { error: { code, retryable: false, uncertain: false } } })
  }
})

test("actual GET/PUT routes authenticate, enforce origin/media/body bounds and forward only calibration through the scoped client", async () => {
  const beforeEnv = { ...process.env }, beforeFetch = globalThis.fetch
  const app = "http://localhost:3000", calls = []
  Object.assign(process.env, { NODE_ENV: "test", APP_ORIGIN: app, AUTHENTICATION_API_BASE_URL: "https://auth.example",
    CLINICAL_API_BASE_URL: "http://127.0.0.1:8000", CLINICAL_API_IDENTITY_MODE: "local",
    SESSION_COOKIE_SECRET: Buffer.alloc(32, 7).toString("base64url"), OAUTH_TRANSACTION_SECRET: Buffer.alloc(32, 8).toString("base64url") })
  delete process.env.SESSION_COOKIE_PREVIOUS_SECRET
  globalThis.planTestSession = async () => ({ state: "authenticated", accessToken: "general-token", user: { id: "synthetic-user" } })
  globalThis.planTestAnonymous = () => NextResponse.json({ error: { code: "SESSION_UNAVAILABLE", retryable: false } }, { status: 401 })
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })
    if (!String(url).endsWith("/plan")) return Response.json(f.readyImage)
    return Response.json(init.method === "GET" ? f.initial : f.persist(JSON.parse(init.body)))
  }
  const context = { params: Promise.resolve({ caseId, imageId }) }
  const request = (body = JSON.stringify(command), headers = {}) => new NextRequest(`${app}/api/cases/${caseId}/images/${imageId}/plan`, {
    method: "PUT", body, headers: { origin: app, "content-type": "application/json", ...headers },
  })
  try {
    const get = await route.GET(new NextRequest(`${app}/api/cases/${caseId}/images/${imageId}/plan`), context)
    assert.equal(get.status, 200)
    assert.equal(get.headers.get("cache-control"), "no-store")
    const put = await route.PUT(request(), context)
    assert.equal(put.status, 200)
    assert.equal((await put.json()).document.calibration.result.mm_per_pixel, 0.05)
    assert.deepEqual(calls.map(call => call.init.method), ["GET", "GET", "GET", "GET", "PUT"])
    assert.equal(JSON.stringify(calls).includes("general-token"), false)
    const baseline = calls.length
    for (const [body, headers, status] of [[JSON.stringify(command), { origin: "https://untrusted.example" }, 403],
      [JSON.stringify(command), { "content-type": "text/plain" }, 415], ["{", {}, 400], [" ".repeat(4097), {}, 413],
      [JSON.stringify({ ...command, document: { objects: [] } }), {}, 400]]) {
      assert.equal((await route.PUT(request(body, headers), context)).status, status)
      assert.equal(calls.length, baseline)
    }
    globalThis.planTestSession = async () => ({ state: "anonymous", reason: "missing" })
    assert.equal((await route.PUT(request(), context)).status, 401)
    assert.equal((await route.GET(new NextRequest(`${app}/api/cases/${caseId}/images/${imageId}/plan`), context)).status, 401)
    assert.equal(calls.length, baseline)
  } finally {
    globalThis.fetch = beforeFetch
    delete globalThis.planTestSession; delete globalThis.planTestAnonymous
    for (const key of Object.keys(process.env)) if (!Object.hasOwn(beforeEnv, key)) delete process.env[key]
    Object.assign(process.env, beforeEnv)
  }
})

test("browser cache to actual JWT BFF to clinical HTTP saves, reopens and reconciles a lost response without another PUT", async () => {
  const beforeEnv = { ...process.env }, beforeFetch = globalThis.fetch
  const client = new QueryClient(), reopened = new QueryClient()
  const app = "http://localhost:3000", orgId = "synthetic-organization"
  const context = { params: Promise.resolve({ caseId, imageId }) }
  let stored = structuredClone(f.initial), writes = 0, loseResponse = false
  Object.assign(process.env, { NODE_ENV: "test", APP_ORIGIN: app, AUTHENTICATION_API_BASE_URL: "https://auth.example",
    CLINICAL_API_BASE_URL: "https://clinical.example", CLINICAL_API_IDENTITY_MODE: "jwt",
    SESSION_COOKIE_SECRET: Buffer.alloc(32, 7).toString("base64url"), OAUTH_TRANSACTION_SECRET: Buffer.alloc(32, 8).toString("base64url") })
  delete process.env.SESSION_COOKIE_PREVIOUS_SECRET
  globalThis.planTestSession = async () => ({ state: "authenticated", accessToken: "general-token", user: { id: "synthetic-user" } })
  globalThis.planTestAnonymous = () => NextResponse.json({ error: { code: "SESSION_UNAVAILABLE", retryable: false } }, { status: 401 })
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith("https://auth.example/")) {
      assert.equal(init.headers.get("authorization"), "Bearer general-token")
      return String(url).endsWith("/organizations")
        ? Response.json([{ id: orgId, name: "Synthetic clinic", memberRole: "OWNER", isActive: true }])
        : Response.json({ accessToken: "scoped-clinical-token", refreshToken: "discarded-scoped-refresh", organizationId: orgId, expiresIn: 900 })
    }
    assert.equal(init.headers.get("authorization"), "Bearer scoped-clinical-token")
    assert.equal(init.headers.has("x-tenant-id"), false)
    assert.equal(init.credentials, "omit")
    assert.equal(init.redirect, "manual")
    if (!String(url).endsWith("/plan")) return Response.json(f.readyImage)
    if (init.method === "PUT") {
      writes++
      const payload = JSON.parse(init.body)
      assert.equal(payload.base_revision, stored.revision)
      assert.equal(JSON.stringify(payload).includes("token"), false)
      stored = f.persist(payload)
    }
    return Response.json(stored)
  }
  const bridge = createCaseFetch(async (url, init) => {
    const headers = new Headers(init.headers); headers.set("origin", app)
    const request = new NextRequest(new URL(url, app), { ...init, headers })
    const response = await (init.method === "PUT" ? route.PUT(request, context) : route.GET(request, context))
    if (loseResponse && init.method === "PUT") { loseResponse = false; throw new TypeError("lost after BFF commit") }
    return response
  }, () => orgId, () => assert.fail("context must not change"))
  try {
    const owner = { caseId, imageId }
    assert.equal((await client.fetchQuery(imagePlanQueryOptions(client, owner, { fetchImpl: bridge }))).revision, 0)
    assert.equal((await requestCalibrationSave(client, owner, command, { fetchImpl: bridge })).phase, "saved")
    const readBack = await reopened.fetchQuery(imagePlanQueryOptions(reopened, owner, { fetchImpl: bridge }))
    assert.equal(readBack.revision, 1)
    assert.deepEqual(readBack.document.calibration.start, f.line.start)
    assert.equal(readBack.document.calibration.result.mm_per_pixel, 0.05)
    loseResponse = true
    const recovered = await requestCalibrationSave(client, owner, { baseRevision: 1, calibration: f.circle }, { fetchImpl: bridge })
    assert.equal(recovered.phase, "saved")
    assert.equal(recovered.currentRevision, 2)
    assert.equal(writes, 2, "one write per explicit edit, including the lost response")
    const response = await route.PUT(new NextRequest(`${app}/api/cases/${caseId}/images/${imageId}/plan`, {
      method: "PUT", body: JSON.stringify(command), headers: { origin: app, "content-type": "application/json", "x-clinical-organization": "other-org" },
    }), context)
    assert.equal(response.status, 409)
    assert.equal((await response.json()).error.code, "CLINICAL_CONTEXT_CHANGED")
    assert.equal(writes, 2)
  } finally {
    client.clear(); reopened.clear()
    globalThis.fetch = beforeFetch
    delete globalThis.planTestSession; delete globalThis.planTestAnonymous
    for (const key of Object.keys(process.env)) if (!Object.hasOwn(beforeEnv, key)) delete process.env[key]
    Object.assign(process.env, beforeEnv)
  }
})
