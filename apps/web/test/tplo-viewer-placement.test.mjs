import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { registerHooks } from "node:module"
import test, { after, afterEach } from "node:test"
import ts from "typescript"
import { JSDOM } from "jsdom"

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:3000" })
for (const name of ["window", "document", "navigator", "HTMLElement", "SVGElement", "Element", "HTMLInputElement", "DocumentFragment", "MutationObserver", "getComputedStyle", "Node", "NodeFilter", "CustomEvent"])
  Object.defineProperty(globalThis, name, { configurable: true, value: name === "getComputedStyle" ? dom.window[name].bind(dom.window) : dom.window[name] })
globalThis.IS_REACT_ACT_ENVIRONMENT = true
globalThis.requestAnimationFrame = callback => setTimeout(callback, 0)
globalThis.cancelAnimationFrame = clearTimeout
globalThis.ResizeObserver = class {
  constructor(callback) { this.callback = callback }
  observe() { this.callback([{ contentRect: { width: 1000, height: 700 } }]) }
  disconnect() {}
}
dom.window.PointerEvent = class extends dom.window.MouseEvent {
  constructor(type, init) { super(type, init); Object.defineProperties(this, {
    pointerId: { value: init.pointerId ?? 1 }, isPrimary: { value: init.isPrimary ?? true }, pointerType: { value: init.pointerType ?? "mouse" },
  }) }
}
const capture = new WeakMap()
dom.window.HTMLElement.prototype.setPointerCapture = function (id) { capture.set(this, id) }
dom.window.HTMLElement.prototype.hasPointerCapture = function (id) { return capture.get(this) === id }
dom.window.HTMLElement.prototype.releasePointerCapture = function () { capture.delete(this) }
dom.window.HTMLElement.prototype.scrollIntoView = function () {}
const originalFetch = globalThis.fetch
let requests = 0
globalThis.fetch = async () => { requests++; throw Error("Network is not allowed in this local test") }

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "next/image") return nextResolve("next/image.js", context)
  if (specifier.endsWith(".module.css")) return nextResolve(specifier, context)
  if (specifier.startsWith("@/")) {
    const target = new URL(`../src/${specifier.slice(2)}`, import.meta.url)
    try { return nextResolve(`${target.href}.tsx`, context) } catch { return nextResolve(`${target.href}.ts`, context) }
  }
  if (!context.parentURL?.includes("/node_modules/") && specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    try { return nextResolve(`${specifier}.ts`, context) } catch { return nextResolve(`${specifier}.tsx`, context) }
  }
  return nextResolve(specifier, context)
}, load(url, context, nextLoad) {
  if (url.endsWith(".module.css")) return { format: "module", shortCircuit: true, source: "export default new Proxy({}, { get: (_, key) => key })" }
  if (url.startsWith("file:") && url.endsWith(".tsx") && !url.includes("/node_modules/")) return { format: "module", shortCircuit: true,
    source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText }
  return nextLoad(url, context)
} })

const React = await import("react")
const { render, renderHook, fireEvent, cleanup, act, waitFor } = await import("@testing-library/react")
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query")
const { NextIntlClientProvider } = await import("next-intl")
const { CaseImageViewer } = await import("../src/features/cases/components/case-image-viewer.tsx")
const { CaseImageTploCutControls } = await import("../src/features/cases/components/case-image-tplo-cut-controls.tsx")
const { CaseImageTploFragmentControls } = await import("../src/features/cases/components/case-image-tplo-fragment-controls.tsx")
const { CaseImageTploFragmentDrawing, CaseImageTploFragmentActions } = await import("../src/features/cases/components/case-image-tplo-fragment-drawing.tsx")
const { CaseImageTploRotationControls } = await import("../src/features/cases/components/case-image-tplo-rotation-controls.tsx")
const { CaseImageTploReference } = await import("../src/features/cases/components/case-image-tplo-reference.tsx")
const { CaseImageTploSaved } = await import("../src/features/cases/components/case-image-tplo-saved.tsx")
const { useTploTableConsultation } = await import("../src/features/cases/hooks/use-tplo-table-consultation.ts")
const { useTploParameterSaveActions } = await import("../src/features/cases/hooks/use-tplo-parameter-save-actions.ts")
const { toast: notifications } = await import("../src/lib/notifications.ts")
const { tploParameterFields } = await import("../src/features/cases/lib/tplo-parameters.ts")
const { useCaseImagePreview } = await import("../src/features/cases/hooks/use-case-image-preview.ts")
const { useImageTplo } = await import("../src/features/cases/hooks/use-image-tplo.ts")
const { CaseImageWorkspace } = await import("../src/features/cases/components/case-image-workspace.tsx")
const { UnsavedChangesGuard } = await import("../src/components/shared/app-shell/unsaved-changes-guard.tsx")
const { casesQueryKeys: keys } = await import("../src/features/cases/hooks/cases-query-keys.ts")
const messages = JSON.parse(readFileSync(new URL("../src/i18n/messages/pt-BR/cases.json", import.meta.url), "utf8"))
const common = JSON.parse(readFileSync(new URL("../src/i18n/messages/pt-BR/common.json", import.meta.url), "utf8"))
const h = React.createElement
const provider = child => h(NextIntlClientProvider, { locale: "pt-BR", messages: { cases: messages, common }, timeZone: "UTC" }, child)
const id = "a4302086-7b81-482d-a11a-b9f4b29e11b0"
const rect = { left: 100, top: 50, width: 400, height: 800, right: 500, bottom: 850 }
const rendering = { url: "https://example.invalid/local-test.png", widthPx: 1000, heightPx: 2000 }
const clients = new Set()
afterEach(() => { cleanup(); for (const client of clients) client.clear(); clients.clear(); assert.equal(requests, 0) })
after(() => { dom.window.close(); globalThis.fetch = originalFetch })

function mountViewer({ placement = { step: "center" }, ...changes } = {}) {
  const calls = []
  let editor = { kind: "tplo", id, baseRevision: 4, contextGeneration: 1, geometry: null, placement, editable: true, tool: "mark",
    onToolChange() {}, onGeometryChange() { throw Error("Placement must not commit a full geometry") },
    onPlacePoint: (point, step) => calls.push({ point, step }) }
  let props = { brightness: 100, contrast: 100, inverted: false, name: "local", interactionKey: "image-a", rendering, editor, ...changes }
  const view = render(provider(h(CaseImageViewer, props)))
  const box = () => { view.getByRole("img").parentElement.getBoundingClientRect = () => rect }
  box()
  return { ...view, calls, viewport: () => view.container.querySelector("[data-calibration-viewport]"),
    change(patch) { editor = { ...editor, ...patch }; props = { ...props, editor }; view.rerender(provider(h(CaseImageViewer, props))); box() } }
}
function click(view, x, y, pointerType = "mouse") {
  const target = view.viewport()
  fireEvent.pointerDown(target, { pointerId: 1, clientX: x, clientY: y, button: 0, pointerType })
  fireEvent.pointerUp(target, { pointerId: 1, clientX: x, clientY: y, button: 0, pointerType })
}

test("fragment action clearance stays in screen pixels after zoom and mirroring", () => {
  const points = [{ x: 0.2, y: 0.3 }, { x: 0.4, y: 0.45 }], anchor = points[1]
  for (const mirrored of [false, true]) {
    const view = mountViewer({ mirrored, contextControls: { anchor, avoidPoints: points, content: h("button", null, "Finish outline") } })
    const check = zoom => {
      const toolbar = view.getByRole("button", { name: "Finish outline" }).parentElement
      const right = Math.max(...points.map(point => 500 + ((mirrored ? 1 - point.x : point.x) - 0.5) * 326 * zoom))
      assert.ok(Math.abs(Number.parseFloat(toolbar.style.left) - right - 48) < 1e-7)
      assert.ok(Number.parseFloat(toolbar.style.top) >= 12)
    }
    check(1)
    fireEvent.click(view.getByRole("button", { name: messages.workspace.viewer.zoomIn }))
    check(1.25)
    view.unmount()
  }
})

test("mouse and touch confirm one normalized point at release, without remote requests", () => {
  const view = mountViewer()
  const viewport = view.viewport()
  fireEvent.pointerDown(viewport, { clientX: 200, clientY: 250, button: 0 })
  assert.deepEqual(view.calls, [])
  fireEvent.pointerUp(viewport, { clientX: 200, clientY: 250, button: 0 })
  assert.deepEqual(view.calls, [{ step: "center", point: { x: 0.25, y: 0.25 } }])
  view.change({ placement: { step: "edge", center: { x: 0.25, y: 0.25 } }, contextGeneration: 2 })
  click(view, 300, 450, "touch")
  assert.deepEqual(view.calls[1], { step: "edge", point: { x: 0.5, y: 0.5 } })
})

