import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript," }
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })

const { ageMonthsAtDate, parseDeclaredAge, splitAgeMonths, utcDateOnly } = await import("../src/features/cases/lib/case-age.ts")
const { createNewCaseFormSchema } = await import("../src/features/cases/schemas/new-case-form.schema.ts")
const { caseCreateFieldIssues, prepareCreateAttempt, toCreateCaseRequest } = await import("../src/features/cases/lib/new-case-request.ts")
const { createCase, CaseCreateRequestError } = await import("../src/features/cases/services/case-create-api.ts")
const { fetchCaseDetail, CaseDetailRequestError } = await import("../src/features/cases/services/case-detail-api.ts")
const { createCaseForBff } = await import("../src/lib/server/case-create-bff.ts")
const { getCaseForBff, parseClinicalCaseDetail } = await import("../src/lib/server/case-detail-bff.ts")

const messages = Object.fromEntries([
  "ageYears", "ageMonths", "ageLimit", "birthDate", "breedMax", "clinicalNotesMax", "patientNameMax",
  "patientNameRequired", "sexRequired", "speciesMax", "speciesRequired", "titleMax", "titleRequired", "weight",
].map(key => [key, key]))
const values = { title: "Caso sintético", patientName: "Paciente 01", species: "Canina", sex: "female",
  breed: "", weightKg: "", clinicalNotes: "", birthDate: "", ageYears: "", ageMonths: "" }
const caseId = "00000000-0000-4000-8000-000000000064"
const key = "00000000-0000-4000-8000-000000000099"
const clinicalCase = { id: caseId, tenant_id: "00000000-0000-4000-8000-000000000001",
  created_by: "00000000-0000-4000-8000-000000000002", title: values.title, animal_name: values.patientName,
  species: values.species, sex: "FEMALE", breed: null, weight_kg: null, clinical_notes: null, status: "DRAFT",
  birth_date: "2022-10-21", approximate_age_months: 47, age_source: "BIRTH_DATE", age_reference_date: "2026-10-20",
  created_at: "2026-10-20T23:59:59Z", updated_at: "2026-10-20T23:59:59Z" }

test("age preview uses completed calendar months through birthdays, month ends and leap years", () => {
  for (const [birth, reference, expected] of [
    ["2022-10-21", "2026-10-20", 47], ["2022-10-21", "2026-10-21", 48],
    ["2022-10-21", "2026-10-22", 48], ["2026-10-20", "2026-10-20", 0],
    ["2026-01-31", "2026-02-28", 0], ["2026-01-31", "2026-03-01", 1],
    ["2024-02-29", "2025-02-28", 11], ["2024-02-29", "2025-03-01", 12],
    ["2025-12-31", "2026-01-30", 0], ["2025-12-31", "2026-01-31", 1],
    ["0099-01-01", "0100-01-01", 12], ["2000-02-29", "2000-03-29", 1],
  ]) assert.equal(ageMonthsAtDate(birth, reference), expected, `${birth} → ${reference}`)
  for (const birth of ["2026-10-21", "2025-02-29", "2100-02-29", "0000-01-01", "2026-04-31", "2026-13-01", "bad"]) {
    assert.equal(ageMonthsAtDate(birth, "2026-10-20"), null, birth)
  }
  assert.equal(ageMonthsAtDate("2020-01-01", "bad"), null)
})

test("preview uses explicit UTC dates rather than elapsed hours or browser timezone", () => {
  assert.equal(utcDateOnly(new Date("2026-10-20T23:30:00-03:00")), "2026-10-21")
  assert.equal(utcDateOnly(new Date("2026-10-21T02:30:00Z")), "2026-10-21")
  assert.equal(ageMonthsAtDate("2026-03-08", "2026-04-08"), 1)
})

test("declared age preserves unknown, zero and subyear precision and converts years/months to HTTP months", () => {
  const schema = createNewCaseFormSchema(messages, () => "2026-10-20")
  for (const [years, months, expected] of [["", "", null], ["0", "", 0], ["", "0", 0], ["", "7", 7],
    ["4", "2", 50], ["4", "", 48], ["49", "11", 599], ["50", "0", 600]]) {
    const body = toCreateCaseRequest(schema.parse({ ...values, ageYears: years, ageMonths: months }))
    assert.equal(body.approximate_age_months, expected)
    assert.equal(body.birth_date, null)
  }
  assert.deepEqual(parseDeclaredAge("", ""), { kind: "unknown" })
  assert.deepEqual(splitAgeMonths(null), null)
  assert.deepEqual(splitAgeMonths(0), { years: 0, months: 0 })
  assert.deepEqual(splitAgeMonths(50), { years: 4, months: 2 })
  assert.deepEqual(splitAgeMonths(601), { years: 50, months: 1 })
  assert.equal(splitAgeMonths(-1), null)
})

