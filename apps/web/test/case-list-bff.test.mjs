import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript," }
    return nextResolve(specifier, context)
  },
})

const { listCasesForBff, parseCaseListQuery, parseClinicalCaseList } = await import(
  "../src/lib/server/case-list-bff.ts"
)
const { ApiHttpClient } = await import("../../../packages/api-client/src/http-client.ts")

const caseId = "00000000-0000-4000-8000-000000000064"
const clinicalList = {
  items: [{
    id: caseId,
    title: "Planejamento TPLO",
    animal_name: "Paciente sintético 01",
    species: "Canina",
    breed: null,
    sex: "UNKNOWN",
    status: "READY",
    created_at: "2026-10-16T12:00:00Z",
    updated_at: "2026-10-16T12:00:01Z",
    tenant_id: "private-tenant",
    created_by: "private-actor",
  }],
  next_cursor: "opaque+/==",
  status_counts: { DRAFT: 3, READY: 1 },
}

test("accepts only the documented filters and preserves an opaque cursor", () => {
  const query = parseCaseListQuery(new URLSearchParams(
    "limit=20&cursor=opaque%2B%2F%3D%3D&status=DRAFT&search=Paciente%20sint%C3%A9tico",
  ))
  assert.deepEqual(query, {
    limit: 20,
    cursor: "opaque+/==",
    status: "DRAFT",
    search: "Paciente sintético",
  })
  assert.deepEqual(parseCaseListQuery(new URLSearchParams()), {})
  assert.equal(parseCaseListQuery(new URLSearchParams({ search: "🐾".repeat(200) }))?.search, "🐾".repeat(200))

  for (const raw of [
    "limit=0", "limit=101", "limit=01", "limit=1.5", "limit=NaN", "status=COMPLETED",
    "cursor=", "cursor=x&cursor=y", "tenant_id=private-tenant", `search=${"a".repeat(201)}`,
  ]) {
    assert.equal(parseCaseListQuery(new URLSearchParams(raw)), undefined, raw)
  }
})

test("validates the 0.8.0 response and exposes only the public list fields", () => {
  assert.deepEqual(parseClinicalCaseList(clinicalList), {
    items: [{
      id: caseId,
      title: "Planejamento TPLO",
      patient: { name: "Paciente sintético 01", species: "Canina", breed: null, sex: "UNKNOWN" },
      status: "READY",
      createdAt: "2026-10-16T12:00:00Z",
      updatedAt: "2026-10-16T12:00:01Z",
    }],
    nextCursor: "opaque+/==",
    statusCounts: { DRAFT: 3, READY: 1 },
  })

  for (const broken of [
    { ...clinicalList, next_cursor: undefined },
    { ...clinicalList, status_counts: undefined },
    { ...clinicalList, status_counts: { READY: -1 } },
    { ...clinicalList, status_counts: { COMPLETED: 1 } },
    { ...clinicalList, items: [{ ...clinicalList.items[0], status: "COMPLETED" }] },
    { ...clinicalList, items: [{ ...clinicalList.items[0], created_at: "not-a-date" }] },
  ]) {
    assert.equal(parseClinicalCaseList(broken), undefined)
  }
})

test("forwards one validated request and returns cursor plus global status counts", async () => {
  const calls = []
  const signal = new AbortController().signal
  const result = await listCasesForBff(
    new URLSearchParams("limit=5&status=READY&search=TPLO"),
    async (query, passedSignal) => {
      calls.push({ query, signal: passedSignal })
      return { data: clinicalList, status: 200 }
    },
    signal,
  )
  assert.deepEqual(calls, [{ query: { limit: 5, status: "READY", search: "TPLO" }, signal }])
  assert.equal(result.status, 200)
  assert.equal(result.body.nextCursor, "opaque+/==")
  assert.deepEqual(result.body.statusCounts, { DRAFT: 3, READY: 1 })
})

test("calls the clinical list path with the encoded opaque cursor and no cache", async () => {
  const calls = []
  const client = new ApiHttpClient({
    baseUrl: "http://127.0.0.1:8000",
    fetch: async (url, init) => {
      calls.push({ url: String(url), init })
      return new Response(JSON.stringify(clinicalList), {
        headers: { "content-type": "application/json" },
        status: 200,
      })
    },
  })

  const result = await listCasesForBff(
    new URLSearchParams("cursor=opaque%2B%2F%3D%3D&limit=5"),
    (query, signal) => client.request({
      method: "get",
      path: "/api/v1/cases",
      query,
      signal,
    }),
  )

  assert.equal(result.status, 200)
  assert.equal(calls.length, 1)
  assert.equal(
    calls[0].url,
    "http://127.0.0.1:8000/api/v1/cases?limit=5&cursor=opaque%2B%2F%3D%3D",
  )
  assert.equal(calls[0].init.cache, "no-store")
  assert.equal(calls[0].init.redirect, "manual")
})

test("rejects invalid queries before calling the clinical API", async () => {
  let calls = 0
  const result = await listCasesForBff(new URLSearchParams("limit=200"), async () => {
    calls += 1
    return { data: clinicalList, status: 200 }
  })
  assert.deepEqual(result, {
    body: { error: { code: "VALIDATION_ERROR", retryable: false } },
    status: 400,
  })
  assert.equal(calls, 0)
})

test("translates upstream failures without exposing remote messages or trace IDs", async () => {
  const cases = [
    [422, 400, "VALIDATION_ERROR", false],
    [401, 503, "SERVICE_UNAVAILABLE", true],
    [403, 403, "ACCESS_DENIED", false],
    [500, 503, "SERVICE_UNAVAILABLE", true],
    [302, 502, "INVALID_RESPONSE", false],
  ]
  for (const [upstreamStatus, status, code, retryable] of cases) {
    const result = await listCasesForBff(new URLSearchParams(), async () => ({
      data: { message: "private upstream message", trace_id: "private-trace" },
      status: upstreamStatus,
    }))
    assert.deepEqual(result, { body: { error: { code, retryable } }, status })
  }

  const invalid = await listCasesForBff(new URLSearchParams(), async () => ({
    data: { ...clinicalList, status_counts: undefined }, status: 200,
  }))
  assert.equal(invalid.status, 502)

  const malformed = await listCasesForBff(new URLSearchParams(), async () => { throw new SyntaxError("private body") })
  assert.deepEqual(malformed, {
    body: { error: { code: "INVALID_RESPONSE", retryable: false } }, status: 502,
  })
  const network = await listCasesForBff(new URLSearchParams(), async () => { throw new Error("private URL") })
  assert.deepEqual(network, {
    body: { error: { code: "SERVICE_UNAVAILABLE", retryable: true } }, status: 503,
  })
})
