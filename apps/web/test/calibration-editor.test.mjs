import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import { readFileSync } from "node:fs"
import test from "node:test"
import { imagePlanFixture } from "./fixtures/image-plan.mjs"

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })
const editor = await import("../src/features/cases/lib/calibration-editor.ts")
const { mapClientPointToImage } = await import("../src/features/cases/lib/image-coordinate-map.ts")
const { moveLineMarker } = await import("../src/features/cases/lib/line-marker-interaction.ts")
const { moveCircleMarker, resizeCircleMarker } = await import("../src/features/cases/lib/circle-marker-interaction.ts")
const f = imagePlanFixture(), dimensions = { widthPx: 2000, heightPx: 1000 }
const initial = f.publicPlan(f.initial)
const evidence = JSON.parse(readFileSync(new URL("../../../docs/testing/calibration-contract-fixtures-2026-10-23.json", import.meta.url), "utf8"))

test("source edges and normalized geometry remain invariant across thumbnail size, zoom and pan", () => {
  for (const rect of [{ left: 200, top: 50, width: 1600, height: 800 }, { left: -700, top: 380, width: 4000, height: 2000 }]) {
    const start = mapClientPointToImage(rect.left, rect.top, rect, 2000, 1000, 0)
    const end = mapClientPointToImage(rect.left + rect.width, rect.top + rect.height, rect, 2000, 1000, 0)
    assert.deepEqual(editor.markerToGeometry({ kind: "line", start, end }, dimensions), {
      kind: "REFERENCE_LINE", start: { x: 0, y: 0 }, end: { x: 1, y: 1 },
    })
    assert.deepEqual(mapClientPointToImage(rect.left + rect.width * 0.3, rect.top + rect.height * 0.7, rect, 2000, 1000, 0), { x: 600, y: 700 })
  }
})

test("reopening backend reference examples preserves geometry, millimetres and the original-matrix reference length", () => {
  for (const example of evidence.cases.filter(item => item.input.calibration && item.output.calibration?.result)) {
    const calibration = example.output.calibration
    const plan = { ...initial, revision: 1, updatedAt: "2026-10-23T19:00:00Z", document: { ...initial.document, calibration } }
    const state = editor.editorFromPlan(plan)
    assert.equal(editor.editorHasChanges(state, plan), false, example.id)
    const { result: _untrustedResult, ...expectedInput } = example.input.calibration
    assert.deepEqual(editor.calibrationFromEditor(state), expectedInput, example.id)
    const marker = editor.geometryToMarker(state.geometry, { widthPx: example.widthPx, heightPx: example.heightPx })
    const length = marker.kind === "line" ? Math.hypot(marker.end.x - marker.start.x, marker.end.y - marker.start.y) : marker.radiusPx * 2
    assert.ok(Math.abs(length - calibration.result.reference_length_px) < 1e-8, example.id)
    assert.equal(editor.calibrationFromEditor(state).result, undefined)
  }
})

test("a circular reference preserves a vertical center-edge direction rather than confusing its radius and diameter", () => {
  const geometry = { kind: "REFERENCE_CIRCLE", center: { x: 0.5, y: 0.5 }, edge: { x: 0.5, y: 0.625 } }
  const marker = editor.geometryToMarker(geometry, dimensions)
  assert.equal(marker.radiusPx, 125)
  assert.deepEqual(editor.markerToGeometry(marker, dimensions, geometry), geometry)
  const moved = moveCircleMarker(marker, marker.center, { x: 1200, y: 600 }, 2000, 1000, 0)
  const changed = editor.markerToGeometry(moved, dimensions, geometry)
  assert.deepEqual(changed, { kind: "REFERENCE_CIRCLE", center: { x: 0.6, y: 0.6 }, edge: { x: 0.6, y: 0.725 } })
})

test("remote movement and circle resizing reach inclusive edges without changing the legacy convention", () => {
  const line = { kind: "line", start: { x: 10, y: 20 }, end: { x: 50, y: 20 } }
  assert.equal(moveLineMarker(line, { x: 0, y: 0 }, { x: 100, y: 0 }, 100, 100, 0).end.x, 100)
  assert.equal(moveLineMarker(line, { x: 0, y: 0 }, { x: 100, y: 0 }, 100, 100).end.x, 99)
  const circle = { kind: "circle", center: { x: 50, y: 50 }, radiusPx: 10 }
  assert.equal(resizeCircleMarker(circle, { x: 100, y: 50 }, 100, 100, 0).radiusPx, 50)
  assert.equal(moveCircleMarker(circle, circle.center, { x: 100, y: 100 }, 100, 100, 0).center.x, 90)
})

