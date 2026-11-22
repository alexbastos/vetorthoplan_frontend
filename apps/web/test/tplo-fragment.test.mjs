import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) return nextResolve(`${specifier}.ts`, context)
  return nextResolve(specifier, context)
} })
const { beginTploFragment, appendTploFragmentPoint, undoTploFragmentPoint, finishTploFragment, cancelTploFragment,
  insertTploFragmentVertex, removeTploFragmentVertex, clearTploFragment, tploFragmentIsDegenerate } = await import("../src/features/cases/lib/tplo-fragment-editor.ts")
const { tploEditorCommand, changeTploOrigin } = await import("../src/features/cases/lib/tplo-editor.ts")
const { tploInPixels, tploInNormalized } = await import("../src/features/cases/lib/tplo-geometry.ts")
const { tploFromKeyboard, hitTestTplo, pickTplo } = await import("../src/features/cases/lib/tplo-interaction.ts")
const { applyPlanCommand } = await import("../src/features/cases/schemas/image-plan-command.schema.ts")
const id = "a4302086-7b81-482d-a11a-b9f4b29e11b0"
const points = [{ x: 0.123456789123, y: 0.234567891234 }, { x: 0.72, y: 0.11 }, { x: 0.51, y: 0.8 }]
const draft = () => ({ kind: "tplo-update", id, baseRevision: 4, center: { x: 0.5, y: 0.5 }, edge: { x: 0.6, y: 0.5 },
  rotation_degrees: -31.125, fragment: { points: structuredClone(points), label: "original fragment" }, fragmentComplete: true })
const plan = { revision: 4, document: { schema_version: 1, objects: [] } }
const append = (editor, point) => appendTploFragmentPoint(editor, point, editor.fragment.points.length)

test("an unfinished contour cannot form a command even after its third vertex", () => {
  const original = draft(), before = structuredClone(original)
  let editor = beginTploFragment(original)
  assert.equal(beginTploFragment(editor), null)
  assert.deepEqual(editor.fragment.points, [])
  assert.deepEqual(editor.fragmentBeforeEdit, original.fragment)
  for (const point of points) { editor = append(editor, point); assert.equal(tploEditorCommand(editor, plan), null) }
  const done = finishTploFragment(editor), command = tploEditorCommand(done, plan)
  assert.deepEqual(command.fragment.points, points)
  assert.equal(command.fragment.points.length, 3)
  assert.equal(command.rotation_degrees, original.rotation_degrees)
  assert.equal("fragmentBeforeEdit" in command, false)
  assert.equal("fragmentComplete" in command, false)
  assert.equal("fragmentBeforeEdit" in done, false)
  assert.deepEqual(original, before)
})

test("completion needs 3 points, undo corrects only the last, and cancel restores the previous contour", () => {
  const original = draft()
  let editor = beginTploFragment(original)
  assert.equal(undoTploFragmentPoint(editor), null)
  assert.equal(finishTploFragment(editor), null)
  editor = append(append(editor, points[0]), points[1])
  assert.equal(finishTploFragment(editor), null)
  editor = undoTploFragmentPoint(editor)
  assert.deepEqual(editor.fragment.points, [points[0]])
  // Cut changes remain local even when only the contour is cancelled.
  editor = { ...editor, center: { x: 0.4, y: 0.5 }, edge: { x: 0.5, y: 0.5 } }
  const cancelled = cancelTploFragment(editor)
  assert.deepEqual(cancelled.fragment, original.fragment)
  assert.deepEqual(cancelled.center, editor.center)
  assert.deepEqual(cancelled.edge, editor.edge)
  assert.equal(cancelled.rotation_degrees, original.rotation_degrees)
  assert.equal("fragmentBeforeEdit" in cancelled, false)
})

test("cancel handles both a new contour and an older incomplete draft without a backup", () => {
  const empty = { ...draft(), fragment: null }
  const session = beginTploFragment(empty)
  assert.equal(cancelTploFragment(append(session, points[0])).fragment, null)
  const legacy = { ...draft(), fragment: { points: [points[0]] }, fragmentComplete: false }
  assert.deepEqual(cancelTploFragment(legacy, draft().fragment).fragment, draft().fragment)
})

test("500 vertices are supported; 501, stale counts and invalid normalized coordinates are rejected", () => {
  let editor = beginTploFragment(draft())
  for (let i = 0; i < 500; i++) editor = append(editor, { x: i / 500, y: (i % 7) / 7 })
  assert.equal(editor.fragment.points.length, 500)
  assert.equal(append(editor, points[0]), null)
  assert.equal(finishTploFragment(editor).fragment.points.length, 500)
  assert.equal(insertTploFragmentVertex(finishTploFragment(editor), 0), null)
  const start = beginTploFragment(draft())
  assert.equal(appendTploFragmentPoint(start, points[0], 1), null)
  for (const value of [NaN, Infinity, -0.1, 1.1]) assert.equal(append(start, { x: value, y: 0.5 }), null)
})

test("explicit midpoint insertion keeps order and precision, including the closing segment", () => {
  const original = draft()
  for (const index of [0, 2]) {
    const next = insertTploFragmentVertex(original, index), a = points[index], b = points[(index + 1) % 3]
    assert.deepEqual(next.fragment.points[index + 1], { x: a.x + (b.x - a.x) / 2, y: a.y + (b.y - a.y) / 2 })
    assert.deepEqual(next.fragment.points.filter((_, i) => i !== index + 1), points)
    assert.equal(next.fragment.label, original.fragment.label)
    assert.equal(next.rotation_degrees, original.rotation_degrees)
    assert.deepEqual(removeTploFragmentVertex(next, index + 1), original)
  }
  assert.equal(removeTploFragmentVertex(original, 1), null)
  for (const index of [-1, 3, 1.5, NaN]) assert.equal(insertTploFragmentVertex(original, index), null)
})

