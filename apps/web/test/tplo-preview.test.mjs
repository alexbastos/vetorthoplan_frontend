import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) return nextResolve(`${specifier}.ts`, context)
  return nextResolve(specifier, context)
} })
const { tploValuesPreview, tploSvgMatrix } = await import("../src/features/cases/lib/tplo-preview.ts")
const { beginTploRotation, tploRotationFromPointer, tploRotationFromKeyboard, tploRotationHandle } = await import("../src/features/cases/lib/tplo-rotation.ts")
const { selectSavedTplo } = await import("../src/features/cases/lib/tplo-result.ts")
const dimensions = { widthPx: 1000, heightPx: 2000 }, calibration = { result: { mm_per_pixel: 0.1, calibration_id: "a".repeat(64) } }
const geometry = { center: { x: 0.5, y: 0.5 }, edge: { x: 0.6, y: 0.5 },
  fragment: [{ x: 0.6, y: 0.5 }, { x: 0.5, y: 0.6 }, { x: 0.4, y: 0.5 }], fragmentClosed: true }
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * 1e-10, `${actual} != ${expected}`)

test("rectangular original pixels produce the analytic 0, signed 90 and signed 180 degree results", () => {
  const expected = new Map([[0, [[600, 1000], [500, 1200], [400, 1000]]], [90, [[500, 1100], [300, 1000], [500, 900]]],
    [-90, [[500, 900], [700, 1000], [500, 1100]]], [180, [[400, 1000], [500, 800], [600, 1000]]], [-180, [[400, 1000], [500, 800], [600, 1000]]]])
  const before = structuredClone(geometry)
  for (const [degrees, points] of expected) {
    const result = tploValuesPreview(geometry, degrees, dimensions, calibration)
    assert.equal(result.simulation.status, "available")
    close(result.measurement.radiusMm, 10)
    assert.equal(result.measurement.rotationDegrees, degrees)
    result.simulation.pointsPx.forEach((point, i) => { close(point.x, points[i][0]); close(point.y, points[i][1]) })
  }
  assert.deepEqual(geometry, before)
})

test("off-center pivot, output outside the matrix and recalibration preserve the original geometric convention", () => {
  const offCenter = { ...geometry, center: { x: 0.25, y: 0.25 }, edge: { x: 0.35, y: 0.25 }, fragment: [{ x: 0.35, y: 0.25 }, { x: 0.25, y: 0.3 }, { x: 0.2, y: 0.25 }] }
  const first = tploValuesPreview(offCenter, 90, dimensions, calibration)
  close(first.simulation.pointsPx[0].x, 250); close(first.simulation.pointsPx[0].y, 600)
  const recalibrated = tploValuesPreview(offCenter, 90, dimensions, { result: { mm_per_pixel: 0.2 } })
  close(recalibrated.measurement.radiusMm, first.measurement.radiusMm * 2)
  assert.deepEqual(recalibrated.simulation, first.simulation)
  const outside = tploValuesPreview({ ...geometry, center: { x: 0.9, y: 0.5 }, edge: { x: 0.8, y: 0.5 }, fragment: [{ x: 0.7, y: 0.5 }, { x: 0.7, y: 0.4 }, { x: 0.8, y: 0.4 }] }, 180, dimensions, calibration)
  close(outside.simulation.pointsPx[0].x, 1100)
  assert.ok(outside.simulation.pointsPx[0].x > dimensions.widthPx)
})

test("missing prerequisites, anisotropic DICOM, incomplete contours and invalid numbers remain unavailable", () => {
  for (const value of [0, -1, Infinity, NaN]) {
    assert.equal(tploValuesPreview(geometry, 0, { ...dimensions, widthPx: value }, calibration).simulation.reason, "dimensions")
    assert.equal(tploValuesPreview(geometry, 0, dimensions, { result: { mm_per_pixel: value } }).simulation.reason, "calibration")
  }
  for (const value of [-181, 181, NaN, Infinity]) assert.equal(tploValuesPreview(geometry, value, dimensions, calibration).simulation.reason, "invalid")
  assert.equal(tploValuesPreview(geometry, 0, dimensions, calibration, { issue: "anisotropy" }).simulation.reason, "anisotropy")
  assert.equal(tploValuesPreview(geometry, 0, dimensions, calibration, { unverified: true }).simulation.reason, "unverified")
  assert.equal(tploValuesPreview({ ...geometry, fragmentClosed: false }, 0, dimensions, calibration).simulation.reason, "incomplete")
  const noFragment = tploValuesPreview({ ...geometry, fragment: null }, 0, dimensions, calibration)
  assert.equal(noFragment.measurement.status, "available"); assert.equal(noFragment.simulation.reason, "fragment")
  assert.equal(tploValuesPreview({ ...geometry, fragment: Array(501).fill(geometry.fragment[0]) }, 0, dimensions, calibration).simulation.reason, "invalid")
  assert.equal(tploValuesPreview({ ...geometry, fragment: [{ x: 1.1, y: 0.5 }, ...geometry.fragment] }, 0, dimensions, calibration).simulation.reason, "invalid")
})