test("known measurements support decimal comma and explicit units while rejecting invalid or excessive values", () => {
  assert.equal(editor.referenceInMillimetres("2,5", "cm"), 25)
  assert.equal(editor.referenceInMillimetres("1000", "cm"), 10000)
  assert.equal(editor.referenceInMillimetres("1e-7", "mm"), 1e-7)
  for (const value of ["", " ", "0", "-1", "Infinity", "0x10", "1,2,3", "25mm", "10000.1", "1e999"])
    assert.equal(editor.referenceInMillimetres(value, "mm"), null, value)
  assert.equal(editor.referenceInMillimetres("1000.1", "cm"), null)
})

test("switching display units does not dirty a saved reference through double rounding", () => {
  for (const mm of [0.7, 2.05, 1e-7, 10000]) {
    const calibration = { ...f.line, known_length_mm: mm }
    const plan = { ...initial, revision: 1, updatedAt: "2026-10-23T19:00:00Z", document: { ...initial.document, calibration } }
    const state = editor.editorFromPlan(plan)
    const cm = { ...state, unit: "cm", reference: editor.convertReferenceUnit(state.reference, "mm", "cm") }
    assert.equal(editor.editorHasChanges(cm, plan), false, String(mm))
    assert.equal(editor.referenceInMillimetres(editor.convertReferenceUnit(cm.reference, "cm", "mm"), "mm"), mm)
  }
})

test("incomplete drafts remain dirty and a newer revision requires an explicit reload", () => {
  const empty = editor.editorFromPlan(initial)
  assert.equal(editor.editorHasChanges(empty, initial), false)
  for (const change of [{ reference: "bad" }, { kind: "circle" }, { geometry: f.line }])
    assert.equal(editor.editorHasChanges({ ...empty, ...change }, initial), true)
  const saved = f.publicPlan(f.persist({ base_revision: 0, document: { ...f.initial.document, calibration: f.line } }))
  assert.equal(editor.editorHasChanges(editor.editorFromPlan(saved), { ...saved, revision: 2 }), true)
})

test("eligibility refuses absent original dimensions and either known anisotropic DICOM spacing", () => {
  const image = { kind: "DICOM", widthPx: 2000, heightPx: 1000, pixelSpacingMm: null, imagerPixelSpacingMm: null }
  assert.equal(editor.calibrationGeometryIssue(image), null)
  assert.equal(editor.calibrationGeometryIssue({ ...image, widthPx: null }), "dimensions")
  for (const key of ["pixelSpacingMm", "imagerPixelSpacingMm"]) {
    assert.equal(editor.calibrationGeometryIssue({ ...image, [key]: [0.4, 0.2] }), "anisotropy")
    assert.equal(editor.calibrationGeometryIssue({ ...image, [key]: [0.2, 0.2] }), null)
  }
})

test("valid remote circles may cross the image border and still move without changing radius or moving off-matrix", () => {
  for (const geometry of [
    { kind: "REFERENCE_CIRCLE", center: { x: 0.02, y: 0.5 }, edge: { x: 0.07, y: 0.5 } },
    { kind: "REFERENCE_CIRCLE", center: { x: 0.1, y: 0.5 }, edge: { x: 0.9, y: 0.5 } },
  ]) {
    const marker = editor.geometryToMarker(geometry, dimensions)
    const moved = moveCircleMarker(marker, { x: 0, y: 0 }, { x: 1, y: -1 }, 2000, 1000, 0)
    assert.equal(moved.center.x, marker.center.x + 1)
    assert.equal(moved.center.y, marker.center.y - 1)
    assert.equal(moved.radiusPx, marker.radiusPx)
    const next = editor.markerToGeometry(moved, dimensions, geometry)
    assert.ok(editor.calibrationFromEditor({ ...editor.editorFromCalibration(0, null), kind: "circle", geometry: next, reference: "20" }))
    assert.ok(Math.abs(next.edge.x - geometry.edge.x - 1 / 2000) < 1e-12)
  }
})
