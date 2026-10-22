import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })

const { CaseDetailRequestError, fetchCaseDetail } = await import("../src/features/cases/services/case-detail-api.ts")

const caseId = "00000000-0000-4000-8000-000000000064"
const detail = {
  id: caseId,
  title: "Caso sintético",
  patient: {
    name: "Paciente 01", species: "Canina", breed: null, sex: "UNKNOWN",
    birthDate: null, approximateAgeMonths: 0, weightKg: "31.40",
    ageSource: "DECLARED", ageReferenceDate: "2026-10-16",
  },
  clinicalNotes: null,
  status: "DRAFT",
  createdAt: "2026-10-16T12:00:00Z",
  updatedAt: "2026-10-16T12:00:01Z",
}

test("loads a case directly by ID from the same-origin BFF", async () => {
  const calls = []
  const result = await fetchCaseDetail(caseId, {
    fetchImpl: async (url, options) => {
      calls.push({ url, options })
      return Response.json(detail)
    },
  })
  assert.deepEqual(result, detail)
  assert.equal(calls[0].url, `/api/cases/${caseId}`)
  assert.equal(calls[0].options.credentials, "same-origin")
  assert.equal(calls[0].options.cache, "no-store")
})

test("distinguishes a missing case from an invalid detail response", async () => {
  await assert.rejects(
    fetchCaseDetail(caseId, { fetchImpl: async () => Response.json({ error: { code: "CASE_NOT_FOUND", retryable: false } }, { status: 404 }) }),
    (error) => error instanceof CaseDetailRequestError && error.code === "CASE_NOT_FOUND" && !error.retryable,
  )
  await assert.rejects(
    fetchCaseDetail(caseId, { fetchImpl: async () => Response.json({ ...detail, id: "00000000-0000-4000-8000-000000000065" }) }),
    (error) => error instanceof CaseDetailRequestError && error.code === "INVALID_RESPONSE",
  )
})
