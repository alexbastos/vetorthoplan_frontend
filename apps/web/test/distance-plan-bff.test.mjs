import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"
import { z } from "zod"
import { imagePlanFixture, publishedPopulatedDocument } from "./fixtures/image-plan.mjs"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript," }
  if (specifier === "next/server") return nextResolve("next/server.js", context)
  if (context.parentURL?.includes("/node_modules/")) return nextResolve(specifier, context)
  if (context.parentURL?.endsWith("/cases-bff-route.ts")) {
    if (specifier === "./session") return { shortCircuit: true, url: "data:text/javascript,export const resolveServerSession=()=>globalThis.distanceTestSession()" }
    if (specifier === "./authentication-api") return { shortCircuit: true, url: "data:text/javascript,export const createAuthenticationApiClient=()=>({})" }
    if (specifier === "./auth-bff-route") return { shortCircuit: true, url: "data:text/javascript,export const getForwardedClientMetadata=()=>({});export const createUnauthenticatedResponse=()=>globalThis.distanceTestAnonymous()" }
  }
  if (specifier.startsWith("@/")) return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context)
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })
const { NextRequest, NextResponse } = await import("next/server.js")
const { saveImagePlanEditForBff } = await import("../src/lib/server/image-plan-bff.ts")
const { applyPlanCommand } = await import("../src/features/cases/schemas/image-plan-command.schema.ts")
const editsRoute = await import("../src/app/api/cases/[caseId]/images/[imageId]/plan/edits/route.ts")
const f = imagePlanFixture(), { caseId, identity: { imageId } } = f
const newId = "00000000-0000-4000-8000-000000000abc"
const originalId = "00000000-0000-4000-8000-000000000900"
const geometry = { start: { x: 0, y: 0.25 }, end: { x: 1, y: 0.75 } }
const inputs = [
  { kind: "distance-create", baseRevision: 8, id: newId, ...geometry, label: "Synthetic distance" },
  { kind: "distance-update", baseRevision: 8, id: originalId, ...geometry },
  { kind: "distance-delete", baseRevision: 8, id: originalId },
]
const read = data => async () => ({ status: 200, data })
const forbidden = () => assert.fail("must not call this upstream operation")
const calibration = f.persist({ base_revision: 0, document: { ...f.initial.document, calibration: f.line } }).document.calibration
function currentPlan() {
  const document = publishedPopulatedDocument(f)
  document.calibration = structuredClone(calibration)
  document.tplo = { ...document.tplo, blade_diameter_mm: 24 }
  document.tplo_correction = { status: "CALCULATED", preoperative_tpa_degrees: 24, blade_diameter_mm: 24,
    rotation_mm: 8.4, acceptance: "PASS", clinically_validated: false, table_version: "synthetic-table" }
  document.objects.push({ id: "00000000-0000-4000-8000-000000000902", type: "IMPLANT", visible: true, locked: false, catalog_item_id: newId,
    position: { x: 0.5, y: 0.5 }, rotation_degrees: 12, scale: 1, opacity: 0.8, variant: "Synthetic", view: "Lateral" })
  return { ...f.initial, revision: 8, updated_at: "2026-10-28T19:00:00Z", document }
}
// Synthetic HTTP responses verify integration mechanics, not backend geometry.
const accepted = (plan, payload) => ({ ...plan, revision: payload.base_revision + 1, document: payload.document })
const execute = (input, image = f.readyImage, plan = currentPlan(), write = async (_path, payload) =>
  ({ status: 200, data: accepted(plan, payload) }), signal) =>
  saveImagePlanEditForBff(caseId, imageId, input, read(image), read(plan), write, signal)
const failure = (result, status, code, uncertain = false) => {
  assert.equal(result.status, status)
  assert.equal(result.body.error.code, code)
  assert.equal(result.body.error.uncertain, uncertain)
  assert.equal(result.body.error.retryable, status === 503 && !uncertain)
}