test("dragging away and returning, cancellation, and release outside the image do not place points", () => {
  const view = mountViewer(), viewport = view.viewport()
  fireEvent.pointerDown(viewport, { clientX: 200, clientY: 250, button: 0 })
  fireEvent.pointerMove(viewport, { clientX: 230, clientY: 250 })
  fireEvent.pointerUp(viewport, { clientX: 200, clientY: 250, button: 0 })
  fireEvent.pointerDown(viewport, { clientX: 200, clientY: 250, button: 0 })
  fireEvent.pointerCancel(viewport, { clientX: 200, clientY: 250 })
  fireEvent.pointerUp(viewport, { clientX: 200, clientY: 250, button: 0 })
  fireEvent.pointerDown(viewport, { clientX: 200, clientY: 250, button: 0 })
  fireEvent.pointerUp(viewport, { clientX: 501, clientY: 250, button: 0 })
  assert.deepEqual(view.calls, [])
})

test("mirroring is undone before persistence and original borders stay inclusive", () => {
  const view = mountViewer({ mirrored: true })
  click(view, 200, 250)
  assert.deepEqual(view.calls[0].point, { x: 0.75, y: 0.25 })
  click(view, rect.left, rect.bottom)
  assert.deepEqual(view.calls[1].point, { x: 1, y: 1 })
})

test("keyboard placement requires a visible preview, supports Shift, and ignores repeated Enter", () => {
  const view = mountViewer(), viewport = view.viewport()
  viewport.focus()
  fireEvent.keyDown(viewport, { key: "Enter" })
  assert.deepEqual(view.calls, [])
  fireEvent.keyDown(viewport, { key: "ArrowRight", shiftKey: true })
  fireEvent.keyUp(viewport, { key: "ArrowRight" })
  assert.deepEqual(view.calls, [])
  fireEvent.keyDown(viewport, { key: "Enter" })
  assert.deepEqual(view.calls, [{ step: "center", point: { x: 0.51, y: 0.5 } }])
  view.change({ placement: { step: "edge", center: { x: 0.51, y: 0.5 } }, contextGeneration: 2 })
  fireEvent.keyDown(viewport, { key: "Enter", repeat: true })
  assert.equal(view.calls.length, 1)
  fireEvent.keyDown(viewport, { key: "ArrowDown" })
  fireEvent.keyUp(viewport, { key: "ArrowDown" })
  fireEvent.keyDown(viewport, { key: "Enter" })
  assert.equal(view.calls.length, 2)
  assert.equal(view.calls[1].step, "edge")
})

test("Esc, blur and generation changes cancel previews/captures and reject old repeats", () => {
  const view = mountViewer(), viewport = view.viewport()
  viewport.focus()
  fireEvent.keyDown(viewport, { key: "ArrowRight" })
  fireEvent.keyDown(viewport, { key: "Escape" })
  fireEvent.keyDown(viewport, { key: "ArrowRight", repeat: true })
  fireEvent.keyDown(viewport, { key: "Enter" })
  assert.deepEqual(view.calls, [])
  fireEvent.pointerDown(viewport, { clientX: 200, clientY: 250, button: 0 })
  fireEvent.blur(viewport)
  fireEvent.pointerUp(viewport, { clientX: 200, clientY: 250, button: 0 })
  assert.deepEqual(view.calls, [])
  fireEvent.pointerDown(viewport, { clientX: 200, clientY: 250, button: 0 })
  view.change({ contextGeneration: 2 })
  fireEvent.pointerUp(viewport, { clientX: 200, clientY: 250, button: 0 })
  fireEvent.keyDown(viewport, { key: "ArrowRight", repeat: true })
  fireEvent.keyDown(viewport, { key: "Enter" })
  assert.deepEqual(view.calls, [])
})

test("read-only placement cannot commit by keyboard or pointer", () => {
  const view = mountViewer()
  view.change({ editable: false })
  click(view, 200, 250)
  fireEvent.keyDown(view.viewport(), { key: "ArrowRight" })
  fireEvent.keyDown(view.viewport(), { key: "Enter" })
  assert.deepEqual(view.calls, [])
})

test("cut size accepts a decimal comma only on explicit application and explains an impossible size", () => {
  const calls = [], copy = messages.workspace.tplo.placement
  const view = render(provider(h(CaseImageTploCutControls, { placement: null, target: "edge", canEdit: true, canCancel: true,
    marking: true, diameterMm: 20.5, fragmentMissing: true, stale: false, onMark() {}, onTargetChange() {}, onCancel() {},
    onDiameterChange(value) { calls.push(value); return "out-of-bounds" } })))
  const input = view.getByLabelText(copy.diameter)
  assert.equal(input.value, "20,5")
  fireEvent.change(input, { target: { value: "40,5" } })
  assert.deepEqual(calls, [])
  fireEvent.submit(input.closest("form"))
  assert.deepEqual(calls, [40.5])
  assert.equal(view.getByRole("alert").textContent, messages.workspace.tplo.viewer.diameterOutside)
  assert.ok(view.getByText(copy.fragmentMissing))
  for (const value of ["", "0", "-1", "NaN", "Infinity", "0x20"]) {
    fireEvent.change(input, { target: { value } })
    fireEvent.submit(input.closest("form"))
  }
  assert.deepEqual(calls, [40.5])
})

function mountFragment(points = []) {
  const calls = [], changes = []
  const view = mountViewer({ placement: null })
  const geometry = { center: { x: 0.5, y: 0.5 }, edge: { x: 0.6, y: 0.5 }, fragment: points, fragmentClosed: false }
  view.change({ geometry, fragmentDrawing: true, onFragmentPoint: (point, count) => calls.push({ point, count }),
    onGeometryChange: (next, target) => changes.push({ next, target }) })
  return { ...view, fragmentCalls: calls, changes, geometry }
}

test("fragment clicks append once using normalized original pixels and a guarded expected count", () => {
  const view = mountFragment()
  click(view, 200, 250, "touch")
  assert.deepEqual(view.fragmentCalls, [{ point: { x: 0.25, y: 0.25 }, count: 0 }])
  view.change({ geometry: { ...view.geometry, fragment: [view.fragmentCalls[0].point] }, contextGeneration: 2 })
  click(view, 300, 450)
  assert.deepEqual(view.fragmentCalls[1], { point: { x: 0.5, y: 0.5 }, count: 1 })
  assert.deepEqual(view.calls, [])
  assert.deepEqual(view.changes, [])
  assert.equal(view.container.querySelector("[data-tplo-draft] polyline").getAttribute("points"), "250,500")
})

test("fragment keyboard preview, old capture and Enter repeats follow the current drawing generation", () => {
  const view = mountFragment([{ x: 0.25, y: 0.25 }]), viewport = view.viewport()
  fireEvent.keyDown(viewport, { key: "ArrowRight", shiftKey: true })
  fireEvent.keyUp(viewport, { key: "ArrowRight" })
  assert.deepEqual(view.fragmentCalls, [])
  fireEvent.keyDown(viewport, { key: "Enter" })
  assert.deepEqual(view.fragmentCalls, [{ point: { x: 0.26, y: 0.25 }, count: 1 }])
  view.change({ contextGeneration: 2 })
  fireEvent.keyDown(viewport, { key: "Enter", repeat: true })
  fireEvent.pointerDown(viewport, { clientX: 200, clientY: 250, button: 0 })
  view.change({ contextGeneration: 3 })
  fireEvent.pointerUp(viewport, { clientX: 200, clientY: 250, button: 0 })
  assert.equal(view.fragmentCalls.length, 1)
})

test("500-point limit and read-only mode block fragment appends", () => {
  const view = mountFragment(Array.from({ length: 500 }, (_, i) => ({ x: i / 500, y: 0.5 })))
  click(view, 200, 250)
  fireEvent.keyDown(view.viewport(), { key: "ArrowRight" })
  fireEvent.keyDown(view.viewport(), { key: "Enter" })
  assert.deepEqual(view.fragmentCalls, [])
  view.change({ geometry: view.geometry, editable: false })
  click(view, 200, 250)
  assert.deepEqual(view.fragmentCalls, [])
})

test("closed outline renders its final segment without duplicating source points and supports vertex keyboard adjustment", () => {
  const points = [{ x: 0.2, y: 0.2 }, { x: 0.5, y: 0.2 }, { x: 0.5, y: 0.5 }]
  const view = mountFragment(points)
  assert.equal(view.container.querySelector("[data-tplo-draft] polyline").getAttribute("points"), "200,400 500,400 500,1000")
  view.change({ fragmentDrawing: false, geometry: { ...view.geometry, fragmentClosed: true }, keyboardTarget: { vertex: 1 } })
  assert.equal(view.container.querySelector("[data-tplo-draft] polyline").getAttribute("points"), "200,400 500,400 500,1000 200,400")
  fireEvent.keyDown(view.viewport(), { key: "ArrowRight", shiftKey: true })
  assert.deepEqual(view.changes, [])
  fireEvent.keyUp(view.viewport(), { key: "ArrowRight" })
  assert.equal(view.changes.length, 1)
  assert.deepEqual(view.changes[0].target, { vertex: 1 })
  assert.equal(view.changes[0].next.fragment[1].x, 0.51)
  assert.deepEqual(points[1], { x: 0.5, y: 0.2 })
})

