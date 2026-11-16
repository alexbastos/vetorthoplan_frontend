import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"
import { imagePlanFixture } from "./fixtures/image-plan.mjs"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) return nextResolve(`${specifier}.ts`, context)
  return nextResolve(specifier, context)
} })

const { distanceLengthPreview } = await import("../src/features/cases/lib/distance-preview.ts")
const f = imagePlanFixture()
const persistedCalibration = input => f.persist({ base_revision: 0,
  document: { ...f.initial.document, calibration: input } }).document.calibration
const lineCalibration = persistedCalibration(f.line)
const circleCalibration = persistedCalibration(f.circle)
const dimensions = { widthPx: 2000, heightPx: 1000 }
const geometry = (start, end) => ({ start, end })
const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * 1e-12,
  `expected ${actual} to be close to ${expected}`)

test("uses original rectangular image dimensions for horizontal, vertical and diagonal lines", () => {
  const scale = lineCalibration.result.mm_per_pixel
  closeTo(distanceLengthPreview(geometry({ x: 0.1, y: 0.4 }, { x: 0.6, y: 0.4 }), dimensions, lineCalibration), 1000 * scale)
  closeTo(distanceLengthPreview(geometry({ x: 0.4, y: 0.2 }, { x: 0.4, y: 0.8 }), dimensions, lineCalibration), 600 * scale)
  closeTo(distanceLengthPreview(geometry({ x: 0.2, y: 0.2 }, { x: 0.7, y: 0.8 }), dimensions, lineCalibration), Math.hypot(1000, 600) * scale)
})

test("uses the persisted mm-per-pixel result for both line and circle calibrations", () => {
  assert.ok(Number.isFinite(lineCalibration.result.mm_per_pixel) && lineCalibration.result.mm_per_pixel > 0)
  assert.ok(Number.isFinite(circleCalibration.result.mm_per_pixel) && circleCalibration.result.mm_per_pixel > 0)
  assert.notEqual(lineCalibration.result.mm_per_pixel, circleCalibration.result.mm_per_pixel)
  const sample = geometry({ x: 0.1, y: 0.5 }, { x: 0.225, y: 0.5 }) // 250 original pixels
  assert.equal(distanceLengthPreview(sample, dimensions, lineCalibration), 250 * lineCalibration.result.mm_per_pixel)
  assert.equal(distanceLengthPreview(sample, dimensions, circleCalibration), 250 * circleCalibration.result.mm_per_pixel)
})

test("allows a temporary coincident-endpoint preview to be exactly zero", () => {
  assert.equal(distanceLengthPreview(geometry({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }), dimensions, lineCalibration), 0)
})

test("rejects missing, non-finite, non-positive or overflowing scale and dimensions", () => {
  const sample = geometry({ x: 0.1, y: 0.2 }, { x: 0.8, y: 0.9 })
  for (const calibration of [undefined, null, { ...lineCalibration, result: null }])
    assert.equal(distanceLengthPreview(sample, dimensions, calibration), null)
  for (const scale of [undefined, null, NaN, Infinity, -Infinity, 0, -0.1, "0.05"])
    assert.equal(distanceLengthPreview(sample, dimensions, { ...lineCalibration, result: { ...lineCalibration.result, mm_per_pixel: scale } }), null)
  for (const widthPx of [undefined, null, NaN, Infinity, -Infinity, 0, -1, "2000"])
    assert.equal(distanceLengthPreview(sample, { ...dimensions, widthPx }, lineCalibration), null)
  for (const heightPx of [undefined, null, NaN, Infinity, -Infinity, 0, -1, "1000"])
    assert.equal(distanceLengthPreview(sample, { ...dimensions, heightPx }, lineCalibration), null)
  assert.equal(distanceLengthPreview(geometry({ x: 0, y: 0 }, { x: 1, y: 1 }),
    { widthPx: Number.MAX_VALUE, heightPx: Number.MAX_VALUE }, { ...lineCalibration, result: { ...lineCalibration.result, mm_per_pixel: 1 } }), null)
})

test("rejects non-finite or out-of-bounds normalized coordinates and accepts image edges", () => {
  for (const invalid of [-0.001, 1.001, NaN, Infinity, -Infinity]) {
    assert.equal(distanceLengthPreview(geometry({ x: invalid, y: 0.5 }, { x: 0.8, y: 0.7 }), dimensions, lineCalibration), null)
    assert.equal(distanceLengthPreview(geometry({ x: 0.2, y: 0.3 }, { x: 0.8, y: invalid }), dimensions, lineCalibration), null)
  }
  closeTo(distanceLengthPreview(geometry({ x: 0, y: 0 }, { x: 1, y: 1 }), dimensions, lineCalibration),
    Math.hypot(dimensions.widthPx, dimensions.heightPx) * lineCalibration.result.mm_per_pixel)
})

test("keeps full precision and does not mutate geometry, dimensions or persisted calibration", () => {
  const sample = geometry({ x: 0.1234567, y: 0.2345678 }, { x: 0.8765432, y: 0.7654321 })
  const sampleDimensions = { widthPx: 2048, heightPx: 1152 }
  const before = structuredClone({ sample, sampleDimensions, lineCalibration })
  Object.freeze(sample.start); Object.freeze(sample.end); Object.freeze(sample)
  Object.freeze(sampleDimensions)
  Object.freeze(lineCalibration.result); Object.freeze(lineCalibration)

  const preview = distanceLengthPreview(sample, sampleDimensions, lineCalibration)
  const expected = Math.hypot((sample.end.x - sample.start.x) * sampleDimensions.widthPx,
    (sample.end.y - sample.start.y) * sampleDimensions.heightPx) * lineCalibration.result.mm_per_pixel
  assert.equal(preview, expected)
  assert.notEqual(preview, Number(preview.toFixed(2)))
  assert.deepEqual({ sample, sampleDimensions, lineCalibration }, before)
})
