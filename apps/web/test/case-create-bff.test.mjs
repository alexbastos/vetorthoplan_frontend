import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript," }
    return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
  },
})

const { createCaseForBff } = await import("../src/lib/server/case-create-bff.ts")
const { ApiHttpClient } = await import("../../../packages/api-client/src/http-client.ts")

const idempotencyKey = "00000000-0000-4000-8000-000000000099"
const caseId = "00000000-0000-4000-8000-000000000064"
const input = {
  title: "Planejamento TPLO",
  animal_name: "Paciente sintético 01",
  species: "Canina",
  breed: "Labrador",
  sex: "FEMALE",
  approximate_age_months: 72,
  weight_kg: 31.4,
  clinical_notes: "Nota clínica",
}
const createdCase = {
  id: caseId,
  tenant_id: "00000000-0000-4000-8000-000000000001",
  created_by: "00000000-0000-4000-8000-000000000002",
  title: input.title,
  animal_name: input.animal_name,
  species: input.species,
  breed: input.breed,
  sex: input.sex,
  birth_date: null,
  approximate_age_months: input.approximate_age_months,
  age_source: "DECLARED",
  age_reference_date: "2026-10-16",
  weight_kg: "31.40",
  clinical_notes: input.clinical_notes,
  status: "DRAFT",
  created_at: "2026-10-16T12:00:00Z",
  updated_at: "2026-10-16T12:00:00Z",
}

test("creates a DRAFT and keeps tenant and actor out of the browser response", async () => {
  const calls = []
  const signal = new AbortController().signal
  const result = await createCaseForBff(input, idempotencyKey, async (body, key, passedSignal) => {
    calls.push({ body, key, signal: passedSignal })
    return { data: createdCase, status: 201 }
  }, signal)

  assert.equal(result.status, 201)
  assert.equal(result.body.id, caseId)
  assert.equal(result.body.status, "DRAFT")
  assert.equal(result.body.patient.weightKg, "31.40")
  assert.equal(JSON.stringify(result).includes(createdCase.tenant_id), false)
  assert.equal(JSON.stringify(result).includes(createdCase.created_by), false)
  assert.deepEqual(calls, [{ body: input, key: idempotencyKey, signal }])
})

test("passes the exact idempotency key to the clinical API without identity headers", async () => {
  const calls = []
  const client = new ApiHttpClient({
    baseUrl: "http://127.0.0.1:8000",
    fetch: async (url, init) => {
      calls.push({ url: String(url), init })
      return Response.json(createdCase, { status: 201 })
    },
  })
  const result = await createCaseForBff(input, idempotencyKey, (body, key, signal) => client.request({
    method: "post", path: "/api/v1/cases", body,
    headers: { "Idempotency-Key": key }, signal,
  }))
  assert.equal(result.status, 201)
  assert.equal(calls[0].url, "http://127.0.0.1:8000/api/v1/cases")
  assert.equal(calls[0].init.headers.get("idempotency-key"), idempotencyKey)
  assert.equal(calls[0].init.headers.has("authorization"), false)
  assert.equal(calls[0].init.cache, "no-store")
  assert.deepEqual(JSON.parse(calls[0].init.body), input)
})

test("repeating the same logical request preserves the case instead of creating another", async () => {
  const records = new Map()
  let createdCount = 0
  const writer = async (body, key) => {
    const existing = records.get(key)
    if (existing) {
      return existing.body === JSON.stringify(body)
        ? { data: existing.response, status: 201 }
        : { data: { code: "IDEMPOTENCY_KEY_REUSED", message: "private" }, status: 409 }
    }
    createdCount += 1
    records.set(key, { body: JSON.stringify(body), response: createdCase })
    return { data: createdCase, status: 201 }
  }

  const first = await createCaseForBff(input, idempotencyKey, writer)
  const repeated = await createCaseForBff(input, idempotencyKey, writer)
  const changed = await createCaseForBff({ ...input, title: "Outro caso" }, idempotencyKey, writer)
  assert.equal(createdCount, 1)
  assert.deepEqual(repeated, first)
  assert.deepEqual(changed, { body: { error: { code: "IDEMPOTENCY_KEY_REUSED", retryable: false } }, status: 409 })
})