const fragmentControls = changes => ({ points: null, activeVertex: null, canEdit: true,
  onBegin() {}, onSelect() {}, onInsert() {}, onRemoveVertex() {}, onClear() {}, ...changes })

test("fragment controls require explicit completion and respect minimum and maximum counts", () => {
  const copy = messages.workspace.tplo.fragment, calls = []
  const props = { name: "Osteotomia 1", count: 0, canEdit: true, marking: true, stale: false, onMark() {}, onUndo() {},
    onFinish: () => calls.push("finish"), onCancel: () => calls.push("cancel") }
  const elements = changes => provider(h(React.Fragment, null,
    h(CaseImageTploFragmentDrawing, { ...props, ...changes }), h(CaseImageTploFragmentActions, { ...props, ...changes })))
  const view = render(elements())
  assert.equal(view.getByRole("button", { name: copy.finish }).disabled, true)
  assert.equal(view.getByRole("button", { name: copy.undo }).disabled, true)
  view.rerender(elements({ count: 3 }))
  assert.deepEqual(calls, [])
  fireEvent.click(view.getByRole("button", { name: copy.finish }))
  fireEvent.click(view.getByRole("button", { name: copy.cancel }))
  assert.deepEqual(calls, ["finish", "cancel"])
  view.rerender(elements({ count: 500 }))
  assert.equal(view.getByRole("button", { name: copy.mark }).disabled, true)
  assert.ok(view.getByText(copy.limit))
  view.rerender(elements({ count: 3, canEdit: false }))
  for (const label of [copy.mark, copy.undo, copy.finish, copy.cancel, copy.discard]) {
    assert.equal(view.getByRole("button", { name: label }).disabled, true)
    fireEvent.click(view.getByRole("button", { name: label }))
  }
  assert.deepEqual(calls, ["finish", "cancel"])
})

test("saved osteotomies show two blocks, expand the rest and preserve the selected item when collapsed", () => {
  const copy = messages.workspace.tplo.read, selected = []
  const objects = Array.from({ length: 5 }, (_, index) => ({
    object: { id: `saved-${index + 1}`, label: `Osteotomia ${index + 1}`, visible: index !== 4, locked: false },
    measurement: { status: "available", radiusMm: 10 + index, rotationDegrees: index * 5 },
    simulation: { status: "unavailable", reason: "fragment" }, ambiguous: false,
  }))
  const props = { objects, selectedId: null, selectionDisabled: false, onSelect: id => selected.push(id),
    readError: false, canRetryRead: false, refreshing: false, onRetryRead() {} }
  const view = render(provider(h(CaseImageTploSaved, props)))
  const rows = () => [...view.container.querySelectorAll("[data-tplo-row]")]
  assert.deepEqual(rows().map(row => row.dataset.tploRow), ["saved-1", "saved-2"])
  assert.ok(rows()[0].textContent.includes("20,00 mm"))
  assert.equal(view.getByRole("button", { name: copy.expand }).getAttribute("aria-expanded"), "false")
  fireEvent.click(view.getByRole("button", { name: copy.expand }))
  assert.equal(rows().length, 4)
  fireEvent.click(rows()[3])
  assert.deepEqual(selected, ["saved-4"])
  view.rerender(provider(h(CaseImageTploSaved, { ...props, selectedId: "saved-4" })))
  fireEvent.click(view.getByRole("button", { name: copy.collapse }))
  assert.deepEqual(rows().map(row => row.dataset.tploRow), ["saved-1", "saved-4"])
  assert.equal(rows()[1].getAttribute("aria-pressed"), "true")
  fireEvent.click(rows()[1])
  assert.deepEqual(selected, ["saved-4"])
  view.rerender(provider(h(CaseImageTploSaved, { ...props, objects: objects.slice(0, 2), selectionDisabled: true })))
  assert.equal(rows().length, 2)
  assert.equal(view.queryByRole("button", { name: copy.expand }), null)
  for (const row of rows()) { assert.equal(row.disabled, true); fireEvent.click(row) }
  assert.deepEqual(selected, ["saved-4"])
  view.rerender(provider(h(CaseImageTploSaved, { ...props, objects: [] })))
  assert.equal(rows().length, 0)
  assert.ok(view.getByText(copy.empty))
})

test("vertex controls allow explicit selection/insertion, guard three-point removal and disclose degeneracy", () => {
  const copy = messages.workspace.tplo.fragment, calls = []
  const props = fragmentControls({ points: Array(3).fill({ x: 0.4, y: 0.4 }), activeVertex: 1,
    onInsert: () => calls.push("insert"), onSelect: index => calls.push(index), onClear: () => calls.push("clear") })
  const view = render(provider(h(CaseImageTploFragmentControls, props)))
  assert.ok(view.getByText(copy.degenerate))
  assert.equal(view.getByRole("button", { name: copy.removeVertex }).disabled, true)
  fireEvent.change(view.getByRole("combobox", { name: copy.select }), { target: { value: "2" } })
  fireEvent.click(view.getByRole("button", { name: copy.insert }))
  fireEvent.click(view.container.querySelector("summary"))
  fireEvent.click(view.getByRole("button", { name: copy.clear }))
  assert.deepEqual(calls, [2, "insert", "clear"])
})

function fragmentEnvironment(fragmentPoints = [{ x: 0.1, y: 0.1 }, { x: 0.4, y: 0.1 }, { x: 0.3, y: 0.4 }]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity, refetchOnMount: false, refetchOnReconnect: false } } })
  clients.add(client)
  const image = { id, caseId: "a4302086-7b81-482d-a11a-b9f4b29e11b1", status: "READY", kind: "PNG", widthPx: 1000, heightPx: 2000 }
  const fragment = { label: "keep", points: fragmentPoints }
  const object = { id, type: "TPLO", center: { x: 0.5, y: 0.5 }, edge: { x: 0.6, y: 0.5 }, rotation_degrees: -25, fragment, visible: true, locked: false }
  const plan = { imageId: id, revision: 4, updatedAt: null, document: { schema_version: 1, objects: [object], calibration: {
    kind: "REFERENCE_LINE", start: { x: 0.1, y: 0.1 }, end: { x: 0.2, y: 0.1 }, known_length_mm: 10,
    result: { calibration_id: "a".repeat(64), reference_length_px: 100, mm_per_pixel: 0.1 } } } }
  client.setQueryData(keys.imagePlan(image.caseId, id), plan)
  return { client, image, fragment, plan }
}

function fragmentHook() {
  const { client, image, fragment, plan } = fragmentEnvironment()
  const wrapper = ({ children }) => h(QueryClientProvider, { client }, provider(children))
  const view = renderHook(() => useImageTplo(image, true, false, { active: true, toolActive: true, calibrationEditing: false }), { wrapper })
  return { ...view, client, image, fragment, plan }
}

test("hook preserves its backup, blocks incomplete commands and rejects stale fragment callbacks", async () => {
  const view = fragmentHook()
  await waitFor(() => assert.equal(view.result.current.canEdit, true))
  act(() => { assert.equal(view.result.current.beginUpdate(id), true) })
  await waitFor(() => assert.ok(view.result.current.editor))
  act(() => { assert.equal(view.result.current.beginFragment(id), true) })
  await waitFor(() => assert.equal(view.result.current.editor.fragmentComplete, false))
  const staleAppend = view.result.current.appendFragmentPoint
  act(() => { assert.equal(staleAppend({ x: 0.3, y: 0.2 }, 0, id), true) })
  await waitFor(() => assert.equal(view.result.current.editor.fragment.points.length, 1))
  act(() => { assert.equal(staleAppend({ x: 0.6, y: 0.6 }, 1, id), false) })
  assert.equal(view.result.current.command(), null)
  assert.equal(view.result.current.canSave, false)
  act(() => { assert.equal(view.result.current.cancelFragment(id), true) })
  await waitFor(() => assert.equal(view.result.current.editor.fragmentComplete, true))
  assert.deepEqual(view.result.current.editor.fragment, view.fragment)
  assert.equal(view.result.current.hasChanges, false)
})

