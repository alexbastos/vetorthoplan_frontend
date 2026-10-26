import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"
import { QueryClient } from "@tanstack/react-query"
import { clinicalUpload } from "./fixtures/clinical-upload.mjs"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript," }
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })
const { deleteCaseForBff } = await import("../src/lib/server/case-delete-bff.ts")
const { deleteClinicalCase, CaseDeleteError } = await import("../src/features/cases/services/case-delete-api.ts")
const { requestCaseDeletion, isCaseDeletionLocked } = await import("../src/features/cases/lib/case-deletion.ts")
const { requestImageDeletion } = await import("../src/features/cases/lib/image-deletion.ts")
const { casesQueryKeys: keys } = await import("../src/features/cases/hooks/cases-query-keys.ts")
const { ApiHttpClient } = await import("../../../packages/api-client/src/http-client.ts")
const fixture = clinicalUpload()
const { caseId } = fixture
const detail = { id: caseId, title: "Caso sintético", patient: { name: "Paciente sintético", species: "Canina", breed: null,
  sex: "UNKNOWN", birthDate: null, approximateAgeMonths: null, ageSource: null, ageReferenceDate: null, weightKg: null },
  clinicalNotes: null, status: "DRAFT", createdAt: "2026-10-23T12:00:00Z", updatedAt: "2026-10-23T12:00:00Z" }
const missing = () => Response.json({ error: { code: "CASE_NOT_FOUND", retryable: false } }, { status: 404 })

test("case DELETE validates IDs, uses the scoped clinical path, forwards abort, and has no body", async () => {
  const signal = new AbortController().signal, calls = []
  const client = new ApiHttpClient({ baseUrl: "https://clinical.example", fetch: async (url, init) => {
    calls.push({ url: String(url), init }); return new Response(null, { status: 204 })
  } })
  const result = await deleteCaseForBff(caseId, (pathParams, passed) => {
    assert.equal(passed, signal)
    return client.request({ method: "delete", path: "/api/v1/cases/{case_id}", pathParams, signal: passed })
  }, signal)
  assert.deepEqual(result, { status: 204 })
  assert.equal(calls[0].url, `https://clinical.example/api/v1/cases/${caseId}`)
  assert.equal(calls[0].init.method, "DELETE"); assert.equal(calls[0].init.body, undefined)
  assert.equal(calls[0].init.headers.has("content-type"), false)
  assert.equal((await deleteCaseForBff("../case", () => assert.fail("invalid case"))).status, 400)
  const aborted = new AbortController(); aborted.abort()
  assert.equal((await deleteCaseForBff(caseId, () => assert.fail("aborted"), aborted.signal)).status, 503)
})

test("BFF sanitizes refusals and failures and never retries DELETE", async () => {
  for (const [status, expected] of [[404, 404], [409, 409], [403, 403], [422, 400], [401, 503], [503, 503], [200, 502]]) {
    let calls = 0
    const result = await deleteCaseForBff(caseId, async () => { calls++; return { status, data: { message: "private bucket", trace_id: "secret" } } })
    assert.equal(result.status, expected); assert.equal(calls, 1)
    assert.doesNotMatch(JSON.stringify(result), /private|secret/)
  }
})

test("browser sends a same-origin bodyless DELETE and accepts only 204 as success", async () => {
  await deleteClinicalCase(caseId, { fetchImpl: async (url, init) => {
    assert.equal(url, `/api/cases/${caseId}`)
    assert.equal(init.method, "DELETE"); assert.equal(init.credentials, "same-origin")
    assert.equal(init.body, undefined); assert.equal(init.headers, undefined)
    return new Response(null, { status: 204 })
  } })
  await assert.rejects(deleteClinicalCase(caseId, { fetchImpl: async () => Response.json({ error: { code: "CASE_DELETE_NOT_ALLOWED" } }, { status: 409 }) }),
    error => error instanceof CaseDeleteError && !error.uncertain)
})

