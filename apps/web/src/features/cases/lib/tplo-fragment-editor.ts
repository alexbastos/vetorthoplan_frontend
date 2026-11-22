import { PlanPointSchema } from "../schemas/image-plan.schema"
import type { ImagePoint } from "../types/case-workspace"
import { changeTploFragment, tploEditorGeometry, type TploEditor, type TploGeometryEditor } from "./tplo-editor"

const geometryEditor = (editor: TploEditor): editor is TploGeometryEditor => (editor.kind === "tplo-create" || editor.kind === "tplo-update") && Boolean(tploEditorGeometry(editor))
const closed = (editor: TploGeometryEditor) => editor.fragmentComplete !== false && Boolean(editor.fragment && editor.fragment.points.length >= 3 && editor.fragment.points.length <= 500)

function withoutBackup(editor: TploGeometryEditor): TploGeometryEditor {
  const next = { ...editor }
  delete next.fragmentBeforeEdit
  return next
}

function beginTploFragment(editor: TploEditor): TploEditor | null {
  if (!geometryEditor(editor) || editor.fragmentComplete === false) return null
  return { ...editor, fragmentBeforeEdit: editor.fragment ? structuredClone(editor.fragment) : null,
    fragment: { points: [], label: editor.fragment?.label ?? null }, fragmentComplete: false }
}

function appendTploFragmentPoint(editor: TploEditor, point: ImagePoint, expectedCount: number): TploEditor | null {
  if (!geometryEditor(editor) || editor.fragmentComplete !== false || !editor.fragment
    || editor.fragment.points.length !== expectedCount || expectedCount >= 500) return null
  const parsed = PlanPointSchema.safeParse(point)
  return parsed.success ? { ...editor, fragment: { ...editor.fragment, points: [...editor.fragment.points, parsed.data] } } : null
}

function undoTploFragmentPoint(editor: TploEditor): TploEditor | null {
  return geometryEditor(editor) && editor.fragmentComplete === false && editor.fragment?.points.length
    ? { ...editor, fragment: { ...editor.fragment, points: editor.fragment.points.slice(0, -1) } } : null
}

function finishTploFragment(editor: TploEditor): TploEditor | null {
  if (!geometryEditor(editor) || editor.fragmentComplete !== false || !editor.fragment) return null
  const next = changeTploFragment(editor, editor.fragment, true)
  return next && geometryEditor(next) ? withoutBackup(next) : null
}

function cancelTploFragment(editor: TploEditor, savedFragment?: TploGeometryEditor["fragment"]): TploEditor | null {
  if (!geometryEditor(editor) || editor.fragmentComplete !== false) return null
  const fragment = editor.fragmentBeforeEdit === undefined ? savedFragment ?? null : editor.fragmentBeforeEdit
  return { ...withoutBackup(editor), fragment, fragmentComplete: true }
}

function insertTploFragmentVertex(editor: TploEditor, after: number): TploEditor | null {
  if (!geometryEditor(editor) || !closed(editor) || !editor.fragment || editor.fragment.points.length >= 500
    || !Number.isInteger(after) || after < 0 || after >= editor.fragment.points.length) return null
  const points = editor.fragment.points, a = points[after], b = points[(after + 1) % points.length]
  // Explicit midpoint insertion; no contour fitting, reordering or resampling.
  const point = { x: a.x + (b.x - a.x) / 2, y: a.y + (b.y - a.y) / 2 }
  return { ...editor, fragment: { ...editor.fragment, points: [...points.slice(0, after + 1), point, ...points.slice(after + 1)] } }
}

function removeTploFragmentVertex(editor: TploEditor, index: number): TploEditor | null {
  if (!geometryEditor(editor) || !closed(editor) || !editor.fragment || editor.fragment.points.length <= 3
    || !Number.isInteger(index) || index < 0 || index >= editor.fragment.points.length) return null
  return { ...editor, fragment: { ...editor.fragment, points: editor.fragment.points.filter((_, i) => i !== index) } }
}

function clearTploFragment(editor: TploEditor): TploEditor | null {
  return geometryEditor(editor) && editor.fragmentComplete !== false && editor.fragment
    ? { ...withoutBackup(editor), fragment: null, fragmentComplete: true } : null
}

// Advisory only. Degenerate contours are valid backend inputs, including
// coincident vertices. Never change eligibility, simplify or delete their data.
function tploFragmentIsDegenerate(points: readonly ImagePoint[]): boolean {
  if (points.length < 3) return false
  const origin = points[0]
  const vectors = points.map(point => ({ x: point.x - origin.x, y: point.y - origin.y }))
  const baseline = vectors.reduce((a, b) => Math.hypot(b.x, b.y) > Math.hypot(a.x, a.y) ? b : a)
  const squared = baseline.x * baseline.x + baseline.y * baseline.y
  return squared === 0 || vectors.every(vector => Math.abs(baseline.x * vector.y - baseline.y * vector.x) <= squared * 1e-12)
}

export { beginTploFragment, appendTploFragmentPoint, undoTploFragmentPoint, finishTploFragment, cancelTploFragment,
  insertTploFragmentVertex, removeTploFragmentVertex, clearTploFragment, tploFragmentIsDegenerate }