test("revision changes block contour completion while keeping the unfinished draft", async () => {
  const view = fragmentHook()
  act(() => { assert.equal(view.result.current.beginUpdate(id), true) })
  await waitFor(() => assert.ok(view.result.current.editor))
  act(() => { assert.equal(view.result.current.beginFragment(id), true) })
  await waitFor(() => assert.equal(view.result.current.editor.fragmentComplete, false))
  const previous = view.result.current.editor
  act(() => { view.client.setQueryData(keys.imagePlan(view.image.caseId, id), { ...view.plan, revision: 5 }) })
  await waitFor(() => assert.equal(view.result.current.needsRebase, true))
  act(() => { assert.equal(view.result.current.finishFragment(id), false); assert.equal(view.result.current.appendFragmentPoint({ x: 0.3, y: 0.2 }, 0, id), false) })
  assert.deepEqual(view.result.current.editor, previous)
  assert.equal(view.result.current.canSave, false)
})

test("hook completes, inserts, removes and clears only origin fragment data", async () => {
  const view = fragmentHook()
  act(() => { assert.equal(view.result.current.beginUpdate(id), true) })
  await waitFor(() => assert.ok(view.result.current.editor))
  act(() => { assert.equal(view.result.current.beginFragment(id), true) })
  await waitFor(() => assert.equal(view.result.current.editor.fragmentComplete, false))
  const points = [{ x: 0.2, y: 0.2 }, { x: 0.5, y: 0.2 }, { x: 0.5, y: 0.5 }]
  for (const [count, point] of points.entries()) {
    act(() => { assert.equal(view.result.current.appendFragmentPoint(point, count, id), true) })
    await waitFor(() => assert.equal(view.result.current.editor.fragment.points.length, count + 1))
  }
  assert.equal(view.result.current.command(), null)
  act(() => { assert.equal(view.result.current.finishFragment(id), true) })
  await waitFor(() => assert.equal(view.result.current.editor.fragmentComplete, true))
  assert.deepEqual(view.result.current.command().fragment.points, points)
  assert.equal("fragmentBeforeEdit" in view.result.current.command(), false)
  act(() => { assert.equal(view.result.current.insertFragmentVertex(2, id), true) })
  await waitFor(() => assert.equal(view.result.current.ui.activeVertex, 3))
  assert.equal(view.result.current.editor.fragment.points.length, 4)
  act(() => { assert.equal(view.result.current.removeFragmentVertex(3, id), true) })
  await waitFor(() => assert.equal(view.result.current.editor.fragment.points.length, 3))
  assert.deepEqual(view.result.current.editor.fragment.points, points)
  act(() => { assert.equal(view.result.current.clearFragment(id), true) })
  await waitFor(() => assert.equal(view.result.current.editor.fragment, null))
  assert.equal(view.result.current.command().fragment, null)
  assert.equal(view.result.current.editor.rotation_degrees, -25)
  assert.deepEqual(view.result.current.editor.center, { x: 0.5, y: 0.5 })
  assert.deepEqual(view.client.getQueryData(keys.imagePlan(view.image.caseId, id)), view.plan)
})

async function mountFragmentWorkspace(fragmentPoints) {
  const { client, image, fragment, plan } = fragmentEnvironment(fragmentPoints)
  const source = plan.document.objects[0]
  const draft = { kind: "tplo-update", id, baseRevision: 4, center: source.center, edge: source.edge,
    rotation_degrees: source.rotation_degrees, fragment, fragmentComplete: true }
  client.setQueryData(keys.imageTploDraft(image.caseId, id), draft)
  client.setQueryData(keys.preview(image.caseId, id), { url: rendering.url, widthPx: 1000, heightPx: 2000,
    expiresAt: new Date(Date.now() + 600000).toISOString() })
  const readyImage = { ...image, originalFilename: "local.png", displayName: null, previewAvailable: true, previewWidthPx: 1000, previewHeightPx: 2000 }
  const view = render(h(QueryClientProvider, { client }, provider(h(UnsavedChangesGuard, null, h(CaseImageWorkspace, {
    image: readyImage, activeSection: "tools", onSectionChange() {}, caseContext: null, imageList: null, imageActions: null, caseLocked: false,
  })))))
  fireEvent.load(view.getByRole("img"))
  view.getByRole("img").parentElement.getBoundingClientRect = () => rect
  await waitFor(() => assert.equal(view.getByRole("combobox", { name: messages.workspace.tplo.fragment.select }).disabled, false))
  return { ...view, client, image, fragment, plan, draft: () => client.getQueryData(keys.imageTploDraft(image.caseId, id)),
    viewport: () => view.container.querySelector("[data-calibration-viewport]") }
}

test("workspace couples card, hook and viewer for redraw, completion and cancellation without writes", async () => {
  const view = await mountFragmentWorkspace(), copy = messages.workspace.tplo.fragment
  fireEvent.click(view.container.querySelector("[data-tplo-fragment-controls] summary"))
  fireEvent.click(view.getByRole("button", { name: copy.redraw }))
  await waitFor(() => assert.equal(view.draft().fragmentComplete, false))
  assert.equal(view.queryByLabelText(messages.workspace.tplo.placement.diameter), null)
  const card = view.container.querySelector("[data-tplo-fragment-drawing]")
  assert.ok(card)
  assert.equal(view.container.querySelector("[data-tplo-values]"), null)
  assert.equal(view.queryByRole("button", { name: messages.workspace.tplo.geometry.update, exact: true }), null)
  assert.equal(card.contains(view.getByRole("button", { name: copy.finish })), false)
  for (const [index, point] of [[200, 250], [260, 250], [240, 330]].entries()) {
    click(view, ...point)
    await waitFor(() => assert.equal(view.draft().fragment.points.length, index + 1))
  }
  assert.equal(view.container.querySelector("[data-tplo-draft] polyline").getAttribute("points").split(" ").length, 3)
  fireEvent.click(view.getByRole("button", { name: copy.undo }))
  await waitFor(() => assert.equal(view.draft().fragment.points.length, 2))
  assert.equal(view.getByRole("button", { name: copy.finish }).disabled, true)
  click(view, 240, 330)
  await waitFor(() => assert.equal(view.draft().fragment.points.length, 3))
  fireEvent.click(view.getByRole("button", { name: copy.finish }))
  await waitFor(() => assert.equal(view.draft().fragmentComplete, true))
  const completed = structuredClone(view.draft())
  assert.equal(view.container.querySelector("[data-tplo-draft] polyline").getAttribute("points").split(" ").length, 4)
  fireEvent.click(view.container.querySelector("[data-tplo-fragment-controls] summary"))
  fireEvent.click(view.getByRole("button", { name: copy.redraw }))
  await waitFor(() => assert.equal(view.draft().fragmentComplete, false))
  click(view, 350, 350)
  await waitFor(() => assert.equal(view.draft().fragment.points.length, 1))
  fireEvent.click(view.getByRole("button", { name: copy.discard }))
  await waitFor(() => assert.equal(view.draft().fragmentComplete, true))
  assert.deepEqual(view.draft().fragment, completed.fragment)
  assert.deepEqual(view.draft().center, completed.center)
  assert.equal(view.draft().rotation_degrees, completed.rotation_degrees)
  assert.deepEqual(view.client.getQueryData(keys.imagePlan(view.image.caseId, id)), view.plan)
})

test("workspace keeps a selected vertex gesture alive while the card is disabled and commits only that vertex", async () => {
  const view = await mountFragmentWorkspace(), copy = messages.workspace.tplo.fragment
  fireEvent.change(view.getByRole("combobox", { name: copy.select }), { target: { value: "1" } })
  await waitFor(() => assert.equal(view.client.getQueryData(keys.imageTploEditorUi(view.image.caseId, id)).activeVertex, 1))
  const before = structuredClone(view.draft())
  fireEvent.keyDown(view.viewport(), { key: "ArrowRight", shiftKey: true })
  await waitFor(() => assert.equal(view.getByRole("combobox", { name: copy.select }).disabled, true))
  assert.deepEqual(view.draft(), before)
  fireEvent.keyUp(view.viewport(), { key: "ArrowRight" })
  await waitFor(() => assert.equal(view.draft().fragment.points[1].x, 0.41))
  assert.deepEqual(view.draft().fragment.points[0], before.fragment.points[0])
  assert.deepEqual(view.draft().fragment.points[2], before.fragment.points[2])
  assert.equal(view.draft().rotation_degrees, before.rotation_degrees)
  await waitFor(() => assert.equal(view.getByRole("combobox", { name: copy.select }).disabled, false))
  assert.deepEqual(view.client.getQueryData(keys.imagePlan(view.image.caseId, id)), view.plan)
})