test("distance BFF creates, updates and deletes through one revision-based full-plan write while preserving the clinical document", async () => {
  for (const input of inputs) {
    const before = currentPlan(), snapshot = structuredClone(before), calls = []
    const signal = new AbortController().signal
    const result = await saveImagePlanEditForBff(caseId, imageId, input,
      async (path, passed) => { calls.push("image"); assert.equal(passed, signal); assert.deepEqual(path, { image_id: imageId }); return { status: 200, data: f.readyImage } },
      async (path, passed) => { calls.push("plan"); assert.equal(passed, signal); assert.deepEqual(path, { image_id: imageId }); return { status: 200, data: before } },
      async (path, payload, passed) => {
        calls.push("write"); assert.equal(passed, signal); assert.deepEqual(path, { image_id: imageId })
        assert.deepEqual(Object.keys(payload).sort(), ["base_revision", "document"])
        assert.equal(payload.base_revision, 8)
        const { objects: _objects, ...rest } = payload.document
        const { objects: _previous, ...preserved } = before.document
        assert.deepEqual(rest, preserved)
        const target = payload.document.objects.find(object => object.id === input.id)
        if (input.kind === "distance-create") {
          assert.equal(payload.document.objects.length, before.document.objects.length + 1)
          assert.deepEqual(target, { id: newId, type: "LINE", ...geometry, label: input.label, visible: true, locked: false })
          assert.deepEqual(payload.document.objects.slice(0, -1), before.document.objects)
        } else if (input.kind === "distance-update") {
          assert.equal(target.label, before.document.objects[0].label)
          assert.deepEqual(target.start, input.start); assert.deepEqual(target.end, input.end)
          assert.equal(Object.hasOwn(target, "measurement"), false)
          assert.deepEqual(payload.document.objects.slice(1), before.document.objects.slice(1))
        } else {
          assert.equal(target, undefined)
          assert.deepEqual(payload.document.objects, before.document.objects.slice(1))
        }
        return { status: 200, data: accepted(before, payload) }
      }, signal)
    assert.equal(result.status, 200); assert.equal(result.body.revision, 9)
    assert.deepEqual(calls, ["image", "plan", "write"])
    assert.deepEqual(before, snapshot, "preflight/merge must not mutate the stored document")
  }
})

test("distance BFF rejects forged or invalid commands and identities before reading upstream", async () => {
  for (const input of [{ ...inputs[0], measurement: {} }, { ...inputs[0], end: inputs[0].start },
    { ...inputs[0], start: { x: -1, y: 0 } }, { ...inputs[1], label: "Forbidden rename" },
    { ...inputs[2], document: {} }, { ...inputs[0], baseRevision: -1 }]) {
    failure(await saveImagePlanEditForBff(caseId, imageId, input, forbidden, forbidden, forbidden), 400, "VALIDATION_ERROR")
  }
  failure(await saveImagePlanEditForBff("invalid", imageId, inputs[0], forbidden, forbidden, forbidden), 400, "VALIDATION_ERROR")
})

test("every distance operation checks case membership, readiness, dimensions and both DICOM spacings before reading the plan", async () => {
  for (const input of inputs) {
    for (const [image, status, code] of [
      [{ ...f.readyImage, case_id: newId }, 404, "IMAGE_NOT_FOUND"],
      [{ ...f.readyImage, id: newId }, 404, "IMAGE_NOT_FOUND"],
      [{ ...f.readyImage, status: "PROCESSING" }, 409, "IMAGE_NOT_READY"],
      [{ ...f.readyImage, width_px: null }, 409, "IMAGE_DIMENSIONS_REQUIRED"],
      [{ ...f.readyImage, height_px: null }, 409, "IMAGE_DIMENSIONS_REQUIRED"],
      [{ ...f.readyImage, kind: "DICOM", pixel_spacing_mm: [0.1, 0.2] }, 409, "CALIBRATION_GEOMETRY_UNSUPPORTED"],
      [{ ...f.readyImage, kind: "DICOM", imager_pixel_spacing_mm: [0.1, 0.2] }, 409, "CALIBRATION_GEOMETRY_UNSUPPORTED"],
    ]) failure(await saveImagePlanEditForBff(caseId, imageId, input, read(image), forbidden, forbidden), status, code)
  }
})

test("distance requires a persisted calibrated plan and preserves revision conflicts without any PUT", async () => {
  for (const input of inputs) {
    const missing = currentPlan(); missing.document.calibration = null
    failure(await execute(input, f.readyImage, missing, forbidden), 409, "CALIBRATION_REQUIRED")
    const uncomputed = currentPlan(); uncomputed.document.calibration = structuredClone(f.line)
    failure(await execute(input, f.readyImage, uncomputed, forbidden), 409, "CALIBRATION_REQUIRED")
    const conflict = await execute({ ...input, baseRevision: 7 }, f.readyImage, currentPlan(), forbidden)
    failure(conflict, 409, "PLAN_REVISION_CONFLICT"); assert.equal(conflict.body.error.currentRevision, 8)
  }
  failure(await execute({ ...inputs[0], baseRevision: 0 }, f.readyImage, f.initial, forbidden), 409, "CALIBRATION_REQUIRED")
  const malformed = currentPlan(); malformed.document.calibration.result.mm_per_pixel = 0
  failure(await execute(inputs[0], f.readyImage, malformed, forbidden), 502, "INVALID_RESPONSE")
  failure(await execute(inputs[0], f.readyImage, { ...currentPlan(), image_id: newId }, forbidden), 502, "INVALID_RESPONSE")
  const unsupported = currentPlan(); unsupported.document.future_clinical_field = true
  failure(await execute(inputs[0], f.readyImage, unsupported, forbidden), 502, "INVALID_RESPONSE")
})

