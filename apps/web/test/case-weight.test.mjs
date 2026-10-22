import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript," }
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })
const { createNewCaseFormSchema } = await import("../src/features/cases/schemas/new-case-form.schema.ts")
const { toCreateCaseRequest, prepareCreateAttempt, caseCreateFieldIssues } = await import("../src/features/cases/lib/new-case-request.ts")
const { createCase, CaseCreateRequestError } = await import("../src/features/cases/services/case-create-api.ts")
const { fetchCaseDetail, CaseDetailRequestError } = await import("../src/features/cases/services/case-detail-api.ts")
const { createCaseForBff } = await import("../src/lib/server/case-create-bff.ts")
const { getCaseForBff } = await import("../src/lib/server/case-detail-bff.ts")
const { ApiHttpClient } = await import("../../../packages/api-client/src/http-client.ts")
const { nextCaseWeightInputValue } = await import("../src/features/cases/lib/case-weight-input.ts")

const messages = Object.fromEntries([
  "ageYears", "ageMonths", "ageLimit", "birthDate", "breedMax", "clinicalNotesMax", "patientNameMax",
  "patientNameRequired", "sexRequired", "speciesMax", "speciesRequired", "titleMax", "titleRequired", "weight",
].map(key => [key, key]))
const formSchema = createNewCaseFormSchema(messages, () => "2026-10-21")
const values = { title: "Caso sintético", patientName: "Paciente 01", species: "Canina", sex: "female",
  breed: "", weightKg: "", clinicalNotes: "", birthDate: "", ageYears: "", ageMonths: "" }
const caseId = "00000000-0000-4000-8000-000000000064"
const key = "00000000-0000-4000-8000-000000000099"
const clinicalCase = { id: caseId, tenant_id: "00000000-0000-4000-8000-000000000001",
  created_by: "00000000-0000-4000-8000-000000000002", title: values.title, animal_name: values.patientName,
  species: values.species, sex: "FEMALE", breed: null, weight_kg: "31.40", clinical_notes: null, status: "DRAFT",
  birth_date: null, approximate_age_months: null, age_source: null, age_reference_date: null,
  created_at: "2026-10-21T12:00:00Z", updated_at: "2026-10-21T12:00:00Z" }
const input = toCreateCaseRequest(values)

test("weight editing supports empty/intermediate decimals, selection replacement and the five-integer/two-decimal limit", () => {
  let current = ""
  for (const edit of ["9", "99", "999", "9999", "99999", "99999,", "99999,9", "99999,99"]) {
    current = nextCaseWeightInputValue(current, edit)
    assert.equal(current, edit)
  }
  for (const candidate of ["999999,99", "99999,999", "100000", "999999999999999999999999999"]) assert.equal(nextCaseWeightInputValue(current, candidate), current)
  for (const candidate of ["99999,9", "99999,", "99999", "31.40", "31,40", ",", ",5", ".", ".5", "", "0", "0,", "0,01"]) {
    assert.equal(nextCaseWeightInputValue(current, candidate), candidate)
  }
  // Replacing selected text is judged by the resulting value, not by individual keys.
  assert.equal(nextCaseWeightInputValue("99999,99", "31,40"), "31,40")
})

test("invalid typing, paste and autofill preserve the prior weight instead of filtering or truncating it", () => {
  for (const previous of ["", "31,40", "99999,99"]) {
    for (const candidate of ["letters", "31kg", "-31.40", "+31.40", "31.409", "31,409", "1e2", "1E-2", "1.234,56", "1,234.56",
      "99.999,99", "99999.999", " 31.40 ", "31/40", "NaN", "Infinity", "３１", "31\n", "000031,40"]) {
      assert.equal(nextCaseWeightInputValue(previous, candidate), previous, candidate)
    }
  }
})

test("editing guards do not replace submission validation or alter the decimal payload", () => {
  const weightKg = nextCaseWeightInputValue("", "31,40")
  assert.equal(toCreateCaseRequest(formSchema.parse({ ...values, weightKg })).weight_kg, "31.40")
  const corrected = nextCaseWeightInputValue(weightKg, "31,409")
  assert.equal(corrected, "31,40")
  assert.equal(toCreateCaseRequest(formSchema.parse({ ...values, weightKg: corrected })).weight_kg, "31.40")
  // Zero and incomplete decimals remain editable; existing field validation rejects submission.
  for (const candidate of ["0", "0,00", ",", "31,"]) {
    assert.equal(nextCaseWeightInputValue("", candidate), candidate)
    assert.equal(formSchema.safeParse({ ...values, weightKg: candidate }).success, false)
  }
  assert.equal(toCreateCaseRequest(formSchema.parse({ ...values, weightKg: nextCaseWeightInputValue(weightKg, "") })).weight_kg, null)
})

