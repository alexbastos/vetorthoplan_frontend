import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) return nextResolve(`${specifier}.ts`, context)
  return nextResolve(specifier, context)
} })

const { tploEditorPlacement, tploPlacementInPixels, tploPlacementCursor, tploPlacementFromKeyboard } = await import("../src/features/cases/lib/tplo-placement.ts")
const { placeTploPoint, tploEditorCommand, changeTploOrigin } = await import("../src/features/cases/lib/tplo-editor.ts")
const { tploWithDiameter, tploInPixels, tploInNormalized } = await import("../src/features/cases/lib/tplo-geometry.ts")
const { beginTploDrag, tploFromDrag } = await import("../src/features/cases/lib/tplo-interaction.ts")
const { viewerEditorInPixels } = await import("../src/features/cases/lib/viewer-editor.ts")
const { applyPlanCommand } = await import("../src/features/cases/schemas/image-plan-command.schema.ts")
const { selectSavedTplo } = await import("../src/features/cases/lib/tplo-result.ts")

const dimensions = { widthPx: 1000, heightPx: 2000 }
const id = "a4302086-7b81-482d-a11a-b9f4b29e11b0"
const draft = () => ({ kind: "tplo-create", id, baseRevision: 4, label: "TPLO 1", rotation_degrees: -25,
  fragment: null, fragmentComplete: true })
