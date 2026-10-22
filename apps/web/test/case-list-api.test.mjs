import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })

const { CaseListRequestError, fetchCaseList } = await import("../src/features/cases/services/case-list-api.ts")

const caseId = "00000000-0000-4000-8000-000000000064"
const firstPage = {
  items: [{
    id: caseId,
    title: "Caso sintético",
    patient: { name: "Paciente 01", species: "Canina", breed: null, sex: "UNKNOWN" },
    status: "READY",
    createdAt: "2026-10-16T12:00:00Z",
    updatedAt: "2026-10-16T12:00:01Z",
  }],
  nextCursor: "opaque+/==",
  statusCounts: { DRAFT: 8, READY: 4 },
}

test("sends server filters and the opaque cursor to the same-origin BFF", async () => {
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url, options })
    return Response.json(firstPage)
  }

  assert.deepEqual(await fetchCaseList({ status: "READY", search: "Paciente 01" }, { fetchImpl }), firstPage)
  assert.deepEqual(await fetchCaseList({ status: "READY", search: "Paciente 01", cursor: firstPage.nextCursor }, { fetchImpl }), firstPage)
  assert.equal(calls[0].url, "/api/cases?limit=20&status=READY&search=Paciente+01")
  assert.equal(calls[1].url, "/api/cases?limit=20&cursor=opaque%2B%2F%3D%3D&status=READY&search=Paciente+01")
  assert.equal(calls[0].options.credentials, "same-origin")
  assert.equal(calls[0].options.cache, "no-store")
})

test("rejects invalid BFF data and keeps failure codes separate from success", async () => {
  await assert.rejects(
    fetchCaseList({}, { fetchImpl: async () => Response.json({ ...firstPage, statusCounts: undefined }) }),
    (error) => error instanceof CaseListRequestError && error.code === "INVALID_RESPONSE",
  )
  await assert.rejects(
    fetchCaseList({}, { fetchImpl: async () => Response.json({ error: { code: "SERVICE_UNAVAILABLE", retryable: true } }, { status: 503 }) }),
    (error) => error instanceof CaseListRequestError && error.code === "SERVICE_UNAVAILABLE" && error.retryable,
  )
})