test("declared-age errors point at the editable part; the 600-month cap applies to declared age", () => {
  const schema = createNewCaseFormSchema(messages, () => "2026-10-20")
  for (const [years, months, field, message] of [["-1", "", "ageYears", "ageYears"],
    ["1.5", "", "ageYears", "ageYears"], ["1e1", "", "ageYears", "ageYears"],
    ["4", "12", "ageMonths", "ageMonths"], ["", "-1", "ageMonths", "ageMonths"],
    ["", "1.5", "ageMonths", "ageMonths"], ["50", "1", "ageMonths", "ageLimit"],
    ["51", "0", "ageYears", "ageLimit"], ["9007199254740992", "0", "ageYears", "ageLimit"]]) {
    const result = schema.safeParse({ ...values, ageYears: years, ageMonths: months })
    assert.equal(result.success, false)
    assert.deepEqual(result.error.issues.map(issue => [issue.path[0], issue.message]), [[field, message]])
  }
  assert.equal(schema.safeParse({ ...values, birthDate: "1900-01-01" }).success, true)
})

test("a known birth date is the sole age input sent by the form; clearing it restores the declared draft", () => {
  let reference = "2026-10-20"
  const schema = createNewCaseFormSchema(messages, () => reference)
  const draft = { ...values, ageYears: "4", ageMonths: "2" }
  const withBirth = { ...draft, birthDate: "2022-10-21" }
  const original = structuredClone(withBirth)
  const first = toCreateCaseRequest(schema.parse(withBirth))
  assert.equal(first.birth_date, "2022-10-21")
  assert.equal(first.approximate_age_months, null)
  assert.equal(ageMonthsAtDate(withBirth.birthDate, reference), 47)
  reference = "2026-10-21"
  assert.equal(ageMonthsAtDate(withBirth.birthDate, reference), 48)
  assert.deepEqual(toCreateCaseRequest(schema.parse(withBirth)), first)
  assert.deepEqual(withBirth, original)
  assert.equal(toCreateCaseRequest(schema.parse({ ...withBirth, birthDate: "" })).approximate_age_months, 50)
  assert.equal(schema.safeParse({ ...values, birthDate: "2026-10-22" }).success, false)
})

test("BFF forwards birth only, declared age only, unknown age and both fields without its obsolete exclusivity rule", async () => {
  const forms = [{ birth_date: "2022-10-21", approximate_age_months: null },
    { birth_date: null, approximate_age_months: 0 },
    { birth_date: null, approximate_age_months: null },
    { birth_date: "2022-10-21", approximate_age_months: 47 }]
  for (const fields of forms) {
    const body = { ...toCreateCaseRequest(values), ...fields }
    const result = await createCaseForBff(body, key, async (received, receivedKey) => {
      assert.deepEqual(received, body)
      assert.equal(receivedKey, key)
      return { status: 201, data: clinicalCase }
    })
    assert.equal(result.status, 201)
    assert.equal(result.body.patient.ageReferenceDate, "2026-10-20")
  }
})

test("a domain age mismatch crosses BFF/browser as safe 422 field feedback without an automatic resubmit", async () => {
  let writes = 0
  const body = { ...toCreateCaseRequest(values), birth_date: "2022-10-21", approximate_age_months: 48 }
  const unchanged = structuredClone(body)
  await assert.rejects(createCase(body, key, async (_, init) => {
    const result = await createCaseForBff(JSON.parse(init.body), init.headers["Idempotency-Key"], async (received) => {
      writes++
      assert.equal(received.approximate_age_months, 48)
      return { status: 422, data: { code: "CASE_VALIDATION_ERROR", message: "private", trace_id: "private-trace",
        details: { field: "approximate_age_months" } } }
    })
    assert.equal(JSON.stringify(result).includes("private"), false)
    return Response.json(result.body, { status: result.status })
  }), error => {
    assert.ok(error instanceof CaseCreateRequestError)
    assert.equal(error.code, "CASE_VALIDATION_ERROR")
    assert.equal(error.retryable, false)
    assert.deepEqual(caseCreateFieldIssues(error.fieldErrors, false), [
      { field: "ageMonths", message: "serverField" }, { field: "ageYears", message: "serverField" },
    ])
    assert.deepEqual(caseCreateFieldIssues(error.fieldErrors, true).at(-1), { field: "birthDate", message: "serverBirthAge" })
    return true
  })
  assert.equal(writes, 1)
  assert.deepEqual(body, unchanged)
  assert.deepEqual(caseCreateFieldIssues([{ field: "tenant_id" }], true), [])
})