test("workspace drags an explicitly selected vertex on the cut edge without resizing the cut", async () => {
  const points = [{ x: 0.6, y: 0.5 }, { x: 0.4, y: 0.1 }, { x: 0.3, y: 0.4 }]
  const view = await mountFragmentWorkspace(points), copy = messages.workspace.tplo.fragment
  fireEvent.change(view.getByRole("combobox", { name: copy.select }), { target: { value: "0" } })
  await waitFor(() => assert.equal(view.client.getQueryData(keys.imageTploEditorUi(view.image.caseId, id)).activeVertex, 0))
  const before = structuredClone(view.draft())
  fireEvent.pointerDown(view.viewport(), { clientX: 340, clientY: 450, button: 0 })
  fireEvent.pointerMove(view.viewport(), { clientX: 360, clientY: 490 })
  assert.deepEqual(view.draft(), before)
  fireEvent.pointerUp(view.viewport(), { clientX: 360, clientY: 490, button: 0 })
  await waitFor(() => assert.deepEqual(view.draft().fragment.points[0], { x: 0.65, y: 0.55 }))
  assert.deepEqual(view.draft().fragment.points.slice(1), before.fragment.points.slice(1))
  assert.deepEqual(view.draft().center, before.center)
  assert.deepEqual(view.draft().edge, before.edge)
  assert.equal(view.draft().rotation_degrees, before.rotation_degrees)
})

test("viewer keeps explicit vertex editing when a different osteotomy lies under the same pointer", () => {
  const selections = [], changed = [], view = mountViewer({ placement: null })
  const geometry = { center: { x: 0.5, y: 0.5 }, edge: { x: 0.6, y: 0.5 },
    fragment: [{ x: 0.2, y: 0.2 }, { x: 0.3, y: 0.2 }, { x: 0.2, y: 0.4 }], fragmentClosed: true }
  const other = { id: "a4302086-7b81-482d-a11a-b9f4b29e11b2", center: { x: 0.2, y: 0.2 }, edge: { x: 0.25, y: 0.2 }, fragment: null }
  view.change({ geometry, keyboardTarget: { vertex: 0 }, picking: { objects: [other, { ...geometry, id }], selectedId: id,
    enabled: true, baseRevision: 4, contextGeneration: 1, onSelect: value => selections.push(value) }, onGeometryChange: next => changed.push(next) })
  fireEvent.pointerDown(view.viewport(), { clientX: 180, clientY: 210, button: 0 })
  fireEvent.pointerMove(view.viewport(), { clientX: 200, clientY: 250 })
  fireEvent.pointerUp(view.viewport(), { clientX: 200, clientY: 250, button: 0 })
  assert.deepEqual(selections, [])
  assert.equal(changed.length, 1)
  assert.deepEqual(changed[0].fragment[0], { x: 0.25, y: 0.25 })
  assert.deepEqual(changed[0].center, geometry.center)
  assert.deepEqual(changed[0].edge, geometry.edge)
})

const analyticSimulation = { id, source: "preview", matrix: [[0, -1, 1500], [1, 0, 500]],
  originPointsPx: [{ x: 600, y: 1000 }, { x: 500, y: 1200 }, { x: 400, y: 1000 }],
  pointsPx: [{ x: 500, y: 1100 }, { x: 300, y: 1000 }, { x: 500, y: 900 }] }

test("composition clips in original pixels, removes the source region and reuses one filtered SVG asset", () => {
  const view = mountViewer({ placement: null, simulation: analyticSimulation, brightness: 120, contrast: 80, inverted: true })
  const asset = view.container.querySelector("svg image")
  assert.equal(view.container.querySelectorAll("svg image").length, 1)
  assert.equal(asset.getAttribute("href"), rendering.url)
  assert.equal(asset.getAttribute("width"), "1000")
  assert.equal(asset.getAttribute("height"), "2000")
  assert.equal(view.container.querySelector("clipPath polygon").getAttribute("points"), "600,1000 500,1200 400,1000")
  assert.equal(view.container.querySelector("mask polygon").getAttribute("fill"), "black")
  assert.equal(view.getByRole("img").style.opacity, "")
  fireEvent.load(asset)
  assert.equal(view.getByRole("img").style.opacity, "0")
  assert.equal(view.container.querySelectorAll("[data-tplo-composition] use").length, 2)
  assert.equal(view.container.querySelector("[data-tplo-fragment-transform]").getAttribute("transform"), "matrix(0 1 -1 0 1500 500)")
  assert.equal(view.container.querySelector("[data-tplo-composition]").style.filter, view.getByRole("img").style.filter)
  assert.equal(view.container.querySelector("[data-tplo-simulation-contour]").style.filter, "")
})

test("texture failure keeps the source image and transformed outline and permits a local retry", () => {
  let errors = 0, retries = 0
  const view = mountViewer({ placement: null, simulation: analyticSimulation, onTextureError: () => errors++, onTextureRetry: () => retries++ })
  fireEvent.error(view.container.querySelector("svg image"))
  assert.equal(errors, 1)
  assert.equal(view.getByRole("img").style.opacity, "")
  assert.ok(view.container.querySelector("[data-tplo-simulation-contour]"))
  assert.ok(view.getByText(messages.workspace.tplo.simulation.textureError))
  fireEvent.click(view.getByRole("button", { name: messages.workspace.tplo.simulation.textureRetry }))
  assert.equal(retries, 1)
  fireEvent.load(view.container.querySelector("svg image"))
  assert.equal(view.getByRole("img").style.opacity, "0")
  assert.equal(view.queryByText(messages.workspace.tplo.simulation.textureError), null)
})

test("pointer rotation commits only an angle, with the same original sign on mirrored and unmirrored views", () => {
  for (const mirrored of [false, true]) {
    const changed = [], previews = [], view = mountViewer({ placement: null, mirrored })
    const geometry = { center: { x: 0.5, y: 0.5 }, edge: { x: 0.6, y: 0.5 }, fragment: [{ x: 0.6, y: 0.5 }, { x: 0.5, y: 0.6 }, { x: 0.4, y: 0.5 }] }
    view.change({ geometry, originEditable: false, rotation: { degrees: 0, active: true, enabled: true,
      onPreview: degrees => previews.push(degrees), onChange: degrees => changed.push(degrees) } })
    const handle = view.container.querySelector("[data-tplo-rotation-handle] circle")
    const x = Number(handle.getAttribute("cx")), y = Number(handle.getAttribute("cy")), radius = x - 500
    const clientX = point => rect.left + (mirrored ? 1000 - point : point) / 1000 * rect.width
    fireEvent.pointerDown(view.viewport(), { clientX: clientX(x), clientY: rect.top + y / 2000 * rect.height, button: 0 })
    fireEvent.pointerMove(view.viewport(), { clientX: clientX(500), clientY: rect.top + (1000 + radius) / 2000 * rect.height })
    assert.deepEqual(changed, [])
    assert.ok(Math.abs(previews.at(-1) - 90) < 1e-10)
    fireEvent.pointerUp(view.viewport(), { clientX: clientX(500), clientY: rect.top + (1000 + radius) / 2000 * rect.height, button: 0 })
    assert.equal(changed.length, 1)
    assert.ok(Math.abs(changed[0] - 90) < 1e-10)
    assert.deepEqual(view.calls, [])
    view.unmount()
  }
})

test("rotation keyboard preview cancels on Esc/context and rejects old repeats", () => {
  const changed = [], previews = [], view = mountViewer({ placement: null })
  const geometry = { center: { x: 0.5, y: 0.5 }, edge: { x: 0.6, y: 0.5 }, fragment: [] }
  view.change({ geometry, originEditable: false, rotation: { degrees: 0, active: true, enabled: true,
    onPreview: degrees => previews.push(degrees), onChange: degrees => changed.push(degrees) } })
  fireEvent.keyDown(view.viewport(), { key: "ArrowRight", shiftKey: true })
  assert.equal(previews.at(-1), 10)
  assert.deepEqual(changed, [])
  fireEvent.keyDown(view.viewport(), { key: "Escape" })
  fireEvent.keyDown(view.viewport(), { key: "ArrowRight", repeat: true })
  fireEvent.keyUp(view.viewport(), { key: "ArrowRight" })
  assert.deepEqual(changed, [])
  fireEvent.keyDown(view.viewport(), { key: "ArrowLeft" })
  view.change({ contextGeneration: 2 })
  fireEvent.keyUp(view.viewport(), { key: "ArrowLeft" })
  assert.deepEqual(changed, [])
  fireEvent.keyDown(view.viewport(), { key: "ArrowUp" })
  fireEvent.keyUp(view.viewport(), { key: "ArrowUp" })
  assert.deepEqual(changed, [1])
})