test("invalid targets, ID collisions, ambiguous plans and capacity are definitive local refusals before write", async () => {
  const existing = currentPlan()
  const duplicate = currentPlan(); duplicate.document.objects.push({ ...duplicate.document.objects[0] })
  const full = currentPlan()
  while (full.document.objects.length < 500) full.document.objects.push({ ...full.document.objects[1],
    id: `10000000-0000-4000-8000-${String(full.document.objects.length).padStart(12, "0")}` })
  for (const [input, plan] of [
    [{ ...inputs[0], id: originalId }, existing], [{ ...inputs[0], id: existing.document.objects[2].id }, existing],
    [{ ...inputs[1], id: newId }, existing], [{ ...inputs[2], id: newId }, existing],
    [{ ...inputs[1], id: existing.document.objects[1].id }, existing], [{ ...inputs[2], id: existing.document.objects[2].id }, existing],
    [inputs[0], full],
  ]) failure(await execute(input, f.readyImage, plan, forbidden), 400, "VALIDATION_ERROR")
  // Ambiguity belongs to the stored upstream document, not the user's payload.
  for (const input of inputs) failure(await execute(input, f.readyImage, duplicate, forbidden), 502, "INVALID_RESPONSE")
})

test("distance acknowledgements allow absent derived results but reject wrong revision, identity, geometry or malformed data as uncertain", async () => {
  const before = currentPlan()
  const correct = accepted(before, { base_revision: 8, document: applyPlanCommand(before.document, inputs[0]) })
  for (const data of [{ ...correct, revision: 8 }, { ...correct, revision: 10 }, { ...correct, image_id: newId },
    { ...correct, document: before.document },
    { ...correct, document: { ...correct.document, objects: [...correct.document.objects, correct.document.objects.at(-1)] } },
    { ...correct, document: { ...correct.document, objects: correct.document.objects.map(object => object.id === newId
      ? { ...object, end: { x: 0.9, y: 0.75 } } : object) } },
    { ...correct, document: { ...correct.document, objects: correct.document.objects.map(object => object.id === newId
      ? { ...object, measurement: { status: "PRIVATE_STATUS" } } : object) } },
  ]) failure(await execute(inputs[0], f.readyImage, before, async () => ({ status: 200, data })), 502, "INVALID_RESPONSE", true)
  for (const measurement of [null, { status: "CALIBRATION_REQUIRED", values: {}, units: {} },
    { status: "CALCULATED", calibration_id: calibration.result.calibration_id, values: { length: 42 }, units: { length: "mm" } }]) {
    const data = { ...correct, document: { ...correct.document, objects: correct.document.objects.map(object => object.id === newId ? { ...object, measurement } : object) } }
    assert.equal((await execute(inputs[0], f.readyImage, before, async () => ({ status: 200, data }))).status, 200)
  }
  for (const input of inputs.slice(1)) {
    failure(await execute(input, f.readyImage, before, async () => ({ status: 200, data: { ...before, revision: 9 } })), 502, "INVALID_RESPONSE", true)
  }
})

test("distance failures distinguish preflight refusals from an uncertain write and never retry PUT", async () => {
  for (const input of inputs) {
    for (const [status, code, expected] of [[403, "PRIVATE", "ACCESS_DENIED"], [404, "PRIVATE", "IMAGE_NOT_FOUND"],
      [409, "PLAN_REVISION_CONFLICT", "PLAN_REVISION_CONFLICT"], [409, "IMAGE_PLAN_FINALIZED", "PLAN_SAVE_NOT_ALLOWED"],
      [422, "CLINICAL_VALIDATION_INVALID", "CLINICAL_VALIDATION_INVALID"], [422, "REQUEST_VALIDATION_ERROR", "VALIDATION_ERROR"]]) {
      let writes = 0
      const result = await execute(input, f.readyImage, currentPlan(), async () => { writes++; return { status,
        data: { code, message: "private backend detail", details: { current_revision: 12 }, trace_id: "private trace" } } })
      failure(result, status, expected); assert.equal(writes, 1)
      assert.equal(JSON.stringify(result).includes("private"), false)
    }
    for (const problem of [new TypeError("lost response"), new z.ZodError([{ code: "custom", path: [], message: "upstream validation exception" }])]) {
      let writes = 0
      failure(await execute(input, f.readyImage, currentPlan(), async () => { writes++; throw problem }), 503, "SERVICE_UNAVAILABLE", true)
      assert.equal(writes, 1)
    }
    failure(await saveImagePlanEditForBff(caseId, imageId, input, read(f.readyImage), async () => { throw new TypeError("read failed") }, forbidden), 503, "SERVICE_UNAVAILABLE")
  }
  const cancelled = new AbortController(); cancelled.abort()
  failure(await saveImagePlanEditForBff(caseId, imageId, inputs[0], forbidden, forbidden, forbidden, cancelled.signal), 503, "SERVICE_UNAVAILABLE")
  const later = new AbortController()
  failure(await saveImagePlanEditForBff(caseId, imageId, inputs[0], read(f.readyImage), async () => {
    later.abort(); return { status: 200, data: currentPlan() }
  }, forbidden, later.signal), 503, "SERVICE_UNAVAILABLE")
})