test("a response lost before midnight replays the exact birth-only body/key and keeps the original backend age reference", async () => {
  let reference = "2026-10-20"
  const schema = createNewCaseFormSchema(messages, () => reference)
  const birthValues = { ...values, birthDate: "2022-10-21" }
  const attempt = prepareCreateAttempt(null, toCreateCaseRequest(schema.parse(birthValues)), () => key)
  let createdCount = 0, responses = 0
  const saved = new Map()
  const fetchImpl = async (_, init) => {
    const result = await createCaseForBff(JSON.parse(init.body), init.headers["Idempotency-Key"], async (body, receivedKey) => {
      const record = saved.get(receivedKey)
      if (record) {
        assert.deepEqual(body, record.body)
        return { status: 201, data: record.response }
      }
      createdCount++
      saved.set(receivedKey, { body, response: clinicalCase })
      return { status: 201, data: clinicalCase }
    })
    if (++responses === 1) throw new Error("response lost")
    return Response.json(result.body, { status: result.status })
  }
  await assert.rejects(createCase(attempt.body, attempt.key, fetchImpl), error => error.code === "NETWORK_ERROR")
  reference = "2026-10-21"
  const retry = prepareCreateAttempt(attempt, toCreateCaseRequest(schema.parse(birthValues)), () => { throw new Error("new key") })
  assert.equal(retry, attempt)
  const created = await createCase(retry.body, retry.key, fetchImpl)
  assert.equal(createdCount, 1)
  assert.equal(created.patient.approximateAgeMonths, 47)
  assert.equal(created.patient.ageReferenceDate, "2026-10-20")
  const reopened = await fetchCaseDetail(caseId, { fetchImpl: async () => {
    const result = await getCaseForBff(caseId, async () => ({ status: 200, data: clinicalCase }))
    return Response.json(result.body, { status: result.status })
  } })
  assert.deepEqual(reopened, created)
})

test("read projection preserves age origin, reference and unknown without inventing birth dates or recalculating age", async () => {
  for (const [birth, months, source, reference] of [[null, 0, "DECLARED", "2026-10-20"],
    [null, 50, "DECLARED", "2020-01-01"], ["2022-10-21", 47, "BIRTH_DATE", "2026-10-20"],
    [null, null, null, null], ["1900-01-01", 1521, "BIRTH_DATE", "2026-10-20"]]) {
    const record = { ...clinicalCase, sex: null, birth_date: birth, approximate_age_months: months, age_source: source, age_reference_date: reference }
    const projected = parseClinicalCaseDetail(record)
    assert.ok(projected)
    const read = await fetchCaseDetail(caseId, { fetchImpl: async () => Response.json(projected) })
    assert.equal(read.patient.birthDate, birth)
    assert.equal(read.patient.approximateAgeMonths, months)
    assert.equal(read.patient.ageSource, source)
    assert.equal(read.patient.ageReferenceDate, reference)
    assert.equal(read.patient.sex, null)
  }
})

test("new required age metadata rejects malformed or omitted properties at both BFF and browser boundaries", async () => {
  for (const patch of [{ age_source: "ESTIMATED" }, { age_source: undefined }, { age_reference_date: undefined },
    { age_reference_date: "2026-02-30" }, { approximate_age_months: -1 }, { approximate_age_months: 1.5 }]) {
    const result = await getCaseForBff(caseId, async () => ({ status: 200, data: { ...clinicalCase, ...patch } }))
    assert.equal(result.status, 502)
  }
  const publicCase = parseClinicalCaseDetail(clinicalCase)
  for (const patch of [{ ageSource: "ESTIMATED" }, { ageSource: undefined }, { ageReferenceDate: undefined }, { ageReferenceDate: "2026-02-30" }]) {
    await assert.rejects(fetchCaseDetail(caseId, { fetchImpl: async () => Response.json({ ...publicCase, patient: { ...publicCase.patient, ...patch } }) }),
      error => error instanceof CaseDetailRequestError && error.code === "INVALID_RESPONSE")
  }
})