test("workspace rotation and comparison keep source points intact and share transient card/contour values", async () => {
  const view = await mountFragmentWorkspace(), copy = messages.workspace.tplo.simulation
  const before = structuredClone(view.draft())
  const input = view.getByLabelText(copy.rotationInput)
  fireEvent.change(input, { target: { value: "90" } })
  assert.deepEqual(view.draft(), before)
  fireEvent.submit(input.closest("form"))
  await waitFor(() => assert.equal(view.draft().rotation_degrees, 90))
  assert.deepEqual(view.draft().fragment, before.fragment)
  assert.deepEqual(view.draft().center, before.center)
  assert.ok(view.container.querySelector('[data-tplo-simulation-contour][data-tplo-result-source="preview"]'))
  fireEvent.click(view.getByRole("button", { name: copy.original, exact: true }))
  await waitFor(() => assert.equal(view.container.querySelector("[data-tplo-simulation-contour]"), null))
  fireEvent.click(view.getByRole("button", { name: copy.simulated, exact: true }))
  fireEvent.click(view.getByRole("button", { name: copy.rotate }))
  await waitFor(() => assert.ok(view.container.querySelector("[data-tplo-rotation-handle]")))
  fireEvent.keyDown(view.viewport(), { key: "ArrowRight", shiftKey: true })
  assert.equal(view.draft().rotation_degrees, 90)
  assert.ok(view.container.querySelector("[data-tplo-rotation-value]").textContent.includes("100"))
  assert.ok(view.container.querySelector("[data-tplo-rotation-handle] text").textContent.includes("100"))
  fireEvent.keyUp(view.viewport(), { key: "ArrowRight" })
  await waitFor(() => assert.equal(view.draft().rotation_degrees, 100))
  assert.equal(view.getByLabelText(copy.rotationInput).value, "100")
  assert.deepEqual(view.draft().fragment, before.fragment)
  assert.deepEqual(view.client.getQueryData(keys.imagePlan(view.image.caseId, id)), view.plan)
})

test("numeric rotation accepts zero and signed extremes, rejects invalid input, and remains explicit", () => {
  const calls = [], copy = messages.workspace.tplo.simulation
  const view = render(provider(h(CaseImageTploRotationControls, { degrees: 0, previewDegrees: null, canEdit: true, canRotate: true,
    active: false, source: "preview", statusText: copy.preview, comparison: { value: "original", enabled: true, canSimulate: true, onChange() {} },
    onApply: degrees => { calls.push(degrees); return true }, onRotate() {} })))
  const input = view.getByLabelText(copy.rotationInput)
  for (const value of ["0", "-180", "180", "-25,125"]) {
    fireEvent.change(input, { target: { value } })
    fireEvent.submit(input.closest("form"))
  }
  assert.deepEqual(calls, [0, -180, 180, -25.125])
  for (const value of ["", "NaN", "Infinity", "181", "-181", "0x20"]) {
    fireEvent.change(input, { target: { value } })
    fireEvent.submit(input.closest("form"))
  }
  assert.deepEqual(calls, [0, -180, 180, -25.125])
  assert.ok(view.getByRole("alert"))
})

test("texture recovery retains a decoded preview on renewal failure and resets when its URL changes", async () => {
  const { client, image } = fragmentEnvironment()
  const source = { url: rendering.url, widthPx: 1000, heightPx: 2000, expiresAt: new Date(Date.now() + 600000).toISOString() }
  client.setQueryData(keys.preview(image.caseId, id), source)
  const wrapper = ({ children }) => h(QueryClientProvider, { client }, children)
  const view = renderHook(() => useCaseImagePreview({ ...image, previewAvailable: true }), { wrapper })
  act(() => view.result.current.onImageLoad())
  await waitFor(() => assert.equal(view.result.current.ready, true))
  act(() => view.result.current.onTextureError())
  act(() => client.getQueryCache().find({ queryKey: keys.preview(image.caseId, id), exact: true }).setState({ status: "error", error: Error("renewal unavailable") }))
  await waitFor(() => assert.equal(view.result.current.query.isError, true))
  assert.equal(view.result.current.textureFallback, true)
  assert.equal(view.result.current.ready, true)
  act(() => client.setQueryData(keys.preview(image.caseId, id), { ...source, url: "https://example.invalid/renewed.png" }))
  await waitFor(() => assert.equal(view.result.current.ready, false))
  act(() => view.result.current.onImageLoad())
  await waitFor(() => assert.equal(view.result.current.ready, true))
  assert.equal(view.result.current.textureFallback, false)
})

test("review: committed rotation clears old input errors and never resurrects earlier unapplied text", () => {
  const copy = messages.workspace.tplo.simulation
  const props = { degrees: 0, previewDegrees: null, canEdit: true, canRotate: true, active: false,
    source: "preview", statusText: copy.preview, comparison: { value: "original", enabled: true, canSimulate: true, onChange() {} },
    onApply() { return true }, onRotate() {} }
  const view = render(provider(h(CaseImageTploRotationControls, props)))
  fireEvent.change(view.getByLabelText(copy.rotationInput), { target: { value: "17" } })
  view.rerender(provider(h(CaseImageTploRotationControls, { ...props, previewDegrees: 10 })))
  assert.equal(view.getByLabelText(copy.rotationInput).value, "17")
  view.rerender(provider(h(CaseImageTploRotationControls, props)))
  fireEvent.change(view.getByLabelText(copy.rotationInput), { target: { value: "181" } })
  fireEvent.submit(view.getByLabelText(copy.rotationInput).closest("form"))
  assert.ok(view.getByRole("alert"))
  view.getByLabelText(copy.rotationInput).focus()
  view.rerender(provider(h(CaseImageTploRotationControls, { ...props, degrees: 10 })))
  assert.equal(view.getByLabelText(copy.rotationInput).value, "10")
  assert.ok(document.activeElement === view.getByLabelText(copy.rotationInput), "synchronizing a committed angle must preserve keyboard focus")
  assert.ok(view.queryByRole("alert") === null, "a committed angle must clear the obsolete validation error")
  view.rerender(provider(h(CaseImageTploRotationControls, props)))
  assert.equal(view.getByLabelText(copy.rotationInput).value, "0")
})

test("review: a texture failure before the base load still preserves the decoded image when renewal fails", async () => {
  const { client, image } = fragmentEnvironment()
  client.setQueryData(keys.preview(image.caseId, id), { ...rendering, expiresAt: new Date(Date.now() + 600000).toISOString() })
  const wrapper = ({ children }) => h(QueryClientProvider, { client }, children)
  const view = renderHook(() => useCaseImagePreview({ ...image, previewAvailable: true }), { wrapper })
  act(() => view.result.current.onTextureError())
  act(() => view.result.current.onImageLoad())
  act(() => client.getQueryCache().find({ queryKey: keys.preview(image.caseId, id), exact: true }).setState({ status: "error", error: Error("renewal unavailable") }))
  await waitFor(() => assert.equal(view.result.current.query.isError, true))
  assert.equal(view.result.current.textureFallback, true)
  assert.equal(view.result.current.ready, true)
})

test("review: an already cached image can become ready before passive effects", () => {
  const { client, image } = fragmentEnvironment()
  client.setQueryData(keys.preview(image.caseId, id), { ...rendering, expiresAt: new Date(Date.now() + 600000).toISOString() })
  const wrapper = ({ children }) => h(QueryClientProvider, { client }, children)
  const view = renderHook(() => {
    const preview = useCaseImagePreview({ ...image, previewAvailable: true })
    React.useLayoutEffect(() => { preview.onImageLoad() }, [])
    return preview
  }, { wrapper })
  assert.equal(view.result.current.ready, true)
})

test("review: decoded preview state and late callbacks are isolated by image, URL and unmount", async () => {
  const { client, image } = fragmentEnvironment()
  const other = { ...image, id: "a4302086-7b81-482d-a11a-b9f4b29e11b3" }
  const source = { ...rendering, expiresAt: new Date(Date.now() + 600000).toISOString() }
  for (const item of [image, other]) client.setQueryData(keys.preview(item.caseId, item.id), source)
  const wrapper = ({ children }) => h(QueryClientProvider, { client }, children)
  const view = renderHook(({ selected }) => useCaseImagePreview({ ...selected, previewAvailable: true }), { initialProps: { selected: image }, wrapper })
  act(() => view.result.current.onImageLoad())
  assert.equal(view.result.current.ready, true)
  const first = view.result.current
  view.rerender({ selected: other })
  assert.equal(view.result.current.ready, false, "equal URLs must not carry decoded state across images")
  act(() => { first.onImageLoad(); first.onImageError(); first.onTextureError(); first.refreshTexture(); first.refresh() })
  assert.equal(view.result.current.ready, false)
  assert.equal(view.result.current.displayFailed, false)
  act(() => view.result.current.onImageLoad())
  assert.equal(view.result.current.ready, true)
  const previousUrl = view.result.current
  act(() => client.setQueryData(keys.preview(other.caseId, other.id), { ...source, url: "https://example.invalid/another-preview.png" }))
  await waitFor(() => assert.equal(view.result.current.ready, false))
  act(() => { previousUrl.onImageLoad(); previousUrl.onImageError(); previousUrl.onTextureError(); previousUrl.refreshTexture() })
  assert.equal(view.result.current.ready, false)
  assert.equal(view.result.current.displayFailed, false)
  const beforeBlocking = view.result.current
  view.rerender({ selected: { ...other, status: "REJECTED" } })
  act(() => { beforeBlocking.onImageLoad(); beforeBlocking.onImageError(); beforeBlocking.refreshTexture() })
  assert.equal(view.result.current.ready, false)
  const beforeUnmount = view.result.current
  view.unmount()
  act(() => { beforeUnmount.onImageLoad(); beforeUnmount.onImageError(); beforeUnmount.refreshTexture(); beforeUnmount.refresh() })
  assert.equal(requests, 0)
})

