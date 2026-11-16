import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"
import { imagePlanFixture, populatedDocument } from "./fixtures/image-plan.mjs"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) return nextResolve(`${specifier}.ts`, context)
  return nextResolve(specifier, context)
} })

const { confirmedDistanceResult, selectSavedDistances } = await import("../src/features/cases/lib/distance-result.ts")
const { formatDistanceLength } = await import("../src/features/cases/lib/distance-format.ts")
const f = imagePlanFixture()
const plan = f.publicPlan(f.persist({ base_revision: 0, document: { ...f.initial.document, calibration: f.line } }))
const calibration = plan.document.calibration
// Synthetic official-result shapes, not executable backend calculation evidence.
const line = { id: "00000000-0000-4000-8000-000000000910", type: "LINE", start: { x: 0.1, y: 0.2 }, end: { x: 0.6, y: 0.8 }, label: "Stored distance",
  measurement: { status: "CALCULATED", values: { length: 987.654321 }, units: { length: "mm" }, calibration_id: calibration.result.calibration_id } }

test("confirmed distance returns the authoritative value unchanged instead of calculating from endpoints", () => {
  const before = structuredClone(line)
  assert.deepEqual(confirmedDistanceResult(line, calibration), { status: "available", lengthMm: 987.654321 })
  assert.deepEqual(line, before)
})

test("missing or stale calibration and unavailable statuses never become a current measurement", () => {
  const unavailable = (measurement, current = calibration) => confirmedDistanceResult({ ...line, measurement }, current)
  for (const measurement of [undefined, null]) assert.deepEqual(unavailable(measurement), { status: "unavailable", reason: "missing" })
  assert.deepEqual(unavailable(line.measurement, null), { status: "unavailable", reason: "calibration" })
  assert.deepEqual(unavailable(line.measurement, { ...calibration, result: null }), { status: "unavailable", reason: "calibration" })
  assert.deepEqual(unavailable({ ...line.measurement, status: "CALIBRATION_REQUIRED" }), { status: "unavailable", reason: "calibration" })
  assert.deepEqual(unavailable({ ...line.measurement, status: "IMAGE_DIMENSIONS_REQUIRED" }), { status: "unavailable", reason: "dimensions" })
  for (const calibration_id of [undefined, null, "", "f".repeat(64)])
    assert.deepEqual(unavailable({ ...line.measurement, calibration_id }), { status: "unavailable", reason: "outdated" })
})

test("invalid values, statuses and units are unavailable rather than zero or a locally inferred length", () => {
  const variants = [
    ...[undefined, null, NaN, Infinity, -Infinity, -1, 0, "12"].map(length => ({ ...line.measurement, values: { length } })),
    ...[undefined, null, {}].map(values => ({ ...line.measurement, values })),
    ...[undefined, null, {}, { length: "degrees" }, { length: "cm" }].map(units => ({ ...line.measurement, units })),
    { ...line.measurement, status: "UNKNOWN" },
  ]
  for (const measurement of variants) assert.deepEqual(confirmedDistanceResult({ ...line, measurement }, calibration), { status: "unavailable", reason: "invalid" })
})

test("saved distances retain order, identity, labels and geometry while filtering out every non-LINE object", () => {
  const extra = populatedDocument(f).objects.find(object => object.type === "TPLO")
  const missing = { ...line, id: "00000000-0000-4000-8000-000000000911", label: null, measurement: null }
  const document = { ...plan.document, objects: [line, extra, missing] }
  const before = structuredClone(document)
  const selected = selectSavedDistances({ ...plan, document })
  assert.equal(selected.length, 2)
  assert.equal(selected[0].line, line)
  assert.equal(selected[1].line, missing)
  assert.equal(selected[1].result.status, "unavailable")
  assert.deepEqual(document, before)
  const unverified = selectSavedDistances({ ...plan, document }, { readError: true })
  assert.deepEqual(unverified[0].result, { status: "unavailable", reason: "unverified" })
  assert.equal(unverified[0].line, line)
  assert.deepEqual(selectSavedDistances(undefined), [])
})

test("recalibration invalidates the old result immediately and displays only the replacement official value", () => {
  const current = { ...calibration, result: { ...calibration.result, calibration_id: "e".repeat(64) } }
  assert.equal(confirmedDistanceResult(line, current).status, "unavailable")
  const replaced = { ...line, measurement: { ...line.measurement, calibration_id: current.result.calibration_id, values: { length: 43.2109876 } } }
  assert.deepEqual(confirmedDistanceResult(replaced, current), { status: "available", lengthMm: 43.2109876 })
  assert.equal(line.measurement.values.length, 987.654321)
})

test("display uses two decimal millimeters in the active locale without rounding the saved value", () => {
  const number = locale => (value, options) => new Intl.NumberFormat(locale, options).format(value)
  assert.equal(formatDistanceLength(1234.56789, number("pt-BR")), "1.234,57 mm")
  assert.equal(formatDistanceLength(1234.56789, number("en")), "1,234.57 mm")
  assert.equal(formatDistanceLength(1, number("pt-BR")), "1,00 mm")
  assert.equal(formatDistanceLength(0.000001, number("pt-BR")), "< 0,01 mm")
  assert.equal(formatDistanceLength(0.009999, number("en")), "< 0.01 mm")
  assert.equal(formatDistanceLength(0.01, number("pt-BR")), "0,01 mm")
  const value = selectSavedDistances({ ...plan, document: { ...plan.document, objects: [line] } })[0].result.lengthMm
  formatDistanceLength(value, number("pt-BR"))
  assert.equal(value, 987.654321)
})