test("500 points and degenerate input are preserved without simplification or cumulative rotation", () => {
  const source = { ...geometry, fragment: Array.from({ length: 500 }, (_, i) => ({ x: i / 500, y: 0.4 })) }
  const before = structuredClone(source), once = tploValuesPreview(source, 37.123456789, dimensions, calibration)
  for (let i = 0; i < 20; i++) {
    tploValuesPreview(source, -95, dimensions, calibration)
    assert.deepEqual(tploValuesPreview(source, 37.123456789, dimensions, calibration), once)
  }
  assert.equal(once.simulation.pointsPx.length, 500)
  assert.deepEqual(source, before)
})

test("SVG matrix ordering and official-result validation agree with the analytic backend convention", () => {
  assert.equal(tploSvgMatrix([[0, -1, 1500], [1, 0, 500]]), "matrix(0 1 -1 0 1500 500)")
  const object = { id: "a4302086-7b81-482d-a11a-b9f4b29e11b0", type: "TPLO", center: geometry.center, edge: geometry.edge,
    rotation_degrees: 90, fragment: { points: geometry.fragment }, measurement: { status: "CALCULATED", calibration_id: calibration.result.calibration_id,
      values: { radius: 10, rotation: 90 }, units: { radius: "mm", rotation: "degrees" } }, simulation: { status: "SIMULATED",
      calibration_id: calibration.result.calibration_id, affine_matrix: [[0, -1, 1500], [1, 0, 500]],
      transformed_fragment_points_px: [{ x: 500, y: 1100 }, { x: 300, y: 1000 }, { x: 500, y: 900 }] } }
  const [saved] = selectSavedTplo({ imageId: object.id, revision: 1, document: { objects: [object], calibration } }, { dimensions })
  assert.equal(saved.simulation.status, "available")
  const preview = tploValuesPreview(geometry, 90, dimensions, calibration)
  saved.simulation.pointsPx.forEach((point, i) => { close(preview.simulation.pointsPx[i].x, point.x); close(preview.simulation.pointsPx[i].y, point.y) })
})

test("rotation gestures use the original pivot and commit angles only, including wrap and zero", () => {
  const drag = beginTploRotation({ x: 500, y: 1000 }, 0, { x: 600, y: 1000 })
  close(tploRotationFromPointer(drag, { x: 500, y: 1100 }), 90)
  close(tploRotationFromPointer(drag, { x: 500, y: 900 }), -90)
  close(tploRotationFromPointer(drag, { x: 600, y: 1000 }), 0)
  assert.equal(tploRotationFromPointer(drag, { x: 500, y: 1000 }), null)
  assert.equal(beginTploRotation({ x: 0, y: 0 }, 181, { x: 1, y: 0 }), null)
  assert.equal(beginTploRotation({ x: 0, y: 0 }, 0, { x: 0, y: 0 }), null)
  close(tploRotationFromPointer(beginTploRotation({ x: 0, y: 0 }, 170, { x: 1, y: 0 }), { x: 0, y: 1 }), -100)
})

test("rotation handle and keyboard use screen-size padding, 1/10 degree steps and inclusive signed bounds", () => {
  const pixels = { center: { x: 500, y: 1000 }, edge: { x: 600, y: 1000 }, fragment: null }
  assert.deepEqual(tploRotationHandle(pixels, 0, 1), { x: 624, y: 1000 })
  close(tploRotationHandle(pixels, 90, 2).x, 500); close(tploRotationHandle(pixels, 90, 2).y, 1112)
  assert.equal(tploRotationFromKeyboard(0, { key: "ArrowRight", shiftKey: false }), 1)
  assert.equal(tploRotationFromKeyboard(0, { key: "ArrowDown", shiftKey: true }), -10)
  assert.equal(tploRotationFromKeyboard(175, { key: "ArrowUp", shiftKey: true }), 180)
  assert.equal(tploRotationFromKeyboard(-175, { key: "ArrowLeft", shiftKey: true }), -180)
})