test("review: rotation pointer cancellation, generation and read-only state never commit or change origin", () => {
  const commits = [], previews = [], geometry = { center: { x: 0.5, y: 0.5 }, edge: { x: 0.6, y: 0.5 }, fragment: [] }
  const view = mountViewer({ placement: null })
  const rotation = { degrees: 0, active: true, enabled: true, onPreview: value => previews.push(value), onChange: value => commits.push(value) }
  view.change({ geometry, originEditable: false, rotation })
  const start = () => {
    const handle = view.container.querySelector("[data-tplo-rotation-handle] circle")
    const x = Number(handle.getAttribute("cx")), y = Number(handle.getAttribute("cy"))
    fireEvent.pointerDown(view.viewport(), { clientX: rect.left + x / 1000 * rect.width, clientY: rect.top + y / 2000 * rect.height, button: 0 })
    fireEvent.pointerMove(view.viewport(), { clientX: 300, clientY: 530 })
    assert.ok(previews.at(-1) !== null)
  }
  const release = () => fireEvent.pointerUp(view.viewport(), { clientX: 300, clientY: 530, button: 0 })
  for (const cancel of [() => fireEvent.pointerCancel(view.viewport()), () => fireEvent.lostPointerCapture(view.viewport()),
    () => fireEvent.keyDown(view.viewport(), { key: "Escape" }), () => fireEvent.blur(window)]) {
    start(); cancel(); release()
    assert.equal(previews.at(-1), null)
    assert.deepEqual(commits, [])
  }
  start(); view.change({ contextGeneration: 2 }); release()
  assert.deepEqual(commits, [])
  start(); view.change({ editable: false }); release()
  fireEvent.keyDown(view.viewport(), { key: "ArrowRight" }); fireEvent.keyUp(view.viewport(), { key: "ArrowRight" })
  assert.deepEqual(commits, [])
  view.change({ editable: true, rotation: { ...rotation, enabled: false } })
  click(view, 369, 450)
  fireEvent.keyDown(view.viewport(), { key: "ArrowRight" }); fireEvent.keyUp(view.viewport(), { key: "ArrowRight" })
  assert.deepEqual(commits, [])
})

test("stage 10: incomplete parameter fields remain a protected draft, require explicit side and reject stale callbacks", async () => {
  const view = fragmentHook()
  act(() => { assert.equal(view.result.current.beginParameters(), true) })
  await waitFor(() => assert.equal(view.result.current.editor.kind, "tplo-parameters-set"))
  const fields = { ...tploParameterFields(null), blade_diameter_mm: "-" }
  act(() => { assert.equal(view.result.current.changeParameterFields(fields), true) })
  await waitFor(() => assert.equal(view.result.current.hasChanges, true))
  assert.equal(view.result.current.canSave, false)
  assert.equal(view.result.current.command(), null)
  assert.equal(view.result.current.editor.parameterFields.blade_diameter_mm, "-")
  act(() => { assert.equal(view.result.current.beginUpdate(id), false) })
  const stale = view.result.current.changeParameterFields
  act(() => { assert.equal(stale({ ...fields, laterality: "LEFT", blade_diameter_mm: "24,74123456789", current_slope_degrees: "0" }), true) })
  await waitFor(() => assert.equal(view.result.current.canSave, true))
  assert.deepEqual(view.result.current.command().parameters, { laterality: "LEFT", current_slope_degrees: 0, blade_diameter_mm: 24.74123456789 })
  act(() => { assert.equal(stale({ ...fields, laterality: "RIGHT", blade_diameter_mm: "30" }), false) })
  const before = view.result.current.editor
  act(() => view.client.setQueryData(keys.imagePlan(view.image.caseId, id), { ...view.plan, revision: 5 }))
  await waitFor(() => assert.equal(view.result.current.needsRebase, true))
  assert.equal(view.result.current.canSave, false)
  assert.deepEqual(view.result.current.editor, before)
})

test("stage 10: workspace restores a parameter draft separately from the cut, retains invalid text and discards only its intent", async () => {
  const view = await mountFragmentWorkspace(), p = messages.workspace.tplo.parameters
  const objects = structuredClone(view.plan.document.objects)
  assert.equal(view.container.querySelector("[data-tplo-reference]"), null)
  act(() => view.client.setQueryData(keys.imageTploDraft(view.image.caseId, id), {
    kind: "tplo-parameters-set", baseRevision: 4, parameters: {}, parameterFields: tploParameterFields(null),
  }))
  await waitFor(() => assert.ok(view.container.querySelector("[data-tplo-parameters]")))
  assert.ok(document.activeElement === view.getByRole("combobox", { name: p.laterality }))
  assert.equal(view.getByRole("combobox", { name: p.laterality }).value, "")
  fireEvent.change(view.getByLabelText(p.blade_diameter_mm), { target: { value: "-" } })
  await waitFor(() => assert.equal(view.draft().parameterFields.blade_diameter_mm, "-"))
  assert.equal(view.getByRole("button", { name: p.save }).disabled, true)
  fireEvent.change(view.getByRole("combobox", { name: p.laterality }), { target: { value: "LEFT" } })
  fireEvent.change(view.getByLabelText(p.blade_diameter_mm), { target: { value: "30" } })
  await waitFor(() => assert.equal(view.getByRole("button", { name: p.save }).disabled, false))
  assert.deepEqual(view.draft().parameters, { laterality: "LEFT", blade_diameter_mm: 30 })
  assert.equal(view.getByLabelText(p.current_slope_degrees).value, "")
  assert.equal(view.getByLabelText(p.target_slope_degrees).value, "")
  assert.deepEqual(view.client.getQueryData(keys.imagePlan(view.image.caseId, id)).document.objects, objects)
  fireEvent.click(view.getByRole("button", { name: p.cancel, exact: true }))
  await waitFor(() => assert.equal(view.draft(), null))
  assert.deepEqual(view.client.getQueryData(keys.imagePlan(view.image.caseId, id)).document.objects, objects)
  assert.ok(view.container.querySelector("[data-tplo-saved]"))
  assert.ok(document.activeElement === view.viewport())
})

function tableHook(fetchImpl, initialTpa = 0) {
  const env = fragmentEnvironment()
  env.plan.document.tplo = { laterality: "LEFT", projection: "MEDIOLATERAL", blade_diameter_mm: 24, target_slope_degrees: 5 }
  env.plan.document.tplo_landmarks = { method: "MEDIAL_CONDYLE_CRANIAL_CRUCIATE_FULL_AXIS_V1", plateau_cranial: { x: 0.1, y: 0.1 }, plateau_caudal: { x: 0.2, y: 0.1 },
    intercondylar_midpoint: { x: 0.1, y: 0.2 }, talus_center: { x: 0.2, y: 0.2 } }
  env.plan.document.tplo_measurement = { method: env.plan.document.tplo_landmarks.method, status: "CALCULATED", tpa_degrees: initialTpa }
  env.client.setQueryData(keys.imagePlan(env.image.caseId, id), structuredClone(env.plan))
  const wrapper = ({ children }) => h(QueryClientProvider, { client: env.client }, provider(children))
  const view = renderHook(({ selected }) => {
    const tplo = useImageTplo(selected, true, false, { active: true, toolActive: true, calibrationEditing: false })
    return { tplo, table: useTploTableConsultation(selected, tplo, { active: true, fetchImpl }) }
  }, { initialProps: { selected: env.image }, wrapper })
  return { ...env, ...view }
}
const tableResponse = (tpa = 0, blade = 24) => ({ configured: true, table_version: "v1", source: "local fixture", target_slope_degrees: 5,
  query: { tpa_degrees: tpa, blade_diameter_mm: blade }, match_count: 1, entries: [{ tpa_degrees: tpa, blade_diameter_mm: blade, rotation_mm: 8.4 }], recommendation_enabled: false })

