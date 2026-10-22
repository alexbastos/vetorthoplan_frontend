import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })

const { createCase, CaseCreateRequestError } = await import("../src/features/cases/services/case-create-api.ts")
const { prepareCreateAttempt, toCreateCaseRequest } = await import("../src/features/cases/lib/new-case-request.ts")
const { createNewCaseFormSchema } = await import("../src/features/cases/schemas/new-case-form.schema.ts")

const messages = Object.fromEntries([
  "ageYears", "ageMonths", "ageLimit", "birthDate", "breedMax", "clinicalNotesMax",
  "patientNameMax", "patientNameRequired", "sexRequired", "speciesMax", "speciesRequired",
  "titleMax", "titleRequired", "weight",
].map((key) => [key, key]))
const valid = {
  title: "  Joelho direito  ", patientName: " Luna ", species: " Canina ",
  breed: "", sex: "female", ageYears: "", ageMonths: "0", birthDate: "", weightKg: "31,40", clinicalNotes: "",
}
const created = {
  id: "00000000-0000-4000-8000-000000000064", title: "Joelho direito",
  patient: { name: "Luna", species: "Canina", breed: null, sex: "FEMALE",
    birthDate: null, approximateAgeMonths: 0, ageSource: "DECLARED", ageReferenceDate: "2026-10-16", weightKg: "31.40" },
  clinicalNotes: null, status: "DRAFT",
  createdAt: "2026-10-16T12:00:00Z", updatedAt: "2026-10-16T12:00:00Z",
}

test("form maps required sex and zero months to the clinical contract", () => {
  const parsed = createNewCaseFormSchema(messages).parse(valid)
  assert.deepEqual(toCreateCaseRequest(parsed), {
    title: "Joelho direito", animal_name: "Luna", species: "Canina",
    breed: null, sex: "FEMALE", birth_date: null, approximate_age_months: 0,
    weight_kg: "31.40", clinical_notes: null,
  })
})

test("form requires an explicit sex selection and maps both available options", () => {
  const schema = createNewCaseFormSchema(messages)
  for (const sex of [undefined, null, "", "other"]) {
    const result = schema.safeParse({ ...valid, sex })
    assert.equal(result.success, false)
    assert.equal(result.error.issues.find((issue) => issue.path[0] === "sex")?.message, "sexRequired")
  }
  for (const [sex, expected] of [["male", "MALE"], ["female", "FEMALE"]]) {
    assert.equal(toCreateCaseRequest(schema.parse({ ...valid, sex })).sex, expected)
  }
})

test("form validates declared years/months and lets a birth date take precedence over the declared draft", () => {
  const schema = createNewCaseFormSchema(messages, () => "2026-10-20")
  assert.equal(schema.safeParse({ ...valid, title: "x".repeat(201) }).success, false)
  assert.equal(schema.safeParse({ ...valid, ageYears: "50", ageMonths: "1" }).success, false)
  assert.equal(schema.safeParse({ ...valid, ageMonths: "12" }).success, false)
  assert.equal(schema.safeParse({ ...valid, ageMonths: "1", birthDate: "2020-01-01" }).success, true)
  assert.equal(toCreateCaseRequest(schema.parse({ ...valid, ageMonths: "1", birthDate: "2020-01-01" })).approximate_age_months, null)
  assert.equal(schema.safeParse({ ...valid, ageMonths: "", birthDate: "2999-01-01" }).success, false)
  assert.equal(schema.safeParse({ ...valid, weightKg: "100000" }).success, false)
  assert.equal(schema.safeParse({ ...valid, weightKg: "31,401" }).success, false)
  assert.equal(schema.safeParse({ ...valid, clinicalNotes: "x".repeat(4001) }).success, false)
  assert.equal(schema.safeParse({ ...valid, ageYears: "50", ageMonths: "0", weightKg: "99999,99" }).success, true)
  assert.equal(toCreateCaseRequest({ ...valid, weightKg: "00031,40" }).weight_kg, "31.40")
})

test("an ambiguous retry reuses the exact body and key; an edit starts a new attempt", () => {
  const body = toCreateCaseRequest(valid)
  let issued = 0
  const createKey = () => `key-${++issued}`
  const first = prepareCreateAttempt(null, body, createKey)
  const retry = prepareCreateAttempt(first, toCreateCaseRequest({ ...valid }), createKey)
  const edited = prepareCreateAttempt(retry, toCreateCaseRequest({ ...valid, title: "Outro título" }), createKey)
  assert.equal(retry, first)
  assert.equal(edited.key, "key-2")
  assert.equal(issued, 2)
})

test("create sends a stable caller-provided key to the same-origin BFF and reads DRAFT", async () => {
  const calls = []
  const input = toCreateCaseRequest(valid)
  const key = "00000000-0000-4000-8000-000000000123"
  const result = await createCase(input, key, async (url, options) => {
    calls.push({ url, options })
    return Response.json(created, { status: 201 })
  })
  assert.deepEqual(result, created)
  assert.equal(calls[0].url, "/api/cases")
  assert.equal(calls[0].options.method, "POST")
  assert.equal(calls[0].options.credentials, "same-origin")
  assert.equal(calls[0].options.headers["Idempotency-Key"], key)
  assert.deepEqual(JSON.parse(calls[0].options.body), input)
})

test("create exposes safe field errors and preserves retryable network failures", async () => {
  const input = toCreateCaseRequest(valid)
  await assert.rejects(createCase(input, "key", async () => Response.json({ error: {
    code: "REQUEST_VALIDATION_ERROR", retryable: false,
    fieldErrors: [{ field: "title", type: "string_too_short" }],
  } }, { status: 422 })), (error) => error instanceof CaseCreateRequestError
    && error.code === "REQUEST_VALIDATION_ERROR" && error.fieldErrors[0].field === "title")
  await assert.rejects(createCase(input, "key", async () => { throw new Error("offline") }),
    (error) => error instanceof CaseCreateRequestError && error.code === "NETWORK_ERROR" && error.retryable)
})