test("the actual distance PATCH route enforces origin, authentication, JSON, raw UTF-8 command bounds and no-store", async () => {
  const previousEnv = { ...process.env }, previousFetch = globalThis.fetch
  const app = "http://localhost:3000", calls = []
  let stored = currentPlan()
  Object.assign(process.env, { NODE_ENV: "test", APP_ORIGIN: app, AUTHENTICATION_API_BASE_URL: "https://auth.example",
    CLINICAL_API_BASE_URL: "http://127.0.0.1:8000", CLINICAL_API_IDENTITY_MODE: "local",
    SESSION_COOKIE_SECRET: Buffer.alloc(32, 7).toString("base64url"), OAUTH_TRANSACTION_SECRET: Buffer.alloc(32, 8).toString("base64url") })
  delete process.env.SESSION_COOKIE_PREVIOUS_SECRET
  globalThis.distanceTestSession = async () => ({ state: "authenticated", accessToken: "general-token", user: { id: "synthetic-user" } })
  globalThis.distanceTestAnonymous = () => NextResponse.json({ error: { code: "SESSION_UNAVAILABLE", retryable: false } }, { status: 401 })
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), method: init.method })
    assert.equal(init.headers.has("authorization"), false)
    if (!String(url).endsWith("/plan")) return Response.json(f.readyImage)
    if (init.method === "PUT") stored = accepted(stored, JSON.parse(init.body))
    return Response.json(stored)
  }
  const context = { params: Promise.resolve({ caseId, imageId }) }
  const patch = (body, headers = {}) => editsRoute.PATCH(new NextRequest(`${app}/api/cases/${caseId}/images/${imageId}/plan/edits`, {
    method: "PATCH", body, headers: { origin: app, "content-type": "application/json", ...headers },
  }), context)
  const raw = JSON.stringify(inputs[0])
  try {
    for (const [body, headers, status] of [[raw, { origin: "https://untrusted.example" }, 403],
      [raw, { "content-type": "text/plain" }, 415], ["{", {}, 400],
      [JSON.stringify({ ...inputs[0], measurement: {} }), {}, 400],
      [raw.padEnd(4097), {}, 413], [raw, { "content-length": String(12 * 1024 + 1) }, 413],
      [raw.padEnd(12 * 1024 + 1), {}, 413]]) {
      const response = await patch(body, headers)
      assert.equal(response.status, status); assert.equal(calls.length, 0)
      assert.equal(response.headers.get("cache-control"), "no-store")
    }
    const unicode = JSON.stringify({ ...inputs[0], label: "漢".repeat(120) })
    const oversizedUtf8 = unicode + " ".repeat(4097 - Buffer.byteLength(unicode))
    assert.ok(oversizedUtf8.length < 4096)
    assert.equal((await patch(oversizedUtf8)).status, 413); assert.equal(calls.length, 0)
    const response = await patch(raw.padEnd(4096))
    assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store")
    assert.equal((await response.json()).document.objects.at(-1).id, newId)
    assert.deepEqual(calls.map(call => call.method), ["GET", "GET", "PUT"])
    const quality = { kind: "radiographic-quality", baseRevision: stored.revision, quality: { notes: "漢".repeat(2000) } }
    assert.ok(Buffer.byteLength(JSON.stringify(quality)) > 4096)
    assert.equal((await patch(JSON.stringify(quality))).status, 200)
    const count = calls.length
    globalThis.distanceTestSession = async () => ({ state: "anonymous", reason: "missing" })
    assert.equal((await patch(raw)).status, 401); assert.equal(calls.length, count)
  } finally {
    globalThis.fetch = previousFetch
    delete globalThis.distanceTestSession; delete globalThis.distanceTestAnonymous
    for (const key of Object.keys(process.env)) if (!Object.hasOwn(previousEnv, key)) delete process.env[key]
    Object.assign(process.env, previousEnv)
  }
})
