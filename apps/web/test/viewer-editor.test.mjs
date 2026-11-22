import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) return nextResolve(`${specifier}.ts`, context)
  return nextResolve(specifier, context)
} })

const { imagePointToPixels, imagePointToNormalized } = await import("../src/features/cases/lib/image-point-space.ts")
const { viewerEditorInPixels } = await import("../src/features/cases/lib/viewer-editor.ts")
const { geometryToMarker, markerToGeometry } = await import("../src/features/cases/lib/calibration-editor.ts")
const { beginMarkerDrag, markerFromDrag, markerFromKeyboard } = await import("../src/features/cases/lib/viewer-marker-interaction.ts")
const { viewerContextPlacement } = await import("../src/features/cases/lib/viewer-context-placement.ts")

const dimensions = { widthPx: 1375, heightPx: 1444 }
const controls = { editable: true, tool: "mark", onToolChange() {} }

test("context actions preserve the existing point offset when no contour is protected", () => {
  assert.deepEqual(viewerContextPlacement({ x: 100, y: 100 }, { width: 800, height: 600 }, 12), { left: 124, top: 124 })
  assert.deepEqual(viewerContextPlacement({ x: 760, y: 570 }, { width: 800, height: 600 }, 12), { left: 656, top: 548 })
})

test("fragment actions clear the entire contour and switch sides within the viewport", () => {
  const cases = [
    { viewport: { width: 800, height: 600 }, points: [{ x: 100, y: 100 }, { x: 300, y: 300 }], anchor: { x: 150, y: 150 }, side: "right" },
    { viewport: { width: 320, height: 240 }, points: [{ x: 260, y: 60 }, { x: 300, y: 120 }], anchor: { x: 280, y: 100 }, side: "left" },
    { viewport: { width: 320, height: 360 }, points: [{ x: 40, y: 50 }, { x: 280, y: 150 }], anchor: { x: 160, y: 100 }, side: "bottom" },
  ]
  for (const { viewport, points, anchor, side } of cases) {
    const result = viewerContextPlacement(anchor, viewport, 12, points)
    assert.ok(result.left >= 12 && result.left + 80 <= viewport.width - 12)
    assert.ok(result.top >= 12 && result.top + 40 <= viewport.height - 12)
    if (side === "right") assert.ok(result.left >= 348)
    if (side === "left") assert.ok(result.left + 80 <= 212)
    if (side === "bottom") assert.ok(result.top >= 198)
  }
  const full = viewerContextPlacement({ x: 160, y: 120 }, { width: 320, height: 240 }, 12, [{ x: -100, y: -100 }, { x: 500, y: 500 }])
  assert.ok(full.left >= 12 && full.left + 80 <= 308 && full.top >= 12 && full.top + 40 <= 228)
})

test("neutral point conversion uses inclusive original edges without rounding or preview dimensions", () => {
  for (const point of [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0.1234, y: 0.8765 }]) {
    const pixels = imagePointToPixels(point, dimensions)
    const restored = imagePointToNormalized(pixels, dimensions)
    assert.ok(Math.abs(restored.x - point.x) < 1e-15)
    assert.ok(Math.abs(restored.y - point.y) < 1e-15)
  }
  assert.deepEqual(imagePointToPixels({ x: 1, y: 1 }, dimensions), { x: 1375, y: 1444 })
  // A reference circle can legitimately extend beyond the matrix: no hidden clamp.
  assert.deepEqual(imagePointToNormalized({ x: -137.5, y: 1588.4 }, dimensions), { x: -0.1, y: 1.1 })
})

test("distance editor adapts only LINE geometry without clinical calibration fields", () => {
  let changed
  const geometry = { start: { x: 0.25, y: 0.5 }, end: { x: 1, y: 1 } }
  const editor = viewerEditorInPixels({ kind: "distance", id: "line-a", ...controls, geometry, onGeometryChange(value) { changed = value } }, dimensions)
  assert.deepEqual(editor.marker, { kind: "line", start: { x: 343.75, y: 722 }, end: { x: 1375, y: 1444 } })
  editor.onMarkerChange(editor.marker)
  assert.deepEqual(changed, geometry)
  changed = null
  editor.onMarkerChange({ kind: "circle", center: { x: 50, y: 50 }, radiusPx: 10 })
  assert.equal(changed, null)
  assert.equal(editor.markerKind, "line")
  assert.equal(editor.readOnly, false)
})

test("calibration and distance share geometry conversion without sharing reference semantics", () => {
  const geometry = { start: { x: 0.2, y: 0.3 }, end: { x: 0.8, y: 0.7 } }
  const reference = { kind: "REFERENCE_LINE", ...geometry }
  const marker = geometryToMarker(reference, dimensions)
  let received
  const calibration = viewerEditorInPixels({ kind: "calibration", ...controls, marker, markerKind: "line", onMarkerChange(value) { received = value } }, dimensions)
  const distance = viewerEditorInPixels({ kind: "distance", id: "a", ...controls, geometry, onGeometryChange() {} }, dimensions)
  assert.deepEqual(calibration.marker, distance.marker)
  calibration.onMarkerChange(marker)
  assert.equal(received, marker)
  assert.deepEqual(markerToGeometry(marker, dimensions), reference)
  assert.equal(viewerEditorInPixels({ kind: "none" }, dimensions).readOnly, true)
})

test("shared line gestures retain the target, reuse body movement and contain the whole segment", () => {
  const marker = { kind: "line", start: { x: 10, y: 20 }, end: { x: 110, y: 120 } }
  const drag = beginMarkerDrag(marker, "line", "body", { x: 60, y: 70 })
  const next = markerFromDrag(drag, { x: 9999, y: -9999 }, dimensions, 0)
  assert.deepEqual(next, { kind: "line", start: { x: 1275, y: 0 }, end: { x: 1375, y: 100 } })
  assert.deepEqual(marker, { kind: "line", start: { x: 10, y: 20 }, end: { x: 110, y: 120 } })
  assert.equal(beginMarkerDrag(marker, "line", "start", marker.start).kind, "resize-line")
  assert.equal(beginMarkerDrag(marker, "circle", null, marker.start).kind, "create")
})

test("shared keyboard movement preserves mirrored direction, large steps and endpoint limits", () => {
  const marker = { kind: "line", start: { x: 10, y: 20 }, end: { x: 110, y: 120 } }
  const moved = markerFromKeyboard(marker, { key: "ArrowRight", shiftKey: true, altKey: false }, dimensions, 0, true)
  assert.equal(moved.start.x, 0)
  assert.equal(moved.end.x, 100)
  const resized = markerFromKeyboard(marker, { key: "ArrowDown", shiftKey: false, altKey: true }, dimensions, 0, false)
  assert.deepEqual(resized.start, marker.start)
  assert.equal(resized.end.y, 121)
})