test("vertex movement is in original rectangular pixels and retains the remaining points and angle", () => {
  const editor = draft(), dimensions = { widthPx: 1000, heightPx: 2000 }
  const origin = { center: editor.center, edge: editor.edge, fragment: editor.fragment.points, fragmentClosed: true }
  const pixels = tploInPixels(origin, dimensions)
  const moved = tploFromKeyboard(pixels, { vertex: 1 }, { key: "ArrowRight", shiftKey: true }, dimensions, true)
  const changed = changeTploOrigin(editor, tploInNormalized(moved, dimensions, origin))
  assert.equal(changed.fragment.points[1].x, points[1].x - 0.01)
  assert.deepEqual(changed.fragment.points[0], points[0])
  assert.deepEqual(changed.fragment.points[2], points[2])
  assert.equal(changed.fragment.label, editor.fragment.label)
  assert.equal(changed.rotation_degrees, editor.rotation_degrees)
})

test("degenerate contours are advisory only and remain persistible without simplification", () => {
  for (const vertices of [Array(3).fill({ x: 0.4, y: 0.4 }), [{ x: 0, y: 0 }, { x: 0.1, y: 0.2 }, { x: 0.2, y: 0.4 }]]) {
    assert.equal(tploFragmentIsDegenerate(vertices), true)
    const done = finishTploFragment({ ...beginTploFragment(draft()), fragment: { points: vertices, label: "keep" } })
    assert.deepEqual(tploEditorCommand(done, plan).fragment.points, vertices)
  }
  assert.equal(tploFragmentIsDegenerate(points), false)
  const tiny = [{ x: 0, y: 0 }, { x: 1e-12, y: 0 }, { x: 0, y: 1e-12 }]
  assert.equal(tploFragmentIsDegenerate(tiny), false)
})

test("remove contour affects only the fragment and never changes cut, rotation or other plan data", () => {
  const original = draft(), cleared = clearTploFragment(original)
  assert.equal(cleared.fragment, null)
  assert.deepEqual(cleared.center, original.center)
  assert.deepEqual(cleared.edge, original.edge)
  assert.equal(cleared.rotation_degrees, original.rotation_degrees)
  const object = { type: "TPLO", id, center: original.center, edge: original.edge, rotation_degrees: original.rotation_degrees,
    fragment: original.fragment, visible: true, locked: false, label: "saved cut" }
  const document = { schema_version: 1, objects: [object], calibration: null,
    tplo: { laterality: "RIGHT", projection: "MEDIOLATERAL", blade_diameter_mm: 24 }, tplo_landmarks: null }
  const before = structuredClone(document), next = applyPlanCommand(document, tploEditorCommand(cleared, plan))
  assert.deepEqual(next.tplo, document.tplo)
  assert.deepEqual(next.calibration, document.calibration)
  assert.deepEqual(next.tplo_landmarks, document.tplo_landmarks)
  assert.equal(next.objects[0].fragment, null)
  assert.equal(next.objects[0].label, "saved cut")
  assert.deepEqual(document, before)
  assert.equal(clearTploFragment(beginTploFragment(original)), null)
})

test("partial cuts and unrelated editors cannot start a contour", () => {
  assert.equal(beginTploFragment({ ...draft(), edge: undefined }), null)
  assert.equal(beginTploFragment({ kind: "tplo-parameters-set", baseRevision: 4, parameters: {} }), null)
})

test("an explicitly selected vertex can be dragged when it overlaps the cut, while default cut priority remains", () => {
  const dimensions = { widthPx: 1000, heightPx: 2000 }
  const rect = { left: 0, top: 0, width: 1000, height: 2000 }
  const geometry = { center: { x: 500, y: 1000 }, edge: { x: 600, y: 1000 },
    fragment: [{ x: 600, y: 1000 }, { x: 500, y: 1000 }, { x: 500, y: 1100 }] }
  assert.equal(hitTestTplo(geometry.fragment[0], geometry, rect, dimensions), "edge")
  assert.equal(hitTestTplo(geometry.fragment[1], geometry, rect, dimensions), "center")
  assert.equal(hitTestTplo(geometry.fragment[2], geometry, rect, dimensions), "body")
  for (let index = 0; index < 3; index++)
    assert.deepEqual(hitTestTplo(geometry.fragment[index], geometry, rect, dimensions, { vertex: index }), { vertex: index })
  assert.equal(hitTestTplo(geometry.center, geometry, rect, dimensions, { vertex: 0 }), "center")
  const coincident = { ...geometry, fragment: [geometry.edge, geometry.edge, geometry.center] }
  assert.deepEqual(hitTestTplo(geometry.edge, coincident, rect, dimensions, { vertex: 1 }), { vertex: 1 })
})

test("explicit vertex picking also keeps the selected osteotomy when another cut overlaps that point", () => {
  const dimensions = { widthPx: 1000, heightPx: 2000 }, rect = { left: 0, top: 0, width: 1000, height: 2000 }
  const selected = { id: "a", center: { x: 0.5, y: 0.5 }, edge: { x: 0.6, y: 0.5 }, fragment: points }
  const other = { id: "b", center: points[0], edge: { x: points[0].x + 0.05, y: points[0].y }, fragment: null }
  const pointer = { x: points[0].x * 1000, y: points[0].y * 2000 }
  assert.equal(pickTplo(pointer, [other, selected], "a", rect, dimensions).id, "b")
  assert.equal(pickTplo(pointer, [other, selected], "a", rect, dimensions, { vertex: 0 }).id, "a")
  assert.equal(pickTplo(pointer, [other, { ...selected, visible: false }], "a", rect, dimensions, { vertex: 0 }).id, "b")
})