test("confirmed deletion coalesces clicks and removes only this case's cached resources", async () => {
  const client = new QueryClient(), other = "00000000-0000-4000-8000-000000000065"
  client.setQueryData(keys.detail(caseId), detail)
  client.setQueryData(keys.images(caseId), [fixture.image])
  client.setQueryData(keys.preview(caseId, fixture.image.id), { url: "https://storage.example/temporary" })
  client.setQueryData(keys.ingestionJob(caseId, fixture.jobId), { id: fixture.jobId })
  client.setQueryData(keys.activeIngestions(caseId), [fixture.completed])
  client.setQueryData(keys.detail(other), { id: other })
  client.setQueryData(keys.listPage(null, ""), { items: [detail] })
  const methods = []
  const options = { fetchImpl: async (_, init) => {
    methods.push(init.method ?? "GET")
    return init.method === "DELETE" ? new Response(null, { status: 204 }) : Response.json(detail)
  } }
  try {
    const first = requestCaseDeletion(client, caseId, options)
    assert.equal(requestCaseDeletion(client, caseId, options), first)
    assert.equal((await first).phase, "deleted")
    assert.deepEqual(methods, ["GET", "DELETE"])
    for (const key of [keys.detail(caseId), keys.preview(caseId, fixture.image.id), keys.images(caseId), keys.ingestionJob(caseId, fixture.jobId)]) {
      assert.equal(client.getQueryData(key), undefined)
    }
    assert.deepEqual(client.getQueryData(keys.detail(other)), { id: other })
    assert.equal(client.getQueryState(keys.listPage(null, "")).isInvalidated, true)
    assert.equal(isCaseDeletionLocked(client, caseId), true)
  } finally { client.clear() }
})

test("409 keeps case data and a lost DELETE is checked with GET before another explicit attempt", async () => {
  const client = new QueryClient()
  client.setQueryData(keys.detail(caseId), detail)
  let deletes = 0, conflict = true
  const options = { fetchImpl: async (_, init) => {
    if (init.method === "DELETE") {
      deletes++
      return Response.json({ error: { code: conflict ? "CASE_DELETE_NOT_ALLOWED" : "SERVICE_UNAVAILABLE" } }, { status: conflict ? 409 : 503 })
    }
    return Response.json(detail)
  } }
  try {
    assert.equal((await requestCaseDeletion(client, caseId, options)).message, "blocked")
    assert.deepEqual(client.getQueryData(keys.detail(caseId)), detail)
    conflict = false
    assert.equal((await requestCaseDeletion(client, caseId, options)).phase, "uncertain")
    const before = deletes
    assert.equal((await requestCaseDeletion(client, caseId, options)).message, "stillPresent")
    assert.equal(deletes, before, "checking a lost result must not send DELETE again")
  } finally { client.clear() }
})

test("a lost response followed by verified 404 reconciles success; read errors never claim deletion", async () => {
  for (const absent of [false, true]) {
    const client = new QueryClient()
    let sent = false
    try {
      const state = await requestCaseDeletion(client, caseId, { fetchImpl: async (_, init) => {
        if (init.method === "DELETE") { sent = true; throw new Error("response lost") }
        if (!sent) return Response.json(detail)
        if (absent) return missing()
        throw new Error("offline")
      } })
      assert.equal(state.phase, absent ? "deleted" : "uncertain")
    } finally { client.clear() }
  }
})

test("rename/deletion locks prevent competing writes and an uncertain case blocks image deletion", async () => {
  const client = new QueryClient()
  try {
    client.setQueryData(keys.imageRename(caseId, fixture.image.id), { phase: "renaming" })
    assert.equal((await requestCaseDeletion(client, caseId, { fetchImpl: () => assert.fail("competing mutation") })).message, "blocked")
    client.removeQueries({ queryKey: keys.imageRename(caseId, fixture.image.id) })
    client.setQueryData(keys.caseDeletion(caseId), { phase: "uncertain" })
    assert.equal((await requestImageDeletion(client, fixture.identity, { fetchImpl: () => assert.fail("uncertain case") })).message, "blocked")
    assert.equal((await requestCaseDeletion(client, caseId, { fetchImpl: async () => missing() })).phase, "deleted")
  } finally { client.clear() }
})