const plan = { revision: 4, document: { schema_version: 1, calibration: null, tplo: null, objects: [] } }
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= 1e-10 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`)

test("center then edge requires explicit distinct points and yields a TPLO command without a fragment", () => {
  const initial = draft()
  assert.deepEqual(tploEditorPlacement(initial), { step: "center" })
  assert.equal(tploEditorCommand(initial, plan), null)
  assert.equal(placeTploPoint(initial, { x: 0.6, y: 0.5 }, "edge"), null)
  const center = placeTploPoint(initial, { x: 0.5, y: 0.5 }, "center")
  assert.deepEqual(tploEditorPlacement(center), { step: "edge", center: { x: 0.5, y: 0.5 } })
  assert.equal(tploEditorCommand(center, plan), null)
  assert.equal(placeTploPoint(center, center.center, "edge"), null)
  assert.equal(placeTploPoint(center, { x: 0.2, y: 0.2 }, "center"), null)
  const complete = placeTploPoint(center, { x: 0.7, y: 0.5 }, "edge")
  assert.equal(tploEditorPlacement(complete), null)
  assert.equal(tploEditorPlacement({ ...complete, kind: "tplo-update" }), null)
  const command = tploEditorCommand(complete, plan)
  assert.equal(command.kind, "tplo-create")
  assert.equal(command.id, id)
  assert.equal(command.rotation_degrees, -25)
  assert.equal(command.fragment, null)
  assert.deepEqual(Object.keys(command).sort(), ["kind", "id", "baseRevision", "label", "center", "edge", "rotation_degrees", "fragment"].sort())
  assert.deepEqual(initial, draft())
})

test("invalid input never finishes placement or enters the command", () => {
  for (const value of [-0.01, 1.01, Infinity, NaN]) {
    assert.equal(placeTploPoint(draft(), { x: value, y: 0.5 }, "center"), null)
    const editor = { ...draft(), center: { x: 0.5, y: 0.5 } }
    assert.equal(placeTploPoint(editor, { x: 0.6, y: value }, "edge"), null)
  }
})

test("a saved cut without a fragment remains readable with the backend's fragment-required state", () => {
  const saved = { ...plan, imageId: id, document: { ...plan.document, objects: [{ id, type: "TPLO", center: { x: 0.5, y: 0.5 },
    edge: { x: 0.6, y: 0.5 }, rotation_degrees: 0, fragment: null, simulation: { status: "FRAGMENT_REQUIRED" } }] } }
  const [item] = selectSavedTplo(saved, { dimensions })
  assert.ok(item.origin)
  assert.deepEqual(item.simulation, { status: "unavailable", reason: "fragment" })
  assert.equal(item.origin.fragment, null)
})

test("placement adapter uses original rectangular dimensions without a calibration marker", () => {
  const placed = []
  const editor = viewerEditorInPixels({ kind: "tplo", id, baseRevision: 4, contextGeneration: 1, geometry: null,
    placement: { step: "edge", center: { x: 0.25, y: 0.75 } }, editable: true, tool: "mark", onToolChange() {},
    onPlacePoint: (...args) => placed.push(args), onGeometryChange() {} }, dimensions)
  assert.deepEqual(editor.tploPlacement, { step: "edge", center: { x: 250, y: 1500 } })
  assert.equal(editor.tploGeometry, null)
  assert.equal(editor.marker, null)
  assert.equal(editor.circlePlacement, null)
  assert.equal(editor.anglePlacement, null)
  assert.equal(editor.landmarksPlacement, null)
  assert.equal(editor.readOnly, false)
  assert.deepEqual(placed, [])
})

test("missing dimensions or a malformed normalized center cannot produce a placement", () => {
  for (const value of [0, -1, NaN, Infinity]) {
    assert.equal(tploPlacementInPixels({ step: "center" }, { ...dimensions, widthPx: value }), null)
    assert.equal(tploPlacementCursor({ step: "center" }, { ...dimensions, heightPx: value }), null)
  }
  assert.equal(tploPlacementInPixels({ step: "edge", center: { x: 1.1, y: 0.5 } }, dimensions), null)
})

test("keyboard preview uses original pixels, reflected direction, Shift and inclusive limits", () => {
  const step = { step: "center" }
  assert.deepEqual(tploPlacementFromKeyboard(step, null, { key: "ArrowRight", shiftKey: false }, dimensions, false), { x: 501, y: 1000 })
  assert.deepEqual(tploPlacementFromKeyboard(step, null, { key: "ArrowRight", shiftKey: true }, dimensions, true), { x: 490, y: 1000 })
  assert.deepEqual(tploPlacementFromKeyboard(step, { x: 2, y: 1998 }, { key: "ArrowDown", shiftKey: true }, dimensions, false), { x: 2, y: 2000 })
  assert.deepEqual(tploPlacementFromKeyboard(step, { x: 2, y: 1998 }, { key: "ArrowLeft", shiftKey: true }, dimensions, false), { x: 0, y: 1998 })
  assert.equal(tploPlacementFromKeyboard(step, null, { key: "Enter", shiftKey: false }, dimensions, false), null)
  assert.equal(tploPlacementFromKeyboard(step, { x: NaN, y: 0 }, { key: "ArrowRight", shiftKey: false }, dimensions, false), null)
})

test("edge cursor remains distinct and inside every original-image corner", () => {
  for (const center of [{ x: 0, y: 0 }, { x: 0, y: 2000 }, { x: 1000, y: 0 }, { x: 1000, y: 2000 }, { x: 500, y: 1000 }]) {
    const next = tploPlacementCursor({ step: "edge", center }, dimensions)
    assert.notDeepEqual(next, center)
    assert.ok(next.x >= 0 && next.x <= 1000 && next.y >= 0 && next.y <= 2000)
  }
})

test("physical diameter preserves pivot, direction and all original fragment points", () => {
  const fragment = [{ x: 100, y: 300 }, { x: 200, y: 400 }, { x: 50, y: 500 }]
  const origin = { center: { x: 500, y: 1000 }, edge: { x: 560, y: 1080 }, fragment, fragmentClosed: true }
  const before = structuredClone(origin)
  const result = tploWithDiameter(origin, 40, 0.1, dimensions)
  assert.equal(result.status, "available")
  assert.deepEqual(result.geometry.center, origin.center)
  assert.deepEqual(result.geometry.edge, { x: 620, y: 1160 })
  assert.deepEqual(result.geometry.fragment, fragment)
  assert.deepEqual(origin, before)
  close(Math.hypot(result.geometry.edge.x - 500, result.geometry.edge.y - 1000) * 0.1 * 2, 40)
})

test("impossible sizes and invalid scale are rejected without silently shrinking the request", () => {
  const origin = { center: { x: 950, y: 1000 }, edge: { x: 1000, y: 1000 }, fragment: null }
  assert.equal(tploWithDiameter(origin, 40, 0.1, dimensions).status, "out-of-bounds")
  for (const value of [0, -1, NaN, Infinity]) {
    assert.equal(tploWithDiameter(origin, value, 0.1, dimensions).status, "invalid")
    assert.equal(tploWithDiameter(origin, 5, value, dimensions).status, "invalid")
  }
  assert.deepEqual(origin.edge, { x: 1000, y: 1000 })
})

test("changing pivot and translating the group keep rotation and fragment semantics", () => {
  const editor = { ...draft(), center: { x: 0.5, y: 0.5 }, edge: { x: 0.6, y: 0.5 },
    fragment: { label: "proximal", points: [{ x: 0.2, y: 0.1 }, { x: 0.3, y: 0.15 }, { x: 0.2, y: 0.2 }] } }
  const origin = { center: editor.center, edge: editor.edge, fragment: editor.fragment.points, fragmentClosed: true }
  const pixels = tploInPixels(origin, dimensions)
  for (const target of ["center", "body"]) {
    const result = tploFromDrag(beginTploDrag(pixels, target, pixels.center), { x: 510, y: 1020 }, dimensions)
    const changed = changeTploOrigin(editor, tploInNormalized(result, dimensions, origin))
    assert.equal(changed.rotation_degrees, -25)
    assert.equal(changed.fragment.label, "proximal")
    close(changed.edge.x - changed.center.x, 0.1)
    close(changed.edge.y - changed.center.y, 0)
    close(changed.fragment.points[0].x, target === "body" ? 0.21 : 0.2)
    close(changed.fragment.points[0].y, target === "body" ? 0.11 : 0.1)
  }
})

test("a completed cut changes only its object and preserves calibration, landmarks and global parameters", () => {
  const document = { ...plan.document, tplo: { laterality: "RIGHT", projection: "MEDIOLATERAL", blade_diameter_mm: 24 },
    calibration: { kind: "REFERENCE_LINE", start: { x: 0.1, y: 0.1 }, end: { x: 0.2, y: 0.1 }, known_length_mm: 10 },
    tplo_landmarks: { method: "MEDIAL_CONDYLE_CRANIAL_CRUCIATE_FULL_AXIS_V1", plateau_cranial: { x: 0.2, y: 0.2 },
      plateau_caudal: { x: 0.4, y: 0.2 }, intercondylar_midpoint: { x: 0.3, y: 0.3 }, talus_center: { x: 0.3, y: 0.8 } },
    objects: [{ type: "LINE", id: "835f2dd4-c3b9-4193-9bb1-af4e4d96f06f", start: { x: 0.1, y: 0.1 }, end: { x: 0.2, y: 0.1 }, visible: true, locked: false }] }
  const before = structuredClone(document)
  const complete = placeTploPoint(placeTploPoint(draft(), { x: 0.5, y: 0.5 }, "center"), { x: 0.6, y: 0.5 }, "edge")
  const next = applyPlanCommand(document, tploEditorCommand(complete, plan))
  assert.deepEqual(next.calibration, document.calibration)
  assert.deepEqual(next.tplo_landmarks, document.tplo_landmarks)
  assert.deepEqual(next.tplo, document.tplo)
  assert.deepEqual(next.objects[0], document.objects[0])
  assert.equal(next.objects[1].type, "TPLO")
  assert.equal(next.objects[1].fragment, null)
  assert.deepEqual(document, before)
})
