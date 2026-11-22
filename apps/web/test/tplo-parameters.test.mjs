import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"
import { QueryClient } from "@tanstack/react-query"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (!context.parentURL?.includes("/node_modules/") && specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) return nextResolve(`${specifier}.ts`, context)
  return nextResolve(specifier, context)
} })
const { tploParameterFields, parseTploParameterFields, tploParameterPatch } = await import("../src/features/cases/lib/tplo-parameters.ts")
const { tploDraftHasChanges, tploCommandFromDraft } = await import("../src/features/cases/lib/tplo-draft.ts")
const { tploOfficialTpa, readTploCorrection, tploTableMatch } = await import("../src/features/cases/lib/tplo-correction.ts")
const { applyPlanCommand } = await import("../src/features/cases/schemas/image-plan-command.schema.ts")
const { requestPlanEditSave, checkImagePlanSave } = await import("../src/features/cases/lib/image-plan-saving.ts")
const { casesQueryKeys: keys } = await import("../src/features/cases/hooks/cases-query-keys.ts")
const imageId = "a4302086-7b81-482d-a11a-b9f4b29e11b0", caseId = "a4302086-7b81-482d-a11a-b9f4b29e11b1"
const metadata = { laterality: "RIGHT", projection: "MEDIOLATERAL", blade_diameter_mm: 24, current_slope_degrees: 0, target_slope_degrees: 5,
  image_quality: "ACCEPTABLE", eligibility: "ELIGIBLE", eligibility_reasons: ["keep"], notes: "keep" }
const plan = () => ({ imageId, revision: 4, updatedAt: "2026-11-18T12:00:00Z", document: { schema_version: 1, calibration: null, tplo: metadata,
  objects: [{ id: imageId, type: "TPLO", center: { x: 0.5, y: 0.5 }, edge: { x: 0.6, y: 0.5 }, rotation_degrees: -25, fragment: null, label: null, visible: true, locked: false }] } })

test("parameter fields keep exact numbers, explicit side, omission and numeric null semantics", () => {
  const initial = tploParameterFields(null)
  assert.equal(initial.laterality, "")
  assert.equal(initial.current_slope_degrees, "")
  assert.equal(parseTploParameterFields(initial).success, false)
  assert.deepEqual(tploParameterPatch({ ...initial, laterality: "LEFT", blade_diameter_mm: "24,74", target_slope_degrees: "0" }, null),
    { laterality: "LEFT", target_slope_degrees: 0, blade_diameter_mm: 24.74 })
  assert.deepEqual(tploParameterPatch(tploParameterFields(metadata), metadata), {})
  const cleared = tploParameterPatch({ ...tploParameterFields(metadata), target_slope_degrees: "", blade_diameter_mm: "" }, metadata)
  assert.deepEqual(cleared, { target_slope_degrees: null, blade_diameter_mm: null })
  for (const [key, value] of [["blade_diameter_mm", "0"], ["blade_diameter_mm", "100.001"], ["target_slope_degrees", "90.001"],
    ["current_slope_degrees", "-1"], ["target_slope_degrees", "NaN"], ["blade_diameter_mm", "Infinity"], ["laterality", "UNKNOWN"]])
    assert.equal(parseTploParameterFields({ ...tploParameterFields(metadata), [key]: value }).success, false)
  assert.equal(parseTploParameterFields({ ...tploParameterFields(metadata), blade_diameter_mm: "100", target_slope_degrees: "90" }).success, true)
})

test("invalid form intent remains dirty but never becomes a command; UI fields never enter transport", () => {
  const before = plan(), draft = { kind: "tplo-parameters-set", baseRevision: 4, parameters: {}, parameterFields: { ...tploParameterFields(metadata), blade_diameter_mm: "-" } }
  assert.equal(tploDraftHasChanges(draft, before), true)
  assert.equal(tploCommandFromDraft(draft), null)
  draft.parameterFields.blade_diameter_mm = "30"
  draft.parameters = tploParameterPatch(draft.parameterFields, metadata)
  assert.deepEqual(tploCommandFromDraft(draft), { kind: "tplo-parameters-set", baseRevision: 4, parameters: { blade_diameter_mm: 30 } })
  const document = applyPlanCommand(before.document, tploCommandFromDraft(draft))
  assert.deepEqual(document.objects, before.document.objects)
  assert.equal(document.tplo.current_slope_degrees, 0)
  for (const key of ["image_quality", "eligibility", "eligibility_reasons", "notes"]) assert.deepEqual(document.tplo[key], metadata[key])
})

test("official TPA preserves 0 and 90, rejects read/dimension/method issues, and never uses a current-slope replacement", () => {
  const before = plan()
  before.document.tplo_landmarks = { method: "MEDIAL_CONDYLE_CRANIAL_CRUCIATE_FULL_AXIS_V1", plateau_cranial: { x: 0.1, y: 0.1 },
    plateau_caudal: { x: 0.2, y: 0.1 }, intercondylar_midpoint: { x: 0.1, y: 0.2 }, talus_center: { x: 0.2, y: 0.2 } }
  const context = { dimensionsAvailable: true, expectedImageId: imageId }
  for (const degrees of [0, 90, 24.74123456789]) {
    before.document.tplo_measurement = { method: before.document.tplo_landmarks.method, status: "CALCULATED", tpa_degrees: degrees }
    assert.equal(tploOfficialTpa(before, context), degrees)
  }
  for (const change of [{ readError: true }, { dimensionsAvailable: false }, { anisotropic: true }, { expectedImageId: caseId }])
    assert.equal(tploOfficialTpa(before, { ...context, ...change }), null)
  before.document.tplo_measurement.method = "CONVENTIONAL_FULL_MECHANICAL_AXIS_V1"
  assert.equal(tploOfficialTpa(before, context), null)
})