test("an invalid draft retained by an already open form can be deleted progressively but cannot gain invalid characters", () => {
  for (const [previous, deleted] of [["999999999", "99999999"], ["sdsdsds", "sdsdsd"], ["31,409", "31,40"], ["31kg", "31g"]]) {
    assert.equal(nextCaseWeightInputValue(previous, deleted), deleted)
    assert.equal(nextCaseWeightInputValue(previous, `${previous}x`), previous)
    assert.equal(nextCaseWeightInputValue(previous, ""), "")
    assert.equal(nextCaseWeightInputValue(previous, "31,40"), "31,40")
  }
  assert.equal(nextCaseWeightInputValue("31kg", "3xx"), "31kg")
})

test("localized input crosses form, browser, BFF and clinical HTTP unchanged as a decimal string, then reopens with the response string", async () => {
  for (const [entered, sent, returned] of [
    ["31,40", "31.40", "31.40"], ["31.4", "31.4", "31.40"], ["1", "1", "1.00"],
    ["0,01", "0.01", "0.01"], ["99999,99", "99999.99", "99999.99"], ["00031,40", "31.40", "31.40"],
    [",5", "0.5", "0.50"], [".5", "0.5", "0.50"], ["", null, null],
  ]) {
    const body = toCreateCaseRequest(formSchema.parse({ ...values, weightKg: entered }))
    assert.equal(body.weight_kg, sent)
    let stored, writes = 0
    const transport = new ApiHttpClient({ baseUrl: "https://clinical.example", fetch: async (_, init) => {
      if (init.method === "POST") {
        writes++
        assert.equal(init.headers.get("idempotency-key"), key)
        assert.equal(JSON.parse(init.body).weight_kg, sent)
        stored = { ...clinicalCase, weight_kg: returned }
        return Response.json(stored, { status: 201 })
      }
      assert.equal(init.method, "GET")
      return Response.json(stored)
    } })
    const created = await createCase(body, key, async (_, init) => {
      const result = await createCaseForBff(JSON.parse(init.body), init.headers["Idempotency-Key"],
        (body, idempotencyKey, signal) => transport.request({ method: "post", path: "/api/v1/cases", body, headers: { "Idempotency-Key": idempotencyKey }, signal }))
      return Response.json(result.body, { status: result.status })
    })
    const reopened = await fetchCaseDetail(caseId, { fetchImpl: async () => {
      const result = await getCaseForBff(caseId, (pathParams, signal) => transport.request({ method: "get", path: "/api/v1/cases/{case_id}", pathParams, signal }))
      return Response.json(result.body, { status: result.status })
    } })
    assert.equal(writes, 1)
    assert.equal(created.patient.weightKg, returned)
    assert.equal(reopened.patient.weightKg, returned)
    if (returned !== null) {
      assert.equal(Number(returned), Number(sent))
      assert.equal(new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(Number(reopened.patient.weightKg)),
        entered === "99999,99" ? "99.999,99" : entered === "0,01" ? "0,01" : entered === "1" ? "1" : entered === ",5" || entered === ".5" ? "0,5" : "31,4")
    }
  }
})

test("invalid pasted/typed weights stay invalid instead of becoming a different amount", () => {
  for (const entered of ["0", "0,00", "-31.40", "+31.40", "31.409", "31,409", "1e2", "1E-2", "1.234,56", "1,234.56", "99.999,99", "100000", "99999.999", "31kg", " 31.40 ", ".001", "31,", "NaN", "Infinity"]) {
    const draft = { ...values, weightKg: entered }
    const result = formSchema.safeParse(draft)
    assert.equal(result.success, false, entered)
    assert.equal(result.error.issues.find(issue => issue.path[0] === "weightKg")?.message, "weight", entered)
    assert.equal(draft.weightKg, entered)
  }
})

