import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript," }
    return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
  },
})

const { getCaseForBff } = await import("../src/lib/server/case-detail-bff.ts")
const { ApiHttpClient } = await import("../../../packages/api-client/src/http-client.ts")

const caseId = "00000000-0000-4000-8000-000000000064"
const clinicalCase = {
  id: caseId,
  tenant_id: "00000000-0000-4000-8000-000000000001",
  created_by: "00000000-0000-4000-8000-000000000002",
  title: "Planejamento TPLO",
  animal_name: "Paciente sintético 01",
  species: "Canina",
  breed: null,
  sex: "FEMALE",
  birth_date: null,
  approximate_age_months: 72,
  age_source: "DECLARED",
  age_reference_date: "2026-10-16",
  weight_kg: "31.40",
  clinical_notes: "Nota clínica",
  status: "DRAFT",
  created_at: "2026-10-16T12:00:00Z",
  updated_at: "2026-10-16T12:00:01Z",
}

test("reads one tenant-scoped case and projects only public clinical fields", async () => {
  const calls = []
  const signal = new AbortController().signal
  const result = await getCaseForBff(caseId, async (path, passedSignal) => {
    calls.push({ path, signal: passedSignal })
    return { data: clinicalCase, status: 200 }
  }, signal)

  assert.deepEqual(calls, [{ path: { case_id: caseId }, signal }])
  assert.deepEqual(result, {
    status: 200,
    body: {
      id: caseId,
      title: "Planejamento TPLO",
      patient: {
        name: "Paciente sintético 01", species: "Canina", breed: null,
        sex: "FEMALE", birthDate: null, approximateAgeMonths: 72, weightKg: "31.40",
        ageSource: "DECLARED", ageReferenceDate: "2026-10-16",
      },
      clinicalNotes: "Nota clínica",
      status: "DRAFT",
      createdAt: "2026-10-16T12:00:00Z",
      updatedAt: "2026-10-16T12:00:01Z",
    },
  })
  assert.equal(JSON.stringify(result).includes(clinicalCase.tenant_id), false)
  assert.equal(JSON.stringify(result).includes(clinicalCase.created_by), false)
})

test("uses the documented detail path without a cache or forwarded identity", async () => {
  const calls = []
  const client = new ApiHttpClient({
    baseUrl: "http://127.0.0.1:8000",
    fetch: async (url, init) => {
      calls.push({ url: String(url), init })
      return Response.json(clinicalCase)
    },
  })
  const result = await getCaseForBff(caseId, (pathParams, signal) => client.request({
    method: "get", path: "/api/v1/cases/{case_id}", pathParams, signal,
  }))
  assert.equal(result.status, 200)
  assert.equal(calls[0].url, `http://127.0.0.1:8000/api/v1/cases/${caseId}`)
  assert.equal(calls[0].init.cache, "no-store")
  assert.equal(calls[0].init.headers.has("authorization"), false)
})

test("rejects bad IDs, mismatched responses and tenant-hidden 404s", async () => {
  let calls = 0
  const invalid = await getCaseForBff("../other-tenant", async () => {
    calls += 1
    return { data: clinicalCase, status: 200 }
  })
  assert.deepEqual(invalid, { body: { error: { code: "VALIDATION_ERROR", retryable: false } }, status: 400 })
  assert.equal(calls, 0)

  const missing = await getCaseForBff(caseId, async () => ({
    data: { message: "private tenant detail", trace_id: "secret" }, status: 404,
  }))
  assert.deepEqual(missing, { body: { error: { code: "CASE_NOT_FOUND", retryable: false } }, status: 404 })

  for (const wrong of [
    { ...clinicalCase, id: "00000000-0000-4000-8000-000000000065" },
    { ...clinicalCase, approximate_age_months: -1 },
    { ...clinicalCase, status: "COMPLETED" },
    { ...clinicalCase, birth_date: "tomorrow" },
  ]) {
    const result = await getCaseForBff(caseId, async () => ({ data: wrong, status: 200 }))
    assert.equal(result.status, 502)
  }
})

test("classifies retryable upstream failures without returning remote messages", async () => {
  for (const [upstreamStatus, status, code, retryable] of [
    [422, 400, "VALIDATION_ERROR", false],
    [403, 403, "ACCESS_DENIED", false],
    [401, 503, "SERVICE_UNAVAILABLE", true],
    [500, 503, "SERVICE_UNAVAILABLE", true],
  ]) {
    assert.deepEqual(await getCaseForBff(caseId, async () => ({
      data: { message: "private" }, status: upstreamStatus,
    })), { body: { error: { code, retryable } }, status })
  }
  assert.equal((await getCaseForBff(caseId, async () => { throw new Error("private URL") })).status, 503)
})