test("table reads require exact echoed filters and row numbers without rounding or an invented recommendation", () => {
  const filters = { tpa_degrees: 24.74123456789, blade_diameter_mm: 24 }
  const table = { configured: true, table_version: "v1", source: "fixture", query: filters, match_count: 1,
    entries: [{ ...filters, rotation_mm: 8.4 }], recommendation_enabled: false }
  assert.deepEqual(tploTableMatch(table, filters), { status: "match", rotationMm: 8.4 })
  assert.equal(tploTableMatch({ ...table, entries: [{ ...filters, tpa_degrees: 25, rotation_mm: 8.4 }] }, filters).status, "invalid")
  assert.equal(tploTableMatch({ ...table, query: { ...filters, blade_diameter_mm: 30 } }, filters).status, "invalid")
  assert.equal(tploTableMatch({ ...table, match_count: 0, entries: [] }, filters).status, "noMatch")
  assert.equal(tploTableMatch({ ...table, configured: false, match_count: 0, entries: [] }, filters).status, "notConfigured")
  assert.equal(tploTableMatch({ ...table, match_count: 2, entries: [...table.entries, ...table.entries] }, filters).status, "ambiguous")
  assert.equal(tploTableMatch({ ...table, entries: [{ ...filters, rotation_mm: Infinity }] }, filters).status, "invalid")
})

test("review 10: an unconfigured table with an empty optional query stays a configuration state", () => {
  assert.equal(tploTableMatch({ configured: false, table_version: null, source: null, query: {}, match_count: 0, entries: [] },
    { tpa_degrees: 0, blade_diameter_mm: 24 }).status, "notConfigured")
})


test("saved correction remains a separate official read with backend states and coherence checks", () => {
  const before = plan()
  for (const status of ["LANDMARKS_REQUIRED", "BLADE_DIAMETER_REQUIRED", "ROTATION_TABLE_NOT_CONFIGURED", "EXACT_TABLE_MATCH_REQUIRED", "TARGET_SLOPE_MISMATCH", "TARGET_SLOPE_REQUIRED"]) {
    before.document.tplo_correction = { status, acceptance: "NOT_ASSESSED", clinically_validated: false }
    assert.equal(readTploCorrection(before, null).correction.status, status)
  }
  before.document.tplo_correction = { status: "CALCULATED", preoperative_tpa_degrees: 0, blade_diameter_mm: 24, target_slope_degrees: 5,
    rotation_mm: 8.4, table_version: "old-table", acceptance: "PASS", clinically_validated: false }
  assert.equal(readTploCorrection(before, 0).correction.rotation_mm, 8.4)
  assert.equal(readTploCorrection(before, 0, true).reason, "unverified")
  assert.equal(readTploCorrection(before, 25).reason, "outdated")
  before.document.tplo_correction.rotation_mm = NaN
  assert.equal(readTploCorrection(before, 0).reason, "invalid")
})

test("parameter writer performs one restricted PATCH, clears only its matching draft and preserves geometry without calibration", async () => {
  const client = new QueryClient(), before = plan(), identity = { caseId, imageId }
  const command = { kind: "tplo-parameters-set", baseRevision: 4, parameters: { blade_diameter_mm: 30 } }
  client.setQueryData(keys.imagePlan(caseId, imageId), before)
  client.setQueryData(keys.imageTploDraft(caseId, imageId), { ...command, parameterFields: tploParameterFields(metadata, command.parameters) })
  const calls = []
  try {
    const result = await requestPlanEditSave(client, identity, command, { fetchImpl: async (url, init) => {
      calls.push(init.method); assert.equal(init.method, "PATCH"); assert.ok(url.endsWith("/plan/edits")); assert.deepEqual(JSON.parse(init.body), command)
      return Response.json({ ...before, revision: 5, document: applyPlanCommand(before.document, command) })
    } })
    assert.equal(result.phase, "saved")
    assert.deepEqual(calls, ["PATCH"])
    assert.equal(client.getQueryData(keys.imageTploDraft(caseId, imageId)), null)
    assert.deepEqual(client.getQueryData(keys.imagePlan(caseId, imageId)).document.objects, before.document.objects)
  } finally { client.clear() }
})

test("a lost parameter response is recovered by GET without repeating PATCH and a conflict keeps the intended patch", async () => {
  for (const conflict of [false, true]) {
    const client = new QueryClient(), before = plan(), identity = { caseId, imageId }
    const command = { kind: "tplo-parameters-set", baseRevision: 4, parameters: { target_slope_degrees: null } }, calls = []
    client.setQueryData(keys.imagePlan(caseId, imageId), before)
    client.setQueryData(keys.imageTploDraft(caseId, imageId), command)
    const fetchImpl = async (_, init) => {
      calls.push(init.method)
      if (init.method === "PATCH") {
        if (conflict) return Response.json({ error: { code: "PLAN_REVISION_CONFLICT", currentRevision: 5 } }, { status: 409 })
        throw Error("response lost")
      }
      return Response.json({ ...before, revision: 5, document: applyPlanCommand(before.document, command) })
    }
    try {
      const result = await requestPlanEditSave(client, identity, command, { fetchImpl })
      if (conflict) {
        assert.equal(result.phase, "conflict")
        assert.deepEqual(client.getQueryData(keys.imageTploDraft(caseId, imageId)), command)
      } else if (result.phase !== "saved") assert.equal((await checkImagePlanSave(client, identity, command, { fetchImpl })).phase, "saved")
      assert.equal(calls.filter(method => method === "PATCH").length, 1)
      if (!conflict) assert.ok(calls.includes("GET"))
    } finally { client.clear() }
  }
})