test("BFF accepts documented number/string/null/omission without converting decimal representation", async () => {
  for (const weight of [31.4, 0.01, 99999.99, "31.40", "31.4", "31", "0.01", "99999.99", null, undefined]) {
    let written
    const candidate = { ...input }
    if (weight === undefined) delete candidate.weight_kg
    else candidate.weight_kg = weight
    const result = await createCaseForBff(candidate, key, async body => {
      written = body
      return { status: 201, data: { ...clinicalCase, weight_kg: weight === undefined || weight === null ? null : String(weight) } }
    })
    assert.equal(result.status, 201)
    assert.equal(written.weight_kg, weight)
  }
})

test("BFF rejects invalid direct requests before HTTP and preserves weight field feedback", async () => {
  for (const weight of [0, -1, 100000, 0.001, 31.409, NaN, Infinity, true, {}, [], "", "0", "0.00", "-1", "+1", "31,40", "31.400", "1e2", "1E-2", "99999.999", "00031.40", "text"]) {
    const result = await createCaseForBff({ ...input, weight_kg: weight }, key, () => assert.fail("invalid weight must not reach upstream"))
    assert.equal(result.status, 400, String(weight))
    assert.ok(result.body.error.fieldErrors.length > 0)
    assert.ok(result.body.error.fieldErrors.every(issue => issue.field === "weight_kg" && issue.type === "invalid"))
    assert.deepEqual(caseCreateFieldIssues(result.body.error.fieldErrors, false), [{ field: "weightKg", message: "serverField" }])
  }
})

test("malformed, zero and out-of-range response weights fail creation and detail at both trust boundaries", async () => {
  const good = await getCaseForBff(caseId, async () => ({ status: 200, data: clinicalCase }))
  assert.equal(good.status, 200)
  for (const weight of ["0", "0.00", "100000", "99999.999", "-1", "31,40", "31.400", "1E-2", "NaN", "Infinity", "text", "", " 31.40 ", 31.4, undefined]) {
    const returned = { ...clinicalCase, weight_kg: weight }
    assert.equal((await createCaseForBff(input, key, async () => ({ status: 201, data: returned }))).status, 502, String(weight))
    assert.equal((await getCaseForBff(caseId, async () => ({ status: 200, data: returned }))).status, 502, String(weight))
    const invalidBff = { ...good.body, patient: { ...good.body.patient, weightKg: weight } }
    await assert.rejects(createCase(input, key, async () => Response.json(invalidBff, { status: 201 })), error => error instanceof CaseCreateRequestError && error.code === "INVALID_RESPONSE")
    await assert.rejects(fetchCaseDetail(caseId, { fetchImpl: async () => Response.json(invalidBff) }), error => error instanceof CaseDetailRequestError && error.code === "INVALID_RESPONSE")
  }
})

test("weight normalization preserves precision and the same idempotency attempt without rounding", () => {
  const original = prepareCreateAttempt(null, toCreateCaseRequest({ ...values, weightKg: "00031,40" }), () => key)
  const equivalent = prepareCreateAttempt(original, toCreateCaseRequest({ ...values, weightKg: "31.40" }), () => assert.fail("same body must keep key"))
  assert.equal(original, equivalent)
  assert.equal(original.body.weight_kg, "31.40")
  const changed = prepareCreateAttempt(original, toCreateCaseRequest({ ...values, weightKg: "31,41" }), () => "new-key")
  assert.equal(changed.key, "new-key")
  assert.equal(changed.body.weight_kg, "31.41")
  assert.equal(formSchema.safeParse({ ...values, weightKg: "31.405" }).success, false)
})

test("domain weight rejection from the backend reaches the browser as safe field feedback", async () => {
  await assert.rejects(createCase({ ...input, weight_kg: "31.40" }, key, async (_, init) => {
    const result = await createCaseForBff(JSON.parse(init.body), key, async () => ({ status: 422,
      data: { code: "CASE_VALIDATION_ERROR", message: "private storage detail", trace_id: "private-trace", details: { field: "weight_kg" } } }))
    assert.equal(JSON.stringify(result).includes("private"), false)
    return Response.json(result.body, { status: result.status })
  }), error => error instanceof CaseCreateRequestError && error.code === "CASE_VALIDATION_ERROR" && error.fieldErrors[0].field === "weight_kg")
})