test("stage 10: table query is explicit, deduplicated, uses exact official TPA and never changes an osteotomy", async () => {
  const calls = [], view = tableHook(async (url, init) => { calls.push({ url, init }); return Response.json(tableResponse(24.74123456789)) }, 24.74123456789)
  await waitFor(() => assert.equal(view.result.current.table.canConsult, true))
  assert.deepEqual(calls, [])
  await act(async () => { await Promise.all([view.result.current.table.consult(), view.result.current.table.consult()]) })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, "/api/cases/tplo/rotation-table?tpa_degrees=24.74123456789&blade_diameter_mm=24")
  assert.equal(calls[0].init.method, "GET")
  assert.equal(view.result.current.table.state.phase, "done")
  assert.equal(view.result.current.table.state.data.entries[0].rotation_mm, 8.4)
  assert.deepEqual(view.client.getQueryData(keys.imagePlan(view.image.caseId, id)).document.objects, view.plan.document.objects)
  assert.equal(view.result.current.tplo.editor, null)
})

test("stage 10: late table responses and callbacks cannot cross parameters, revision or image", async () => {
  const resolvers = [], calls = [], view = tableHook((url) => { calls.push(url); return new Promise(resolve => resolvers.push(resolve)) })
  await waitFor(() => assert.equal(view.result.current.table.canConsult, true))
  let first
  act(() => { first = view.result.current.table.consult() })
  await waitFor(() => assert.equal(resolvers.length, 1))
  const stale = view.result.current.table.consult
  act(() => { assert.equal(view.result.current.tplo.beginParameters(), true) })
  await waitFor(() => assert.equal(view.result.current.tplo.editor.kind, "tplo-parameters-set"))
  act(() => view.result.current.tplo.changeParameterFields({ ...tploParameterFields(view.plan.document.tplo), blade_diameter_mm: "30" }))
  await waitFor(() => assert.equal(view.result.current.table.filters.blade_diameter_mm, 30))
  await act(async () => { resolvers[0](Response.json(tableResponse())); await first; await stale() })
  assert.equal(view.result.current.table.state, null)
  assert.equal(calls.length, 1)
  let second
  act(() => { second = view.result.current.table.consult() })
  await waitFor(() => assert.equal(resolvers.length, 2))
  act(() => view.client.setQueryData(keys.imagePlan(view.image.caseId, id), { ...view.plan, revision: 5 }))
  await waitFor(() => assert.equal(view.result.current.tplo.needsRebase, true))
  await act(async () => { resolvers[1](Response.json(tableResponse(0, 30))); await second })
  assert.equal(view.result.current.table.state, null)
  assert.equal(view.result.current.table.canConsult, false)
  act(() => { view.client.setQueryData(keys.imagePlan(view.image.caseId, id), view.plan); view.client.setQueryData(keys.imageTploDraft(view.image.caseId, id), null) })
  await waitFor(() => assert.equal(view.result.current.table.canConsult, true))
  const other = { ...view.image, id: "a4302086-7b81-482d-a11a-b9f4b29e11b3", status: "REJECTED" }
  view.client.setQueryData(keys.imagePlan(other.caseId, other.id), { ...view.plan, imageId: other.id })
  const old = view.result.current.table.consult
  view.rerender({ selected: other })
  await act(async () => { await old() })
  assert.equal(calls.length, 2)
  assert.equal(view.result.current.table.state, null)
})

test("stage 10: table absence and session errors remain separate read states and do not block geometry", async () => {
  let fail = false
  const view = tableHook(async () => fail ? Response.json({ error: { code: "SESSION_UNAVAILABLE" } }, { status: 503 })
    : Response.json({ configured: false, table_version: null, source: null, match_count: 0, entries: [] }))
  await waitFor(() => assert.equal(view.result.current.table.canConsult, true))
  await act(async () => { await view.result.current.table.consult() })
  assert.equal(view.result.current.table.state.data.configured, false)
  act(() => { assert.equal(view.result.current.tplo.beginUpdate(id), true) })
  await waitFor(() => assert.equal(view.result.current.tplo.canEdit, true))
  fail = true
  await act(async () => { await view.result.current.table.consult() })
  assert.equal(view.result.current.table.state.phase, "error")
  assert.equal(view.result.current.table.state.error, "SESSION_UNAVAILABLE")
  assert.equal(view.result.current.tplo.canEdit, true)
})

test("stage 10: table preview and persisted correction show separate origins, target mismatch and clinical limits", () => {
  const copy = messages.workspace.tplo.table
  const table = { filters: { tpa_degrees: 0, blade_diameter_mm: 24 }, target: 6, state: { phase: "done", data: tableResponse() },
    canConsult: false, consult() {}, parameterPreview: true, protocol: { data: { configured: false }, isFetching: false, isError: false }, canReadProtocol: false, refreshProtocol() {} }
  const correction = { status: "available", revision: 4, correction: { status: "TARGET_SLOPE_MISMATCH", clinically_validated: false } }
  const view = render(provider(h(CaseImageTploReference, { table, correction, canEdit: false })))
  assert.ok(view.getByText(copy.parameterPreview))
  assert.ok(view.getByText(copy.match.replace("{value}", "8,40 mm")))
  assert.ok(view.getByText(copy.targetMismatch))
  assert.ok(view.getByText(copy.states.TARGET_SLOPE_MISMATCH))
  assert.ok(view.getByText(copy.notValidated))
  assert.equal(view.container.querySelectorAll("[data-tplo-correction-source=official]").length, 1)
})

test("review 10: reference callbacks recheck cache changes before React delivers the next render", async () => {
  for (const scenario of ["parameters", "deletion", "receipt", "fetching"]) {
    const calls = [], view = tableHook(async url => { calls.push(url); return Response.json(tableResponse()) })
    await waitFor(() => assert.equal(view.result.current.table.canConsult, true))
    const previous = view.result.current.table
    await act(async () => {
      if (scenario === "parameters") view.client.setQueryData(keys.imageTploDraft(view.image.caseId, id),
        { kind: "tplo-parameters-set", baseRevision: 4, parameters: { blade_diameter_mm: 30 } })
      if (scenario === "deletion") view.client.setQueryData(keys.imageDeletion(view.image.caseId, id), { phase: "deleting" })
      if (scenario === "receipt") view.client.setQueryData(keys.imagePlanSave(view.image.caseId, id),
        { phase: "uncertain", edit: { kind: "tplo-parameters-set", baseRevision: 4, parameters: { blade_diameter_mm: 30 } } })
      if (scenario === "fetching") view.client.getQueryCache().find({ queryKey: keys.imagePlan(view.image.caseId, id), exact: true }).setState({ fetchStatus: "fetching" })
      await previous.consult()
      previous.refreshProtocol()
    })
    assert.equal(calls.length, 0, `obsolete ${scenario} callback must not initiate a read`)
    view.unmount()
  }
})

test("review 10: a rejected parameter save cannot notify a newer editor generation", async () => {
  const { client, image } = fragmentEnvironment(), errors = [], previousError = notifications.error
  let rejectSave
  const pending = new Promise((_, reject) => { rejectSave = reject })
  const wrapper = ({ children }) => h(QueryClientProvider, { client }, provider(children))
  const tplo = { contextGeneration: 1, editor: { kind: "tplo-parameters-set" }, canSave: true, submit: () => pending }
  notifications.error = (...args) => errors.push(args)
  try {
    const view = renderHook(({ generation }) => useTploParameterSaveActions({ ...tplo, contextGeneration: generation }, { caseId: image.caseId, imageId: id }, () => assert.fail("a failed save cannot restore focus")),
      { initialProps: { generation: 1 }, wrapper })
    let saving
    act(() => { saving = view.result.current.save() })
    view.rerender({ generation: 2 })
    await act(async () => { rejectSave(Error("old request")); await saving })
    assert.equal(errors.length, 0)
  } finally { notifications.error = previousError }
})


test("review 10: current parameter confirmation is emitted once despite duplicate clicks", async () => {
  const { client, image } = fragmentEnvironment(), successes = [], previousSuccess = notifications.success
  let resolveSave, submitted = 0, focused = 0
  const pending = new Promise(resolve => { resolveSave = resolve })
  const wrapper = ({ children }) => h(QueryClientProvider, { client }, provider(children))
  const tplo = { contextGeneration: 1, editor: { kind: "tplo-parameters-set" }, canSave: true, submit: () => { submitted++; return pending } }
  notifications.success = (...args) => successes.push(args)
  try {
    const view = renderHook(() => useTploParameterSaveActions(tplo, { caseId: image.caseId, imageId: id }, () => { focused++ }), { wrapper })
    let saving
    act(() => { saving = view.result.current.save(); void view.result.current.save() })
    assert.equal(submitted, 1)
    assert.equal(focused, 0)
    await act(async () => { resolveSave({ phase: "saved" }); await saving })
    assert.equal(successes.length, 1)
    assert.equal(focused, 1)
  } finally { notifications.success = previousSuccess }
})