test("rejects missing key, identity fields and invalid clinical inputs before upstream", async () => {
  let calls = 0
  const writer = async () => { calls += 1; return { data: createdCase, status: 201 } }
  assert.equal((await createCaseForBff(input, null, writer)).status, 400)
  assert.equal((await createCaseForBff(input, "not-a-uuid", writer)).status, 400)

  for (const [invalid, field] of [
    [{ ...input, title: " " }, "title"],
    [{ ...input, tenant_id: createdCase.tenant_id }, null],
    [{ ...input, approximate_age_months: 601 }, "approximate_age_months"],
    [{ ...input, weight_kg: 31.456 }, "weight_kg"],
    [{ ...input, clinical_notes: "x".repeat(4001) }, "clinical_notes"],
  ]) {
    const result = await createCaseForBff(invalid, idempotencyKey, writer)
    assert.equal(result.status, 400)
    assert.equal(result.body.error.code, "REQUEST_VALIDATION_ERROR")
    if (field) assert.equal(result.body.error.fieldErrors.some((item) => item.field === field), true)
  }
  assert.equal(calls, 0)
})

test("requires sex before calling upstream and accepts explicit UNKNOWN", async () => {
  let calls = 0
  const writer = async (body) => {
    calls += 1
    return { status: 201, data: { ...createdCase, sex: body.sex } }
  }
  const { sex: omittedSex, ...withoutSex } = input
  assert.equal(omittedSex, "FEMALE")
  for (const invalid of [withoutSex, { ...input, sex: null }, { ...input, sex: "" }, { ...input, sex: "OTHER" }]) {
    const result = await createCaseForBff(invalid, idempotencyKey, writer)
    assert.equal(result.status, 400)
    assert.equal(result.body.error.code, "REQUEST_VALIDATION_ERROR")
    assert.deepEqual(result.body.error.fieldErrors, [{ field: "sex", type: "invalid" }])
  }
  assert.equal(calls, 0)
  for (const sex of ["MALE", "FEMALE", "UNKNOWN"]) {
    const result = await createCaseForBff({ ...input, sex }, idempotencyKey, writer)
    assert.equal(result.status, 201)
    assert.equal(result.body.patient.sex, sex)
  }
  assert.equal(calls, 3)
})

test("maps backend 422 field errors without exposing message or trace ID", async () => {
  const requestError = await createCaseForBff(input, idempotencyKey, async () => ({
    status: 422,
    data: {
      code: "REQUEST_VALIDATION_ERROR", message: "private detail", trace_id: "private-trace",
      details: { errors: [
        { field: "title", type: "string_too_short" },
        { field: "tenant_id", type: "private_info" },
      ] },
    },
  }))
  assert.deepEqual(requestError, {
    status: 422,
    body: { error: { code: "REQUEST_VALIDATION_ERROR", retryable: false,
      fieldErrors: [{ field: "title", type: "string_too_short" }] } },
  })

  const domainError = await createCaseForBff(input, idempotencyKey, async () => ({
    status: 422,
    data: { code: "CASE_VALIDATION_ERROR", message: "private", details: { field: "birth_date" } },
  }))
  assert.deepEqual(domainError.body.error.fieldErrors, [{ field: "birth_date", type: "domain" }])
  assert.equal(JSON.stringify(requestError).includes("private-trace"), false)
})

test("classifies invalid and failed upstream responses", async () => {
  for (const [upstreamStatus, status, code, retryable] of [
    [401, 503, "SERVICE_UNAVAILABLE", true],
    [403, 403, "ACCESS_DENIED", false],
    [500, 503, "SERVICE_UNAVAILABLE", true],
  ]) {
    assert.deepEqual(await createCaseForBff(input, idempotencyKey, async () => ({ status: upstreamStatus, data: null })),
      { body: { error: { code, retryable } }, status })
  }
  assert.equal((await createCaseForBff(input, idempotencyKey, async () => ({ status: 201, data: { ...createdCase, status: "READY" } }))).status, 502)
  assert.equal((await createCaseForBff(input, idempotencyKey, async () => ({ status: 409, data: { code: "OTHER" } }))).status, 502)
  assert.equal((await createCaseForBff(input, idempotencyKey, async () => { throw new SyntaxError("private") })).status, 502)
  assert.equal((await createCaseForBff(input, idempotencyKey, async () => { throw new Error("private") })).status, 503)
})
