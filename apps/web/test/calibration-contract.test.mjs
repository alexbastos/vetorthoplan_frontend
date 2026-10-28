import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import test from "node:test"

// Recorded by executing the pinned backend source, not a browser-side scale implementation.
const fixture = JSON.parse(readFileSync(new URL("../../../docs/testing/calibration-contract-fixtures-2026-10-23.json", import.meta.url), "utf8"))
const contractBytes = readFileSync(new URL("../../../docs/openapi/clinical-api.openapi.json", import.meta.url))
const contract = JSON.parse(contractBytes)
const capturedContractBytes = readFileSync(new URL("../../../docs/openapi/clinical-api.duplicate-2026-10-23.openapi.json", import.meta.url))
const capturedContract = JSON.parse(capturedContractBytes)
const cases = new Map(fixture.cases.map(item => [item.id, item]))
const result = id => cases.get(id).output.calibration.result
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= 1e-10 * Math.max(1, Math.abs(expected)))

test("calibration evidence retains its original contract and pinned source while current calibration schemas remain compatible", () => {
  // Do not rewrite a historical capture's hash to claim it executed new backend
  // code. Its preserved contract stays the source of the recorded results.
  assert.equal(fixture.openApiSha256, createHash("sha256").update(capturedContractBytes).digest("hex"))
  assert.equal(fixture.backendRevision, "279139d4c1ea795bd26578e3595f5e38b14b4712")
  assert.match(fixture.backendSourceSha256, /^[0-9a-f]{64}$/)
  assert.equal(fixture.matchingSchemas.length, 7)
  for (const name of fixture.matchingSchemas) {
    if (name === "PlanDocument") {
      const { radiographic_quality: _quality, additional_measurements_input: _input, additional_measurements: _results,
        tplo_correction: _correction, objects, ...properties } = contract.components.schemas[name].properties
      const { objects: originalObjects, ...originalProperties } = capturedContract.components.schemas[name].properties
      assert.deepEqual(properties, originalProperties)
      // New object variants do not change the captured calibration geometry.
      for (const variant of originalObjects.items.oneOf) assert.ok(objects.items.oneOf.some(item => item.$ref === variant.$ref))
      for (const [type, ref] of Object.entries(originalObjects.items.discriminator.mapping)) assert.equal(objects.items.discriminator.mapping[type], ref)
      assert.deepEqual({ ...objects, items: { ...objects.items, oneOf: originalObjects.items.oneOf,
        discriminator: { ...objects.items.discriminator, mapping: originalObjects.items.discriminator.mapping } } }, originalObjects)
    } else assert.deepEqual(contract.components.schemas[name], capturedContract.components.schemas[name], name)
  }
  assert.deepEqual(contract.paths["/api/v1/images/{image_id}/plan"], capturedContract.paths["/api/v1/images/{image_id}/plan"])
  assert.equal(cases.size, 10)
})

test("published calibration accepts normalized inclusive edges, bounded millimetres and revision-based full plan writes", () => {
  const schemas = contract.components.schemas
  for (const axis of ["x", "y"]) {
    assert.equal(schemas.PlanPoint.properties[axis].minimum, 0)
    assert.equal(schemas.PlanPoint.properties[axis].maximum, 1)
  }
  for (const [name, field] of [["PlanReferenceLineCalibration", "known_length_mm"], ["PlanReferenceCircleCalibration", "known_diameter_mm"]]) {
    assert.equal(schemas[name].properties[field].exclusiveMinimum, 0)
    assert.equal(schemas[name].properties[field].maximum, 10000)
    assert.ok(schemas[name].required.includes(field))
  }
  assert.deepEqual(schemas.SaveImagePlanRequest.required, ["base_revision", "document"])
  assert.equal(schemas.SaveImagePlanRequest.properties.base_revision.minimum, 0)
  const path = contract.paths["/api/v1/images/{image_id}/plan"]
  for (const method of ["get", "put"]) for (const code of [200, 404, 409, 422]) assert.ok(path[method].responses[code])
})

test("backend calibration uses each original dimension before taking the distance on rectangular images", () => {
  close(result("horizontal").reference_length_px, 1000)
  close(result("vertical").reference_length_px, 500)
  close(result("diagonal").reference_length_px, Math.hypot(1000, 500))
  close(result("horizontal").mm_per_pixel, 0.05)
  close(result("vertical").mm_per_pixel, 0.1)
  // The same half-width reference is only 500 px on a 1000x500 preview.
  assert.notEqual(result("horizontal").reference_length_px, 500)
})

test("the right border maps to full source width rather than the last pixel index", () => {
  close(result("full-width-edges").reference_length_px, 2000)
  assert.notEqual(result("full-width-edges").reference_length_px, 1999)
})

test("circle edge describes a radius and calibration uses its diameter, including non-square image dimensions", () => {
  const horizontal = cases.get("circle-horizontal")
  const vertical = cases.get("circle-vertical")
  assert.notEqual(horizontal.input.calibration.edge.x - 0.5, vertical.input.calibration.edge.y - 0.5)
  close(result("circle-horizontal").reference_length_px, 250)
  close(result("circle-vertical").reference_length_px, 250)
  close(result("circle-horizontal").mm_per_pixel, 20 / 250)
  close(result("circle-vertical").mm_per_pixel, 20 / 250)
})

test("backend discards a forged client result and computes the same reference fingerprint", () => {
  assert.equal(cases.get("forged-client-result").input.calibration.result.mm_per_pixel, 999)
  assert.deepEqual(result("forged-client-result"), result("horizontal"))
  assert.match(result("horizontal").calibration_id, /^[0-9a-f]{64}$/)
})

test("changing reference or source dimensions changes the fingerprint and derived scale", () => {
  for (const id of ["changed-reference", "changed-source-dimensions"]) {
    assert.notEqual(result(id).calibration_id, result("horizontal").calibration_id)
  }
  close(result("changed-reference").mm_per_pixel, 0.1)
  close(result("changed-source-dimensions").mm_per_pixel, 0.025)
})

test("missing original dimensions cannot be presented as a calculated calibration", () => {
  const missing = cases.get("missing-dimensions")
  assert.equal(missing.widthPx, null)
  assert.equal(missing.output.calibration.result, undefined)
  for (const item of fixture.cases.filter(item => item.widthPx && item.heightPx)) {
    const computed = item.output.calibration.result
    assert.ok(computed.reference_length_px > 0 && Number.isFinite(computed.reference_length_px))
    assert.ok(computed.mm_per_pixel > 0 && Number.isFinite(computed.mm_per_pixel))
  }
})
