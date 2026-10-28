import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { registerHooks } from "node:module"
import test, { after, afterEach } from "node:test"
import ts from "typescript"
import { JSDOM } from "jsdom"
import { imagePlanFixture } from "./fixtures/image-plan.mjs"

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:3000" })
for (const name of ["window", "document", "navigator", "HTMLElement", "Element", "HTMLInputElement", "HTMLFormElement", "DocumentFragment", "MutationObserver", "getComputedStyle", "Node", "NodeFilter", "CustomEvent"])
  Object.defineProperty(globalThis, name, { configurable: true, value: name === "getComputedStyle" ? dom.window[name].bind(dom.window) : dom.window[name] })
globalThis.IS_REACT_ACT_ENVIRONMENT = true
globalThis.requestAnimationFrame = callback => setTimeout(callback, 0)
globalThis.cancelAnimationFrame = clearTimeout
const resizeObservers = new Set()
globalThis.ResizeObserver = class {
  constructor(callback) { this.callback = callback; resizeObservers.add(this) }
  resize(width, height) { this.callback([{ contentRect: { width, height } }]) }
  observe() { this.resize(1000, 700) }
  disconnect() { resizeObservers.delete(this) }
}
dom.window.PointerEvent = dom.window.MouseEvent
dom.window.HTMLElement.prototype.setPointerCapture = function () {}
dom.window.HTMLElement.prototype.hasPointerCapture = function () { return false }
dom.window.HTMLElement.prototype.scrollIntoView = function () {}

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.endsWith(".module.css")) return nextResolve(specifier, context)
  if (specifier.startsWith("@/")) {
    const path = new URL(`../src/${specifier.slice(2)}`, import.meta.url)
    try { return nextResolve(`${path.href}.tsx`, context) } catch { return nextResolve(`${path.href}.ts`, context) }
  }
  if (context.parentURL?.includes("/node_modules/")) return nextResolve(specifier, context)
  if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    try { return nextResolve(`${specifier}.ts`, context) } catch { return nextResolve(`${specifier}.tsx`, context) }
  }
  return nextResolve(specifier, context)
}, load(url, context, nextLoad) {
  if (url.endsWith(".module.css")) return { format: "module", shortCircuit: true, source: "export default new Proxy({}, { get: (_, name) => name })" }
  if (url.startsWith("file:") && url.endsWith(".tsx") && !url.includes("/node_modules/")) {
    return { format: "module", shortCircuit: true, source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText }
  }
  return nextLoad(url, context)
} })

const React = await import("react")
const { render, renderHook, fireEvent, waitFor, cleanup, act } = await import("@testing-library/react")
const { QueryClient, QueryClientProvider, focusManager } = await import("@tanstack/react-query")
const { NextIntlClientProvider } = await import("next-intl")
const { UnsavedChangesGuard, useUnsavedChangesGuard } = await import("../src/components/shared/app-shell/unsaved-changes-guard.tsx")
const { CaseImageWorkspace } = await import("../src/features/cases/components/case-image-workspace.tsx")
const { CaseImageDeleteAction } = await import("../src/features/cases/components/case-image-delete-action.tsx")
const { useImageCalibration } = await import("../src/features/cases/hooks/use-image-calibration.ts")
const { qualityFields, hasImagePlanDraft } = await import("../src/features/cases/lib/image-quality-draft.ts")
const { casesQueryKeys: keys } = await import("../src/features/cases/hooks/cases-query-keys.ts")
const { requestCalibrationSave } = await import("../src/features/cases/lib/image-plan-saving.ts")
const { requestImageDeletion } = await import("../src/features/cases/lib/image-deletion.ts")
const { requestCaseDeletion } = await import("../src/features/cases/lib/case-deletion.ts")
const { calibrationProductState } = await import("../src/features/cases/lib/calibration-product-state.ts")
const { toast } = await import("sonner")
const originalToasts = { success: toast.success, error: toast.error, info: toast.info }
const messages = { cases: JSON.parse(readFileSync(new URL("../src/i18n/messages/pt-BR/cases.json", import.meta.url), "utf8")),
  common: JSON.parse(readFileSync(new URL("../src/i18n/messages/pt-BR/common.json", import.meta.url), "utf8")) }
const h = React.createElement
const f = imagePlanFixture()
const initial = f.publicPlan(f.initial)
const image = { id: f.identity.imageId, caseId: f.caseId, status: "READY", kind: "PNG", widthPx: 2000, heightPx: 1000,
  previewAvailable: true, previewWidthPx: 1600, previewHeightPx: 800, pixelSpacingMm: null, imagerPixelSpacingMm: null,
  originalFilename: "reference.png", displayName: null }
const clients = new Set(), originalFetch = globalThis.fetch
afterEach(() => { cleanup(); for (const client of clients) client.clear(); clients.clear(); globalThis.fetch = originalFetch; Object.assign(toast, originalToasts) })
after(() => dom.window.close())
function client() { const value = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } }); clients.add(value); return value }
function wrapper(queryClient) { return ({ children }) => h(QueryClientProvider, { client: queryClient }, children) }
const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes }); return { promise, resolve } }
function backend(dimensions = image) {
  let persisted = initial
  const calls = []
  return { calls, get persisted() { return persisted }, set persisted(value) { persisted = value },
    fetch: async (url, init = {}) => {
      calls.push({ url, method: init.method ?? "GET", body: init.body ? JSON.parse(init.body) : undefined })
      if (url.endsWith("/preview")) return Response.json({ url: "https://storage.example/preview.png", mediaType: "image/png", widthPx: dimensions.previewWidthPx, heightPx: dimensions.previewHeightPx, expiresAt: new Date(Date.now() + 600000).toISOString() })
      if (init.method === "PATCH") {
        const input = JSON.parse(init.body)
        if (input.baseRevision !== persisted.revision) return Response.json({ error: { code: "PLAN_REVISION_CONFLICT", uncertain: false, currentRevision: persisted.revision } }, { status: 409 })
        persisted = { ...persisted, revision: persisted.revision + 1, updatedAt: "2026-10-27T15:00:00Z",
          document: { ...persisted.document, radiographic_quality: input.quality } }
        return Response.json(persisted)
      }
      if (init.method !== "PUT") return Response.json(persisted)
      const input = JSON.parse(init.body), calibration = input.calibration
      const length = calibration.kind === "REFERENCE_LINE"
        ? Math.hypot((calibration.end.x - calibration.start.x) * dimensions.widthPx, (calibration.end.y - calibration.start.y) * dimensions.heightPx)
        : 2 * Math.hypot((calibration.edge.x - calibration.center.x) * dimensions.widthPx, (calibration.edge.y - calibration.center.y) * dimensions.heightPx)
      persisted = { ...persisted, revision: input.baseRevision + 1, updatedAt: "2026-10-26T15:00:00Z", document: { ...persisted.document,
        calibration: { ...calibration, result: { calibration_id: "b".repeat(64), reference_length_px: length, mm_per_pixel: (calibration.known_length_mm ?? calibration.known_diameter_mm) / length } } } }
      return Response.json(persisted)
    } }
}
function NavigationProbe({ navigate }) {
  const { requestNavigation } = useUnsavedChangesGuard()
  return h("button", { onClick: () => requestNavigation(navigate) }, "Navigate")
}
function Workspace({ queryClient, selected = image, navigate, actions = null, introduction = false, caseLocked = false }) {
  const [section, setSection] = React.useState("images")
  // Existing interaction fixtures represent a workspace whose guide was read.
  const guideKey = keys.imageCalibrationIntroduction(selected.caseId, selected.id)
  if (!introduction && queryClient.getQueryData(guideKey) === undefined) queryClient.setQueryData(guideKey, true)
  return h(QueryClientProvider, { client: queryClient }, h(NextIntlClientProvider, { locale: "pt-BR", timeZone: "UTC", messages },
    h(UnsavedChangesGuard, null, h(CaseImageWorkspace, { key: selected.id, image: selected, activeSection: section, onSectionChange: setSection,
      caseContext: "Case details", imageList: "Image list", imageActions: null, caseLocked }),
    navigate ? h(NavigationProbe, { navigate }) : null, actions)))
}

async function referenceInput(view, name) {
  await view.findByRole("slider", { name })
  if (!view.queryByRole("textbox", { name })) fireEvent.click(view.getByRole("button", { name: "Outro valor" }))
  return view.getByRole("textbox", { name })
}

async function chooseUnit(view, unit) {
  fireEvent.keyDown(view.getByRole("combobox", { name: "Unidade de medida" }), { key: "ArrowDown" })
  const option = await view.findByRole("option", { name: unit, exact: true })
  fireEvent.keyDown(option, { key: "Enter" })
  await waitFor(() => assert.equal(view.queryByRole("listbox"), null))
}

async function acknowledgeRecalibration(view) {
  const copy = messages.cases.workspace.calibration.introduction
  const popup = view.queryByRole("dialog", { name: copy.title })
  if (popup?.textContent.includes(copy.recalibrationDescription)) {
    fireEvent.click(view.getByRole("button", { name: copy.confirm }))
    await waitFor(() => assert.equal(view.queryByRole("dialog", { name: copy.title }), null))
  }
}

async function openCalibration(view, { confirmRecalibration = true } = {}) {
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.image.title, exact: true }))
  const action = view.queryByRole("button", { name: messages.cases.workspace.image.calibrate, exact: true })
    ?? view.queryByRole("button", { name: messages.cases.workspace.image.recalibrate, exact: true })
  if (action && !action.disabled) fireEvent.click(action)
  if (confirmRecalibration) await acknowledgeRecalibration(view)
}

async function editingWorkspace(view) {
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  await openCalibration(view)
  fireEvent.change(await referenceInput(view, "Comprimento real"), { target: { value: "25" } })
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.calibration.remote.place }))
}

const imageCopy = messages.cases.workspace.image
const toolsCopy = messages.cases.workspace.tools
async function openImageOptions(view) {
  await waitFor(() => assert.ok(view.queryByRole("img")))
  // A remount can renew the signed URL; decode the resulting image, not a stale
  // cached element that React will replace after the metadata promise settles.
  await act(async () => {})
  fireEvent.load(view.getByRole("img"))
  fireEvent.click(view.getByRole("button", { name: imageCopy.title, exact: true }))
  await view.findByRole("slider", { name: imageCopy.brightness })
}

test("Files lists uploads and Image opens adjustments before calibration, without starting an edit or API write", async () => {
  const server = backend(), queryClient = client(); let navigated = 0
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient, introduction: true, navigate: () => navigated++ }))
  assert.equal(view.getByRole("button", { name: messages.cases.workspace.images.title }).textContent, "")
  assert.equal(view.getByRole("button", { name: messages.cases.workspace.images.title }).getAttribute("aria-pressed"), "true")
  await openImageOptions(view)
  assert.equal(view.queryByRole("dialog"), null)
  assert.equal(view.queryByRole("slider", { name: "Comprimento real" }), null)
  assert.equal(Boolean(view.container.querySelector("[data-calibration-viewport] svg line")), false)
  assert.ok(view.getByRole("button", { name: imageCopy.calibrate }))
  const mirror = view.getByRole("button", { name: imageCopy.mirror })
  assert.equal(mirror.getAttribute("aria-pressed"), "false")
  const raster = view.getByRole("img"), source = raster.src
  const viewport = view.container.querySelector("[data-calibration-viewport]")
  assert.ok(viewport.classList.contains("bg-[var(--case-viewer-canvas)]"))
  fireEvent.change(view.getByRole("slider", { name: imageCopy.brightness }), { target: { value: "145" } })
  fireEvent.change(view.getByRole("slider", { name: imageCopy.contrast }), { target: { value: "80" } })
  fireEvent.click(view.getByRole("switch", { name: imageCopy.invert }))
  fireEvent.click(mirror)
  assert.equal(mirror.getAttribute("aria-pressed"), "true")
  assert.ok(raster.parentElement.style.transform.endsWith("scaleX(-1)"))
  fireEvent.click(mirror)
  assert.equal(mirror.getAttribute("aria-pressed"), "false")
  assert.equal(raster.parentElement.style.transform.includes("scaleX(-1)"), false)
  fireEvent.click(mirror)
  assert.equal(raster.style.filter, "brightness(145%) contrast(80%) invert(1)")
  assert.ok(viewport.classList.contains("bg-[var(--case-viewer-canvas-inverted)]"))
  assert.ok(viewport.closest("section").classList.contains("bg-[var(--case-viewer-canvas-inverted)]"))
  assert.ok(view.getByRole("toolbar").classList.contains("bg-[var(--color-obsidian)]"))
  assert.equal(viewport.classList.contains("bg-[var(--case-viewer-canvas)]"), false)
  assert.equal(viewport.querySelector("svg").style.filter, "")
  assert.equal(raster.src, source)
  assert.equal(hasImagePlanDraft(queryClient, image.caseId, image.id), false)
  const unload = new dom.window.Event("beforeunload", { cancelable: true }); window.dispatchEvent(unload)
  assert.equal(unload.defaultPrevented, false)
  const resetDisplay = view.getByRole("button", { name: imageCopy.reset })
  assert.equal(resetDisplay.parentElement.querySelector("h2")?.textContent, imageCopy.title)
  fireEvent.click(resetDisplay)
  assert.equal(raster.style.filter, "brightness(100%) contrast(100%)")
  assert.ok(viewport.classList.contains("bg-[var(--case-viewer-canvas)]"))
  assert.ok(viewport.closest("section").classList.contains("bg-[var(--case-viewer-shell)]"))
  assert.equal(viewport.classList.contains("bg-[var(--case-viewer-canvas-inverted)]"), false)
  assert.equal(view.getByRole("switch", { name: imageCopy.invert }).getAttribute("aria-checked"), "false")
  assert.equal(mirror.getAttribute("aria-pressed"), "false")
  assert.equal(raster.parentElement.style.transform.includes("scaleX(-1)"), false)
  fireEvent.click(view.getByRole("button", { name: "Navigate" }))
  assert.equal(navigated, 1); assert.equal(view.queryByRole("alertdialog"), null)
  assert.equal(server.calls.some(call => call.method === "PUT" || call.method === "PATCH"), false)
})

test("calibrated Image opens its summary, hides the reference, and explicit recalibration can be cancelled without changing its saved scale", async () => {
  const server = backend(), queryClient = client()
  // An old session may still have this removed preference enabled.
  queryClient.setQueryData(keys.imageDisplaySettings(image.caseId, image.id), { brightness: 100, contrast: 100, inverted: false, mirrored: false, showReference: true })
  server.persisted = f.publicPlan(f.persist({ base_revision: 0, document: { ...f.initial.document, calibration: f.circle } }))
  const persisted = structuredClone(server.persisted)
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient, introduction: true }))
  await openImageOptions(view)
  assert.ok(view.getByRole("button", { name: imageCopy.recalibrate }))
  assert.match(view.getByLabelText(messages.cases.workspace.calibration.savedScale).textContent, /mm\/px/)
  assert.equal(view.queryByRole("button", { name: "Atualizar calibração" }), null)
  const svg = view.container.querySelector("[data-calibration-viewport] svg")
  assert.equal(svg.children.length, 0)
  assert.equal(view.queryByRole("switch", { name: "Mostrar referência" }), null)
  assert.equal(view.queryByText("Referência da calibração"), null)
  fireEvent.click(view.getByRole("button", { name: imageCopy.recalibrate }))
  await acknowledgeRecalibration(view)
  assert.equal(view.queryByRole("dialog"), null)
  assert.equal(view.getByRole("button", { name: "Círculo", exact: true }).getAttribute("aria-pressed"), "true")
  fireEvent.change(await referenceInput(view, "Diâmetro real"), { target: { value: "30" } })
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.calibration.cancelEditing, exact: true }))
  assert.ok(view.getByRole("heading", { name: imageCopy.title, exact: true }))
  assert.ok(view.getByRole("button", { name: imageCopy.recalibrate }))
  assert.equal(queryClient.getQueryData(keys.imageCalibrationDraft(image.caseId, image.id)), null)
  assert.deepEqual(server.persisted, persisted)
  assert.equal(svg.children.length, 0)
  assert.equal(server.calls.some(call => call.method === "PUT"), false)
})

test("calibration exits to Image only after acknowledgement, hides the saved line and keeps independent display adjustments", async () => {
  const server = backend(), queryClient = client(), entered = deferred(), barrier = deferred()
  globalThis.fetch = async (url, init) => {
    if (init?.method === "PUT") { entered.resolve(); await barrier.promise }
    return server.fetch(url, init)
  }
  const view = render(h(Workspace, { queryClient }))
  try {
    await openImageOptions(view)
    fireEvent.change(view.getByRole("slider", { name: imageCopy.brightness }), { target: { value: "120" } })
    await editingWorkspace(view)
    assert.ok(view.getByRole("button", { name: toolsCopy.title, exact: true }))
    fireEvent.click(view.getByRole("button", { name: "Salvar calibração" }))
    await entered.promise
    assert.ok(view.getByRole("button", { name: toolsCopy.title, exact: true }))
    assert.ok(view.getByRole("heading", { name: messages.cases.workspace.calibration.title, exact: true }))
    assert.ok(view.container.querySelector("[data-calibration-viewport] svg line"))
    await waitFor(() => assert.equal(view.getByRole("button", { name: messages.cases.workspace.calibration.cancelEditing, exact: true }).disabled, true))
    await act(async () => barrier.resolve())
    await view.findByRole("button", { name: imageCopy.recalibrate })
    assert.ok(view.getByRole("button", { name: toolsCopy.title, exact: true }))
    assert.ok(view.getByRole("heading", { name: imageCopy.title, exact: true }))
    assert.equal(view.queryByRole("slider", { name: "Comprimento real" }), null)
    assert.equal(view.queryByRole("button", { name: "Marcar referência" }), null)
    assert.equal(view.container.querySelector("[data-calibration-viewport] svg line"), null)
    assert.equal(view.queryByRole("switch", { name: "Mostrar referência" }), null)
    assert.equal(view.getByRole("slider", { name: imageCopy.brightness }).value, "120")
    assert.ok(view.getByRole("img").style.filter.startsWith("brightness(120%)"))
  } finally { barrier.resolve() }
})

test("display settings survive a workspace remount and preview renewal but stay isolated by image and organization", async () => {
  const server = backend(), queryClient = client(), other = { ...image, id: "00000000-0000-4000-8000-000000000991" }
  // A workspace already open before this option existed has no mirrored field.
  queryClient.setQueryData(keys.imageDisplaySettings(image.caseId, image.id), { brightness: 100, contrast: 100, inverted: false, showReference: false })
  let renewed = false
  globalThis.fetch = async (url, init) => {
    if (url.includes(other.id) && url.endsWith("/plan")) return Response.json({ ...initial, imageId: other.id })
    const response = await server.fetch(url, init)
    return renewed && url.endsWith("/preview") ? Response.json({ ...await response.json(), url: "https://storage.example/renewed-display.png" }) : response
  }
  let view = render(h(Workspace, { queryClient }))
  await openImageOptions(view)
  assert.equal(view.getByRole("button", { name: imageCopy.mirror }).getAttribute("aria-pressed"), "false")
  fireEvent.change(view.getByRole("slider", { name: imageCopy.contrast }), { target: { value: "170" } })
  fireEvent.click(view.getByRole("button", { name: imageCopy.mirror }))
  renewed = true
  act(() => queryClient.setQueryData(keys.preview(image.caseId, image.id), current => ({ ...current, url: "https://storage.example/renewed-display.png" })))
  await waitFor(() => assert.ok(view.getByRole("img").src.endsWith("renewed-display.png")))
  assert.ok(view.getByRole("img").style.filter.includes("contrast(170%)"))
  assert.equal(view.getByRole("img").parentElement.dataset.imageMirrored, "true")
  view.unmount()
  view = render(h(Workspace, { queryClient }))
  await openImageOptions(view)
  assert.equal(view.getByRole("slider", { name: imageCopy.contrast }).value, "170")
  assert.equal(view.getByRole("button", { name: imageCopy.mirror }).getAttribute("aria-pressed"), "true")
  view.rerender(h(Workspace, { queryClient, selected: other }))
  await openImageOptions(view)
  assert.equal(view.getByRole("slider", { name: imageCopy.contrast }).value, "100")
  assert.equal(view.getByRole("button", { name: imageCopy.mirror }).getAttribute("aria-pressed"), "false")
  view.unmount()
  view = render(h(Workspace, { queryClient: client() }))
  await openImageOptions(view)
  assert.equal(view.getByRole("slider", { name: imageCopy.contrast }).value, "100")
  assert.equal(view.getByRole("button", { name: imageCopy.mirror }).getAttribute("aria-pressed"), "false")
})

for (const kind of ["line", "circle"]) test(`mirrored ${kind} gestures, handles and keyboard keep source coordinates through zoom, pan, save and reset`, async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await openImageOptions(view)
  fireEvent.click(view.getByRole("button", { name: imageCopy.mirror }))
  fireEvent.click(view.getByRole("switch", { name: imageCopy.invert }))
  await openCalibration(view)
  if (kind === "circle") fireEvent.click(view.getByRole("button", { name: "Círculo", exact: true }))
  fireEvent.change(await referenceInput(view, kind === "line" ? "Comprimento real" : "Diâmetro real"), { target: { value: "20" } })
  act(() => { for (const observer of resizeObservers) observer.resize(1048, 548) })
  const viewport = view.container.querySelector("[data-calibration-viewport]"), raster = view.getByRole("img").parentElement
  let rect = { left: 100, top: 50, width: 1000, height: 500, right: 1100, bottom: 550 }
  raster.getBoundingClientRect = () => rect
  const pointer = (type, x, y) => fireEvent[type](viewport, { button: 0,
    clientX: rect.left + (1 - x / image.widthPx) * rect.width, clientY: rect.top + y / image.heightPx * rect.height })
  const segment = () => viewport.querySelector(kind === "line" ? "svg line" : "[data-calibration-diameter]")
  const near = (actual, expected) => assert.ok(Math.abs(Number(actual) - expected) < 1e-8, `${actual} != ${expected}`)
  // On screen this gesture travels left; stored x increases in source space.
  pointer("pointerDown", 200, 200)
  pointer("pointerMove", 1000, 600)
  pointer("pointerUp", 1000, 600)
  near(segment().getAttribute("x1"), 200); near(segment().getAttribute("x2"), 1000)
  assert.ok(raster.contains(segment()))
  assert.ok(raster.style.transform.endsWith("scaleX(-1)"))
  assert.ok(view.getByRole("img").style.filter.endsWith("invert(1)"))
  for (let index = 0; index < 4; index++) fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.viewer.zoomIn }))
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.viewer.pan }))
  fireEvent.pointerDown(viewport, { button: 0, clientX: 400, clientY: 300 })
  fireEvent.pointerMove(viewport, { clientX: 420, clientY: 290 })
  fireEvent.pointerUp(viewport, { clientX: 420, clientY: 290 })
  rect = { left: -380, top: -260, width: 2000, height: 1000, right: 1620, bottom: 740 }
  assert.ok(raster.style.transform.includes("translate(20px, -10px) scale(2)"))
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.viewer.mark }))
  for (const [endpoint, x, y] of [["start", 200, 200], ["end", 1000, 600]]) {
    pointer("pointerMove", x, y)
    near(viewport.querySelector(`[data-calibration-handle="${endpoint}"]`).getAttribute("r"), 7)
  }
  pointer("pointerDown", 1000, 600)
  pointer("pointerMove", 1200, 700)
  pointer("pointerUp", 1200, 700)
  near(segment().getAttribute("x1"), 200); near(segment().getAttribute("x2"), 1200)
  pointer("pointerDown", 200, 200)
  pointer("pointerMove", 300, 250)
  pointer("pointerUp", 300, 250)
  near(segment().getAttribute("x1"), 300); near(segment().getAttribute("x2"), 1200)
  pointer("pointerDown", 300, 250)
  pointer("pointerUp", 200, 200)
  // Move the body right and down on screen: source x decreases, y increases.
  pointer("pointerDown", 700, 450)
  pointer("pointerMove", 600, 550)
  pointer("pointerUp", 600, 550)
  near(segment().getAttribute("x1"), 100); near(segment().getAttribute("x2"), 1100)
  fireEvent.keyDown(viewport, { key: "ArrowRight" })
  near(segment().getAttribute("x2"), 1099)
  fireEvent.keyDown(viewport, { key: "ArrowUp", shiftKey: true })
  near(segment().getAttribute("y2"), 790)
  const size = kind === "circle" ? Number(viewport.querySelector("[data-calibration-circle]").getAttribute("r")) : 1099
  fireEvent.keyDown(viewport, { key: "ArrowLeft", altKey: true })
  if (kind === "line") near(segment().getAttribute("x2"), 1100)
  else near(viewport.querySelector("[data-calibration-circle]").getAttribute("r"), size - 1)
  fireEvent.keyDown(viewport, { key: "ArrowRight", altKey: true })
  assert.equal(server.calls.some(call => call.method === "PUT"), false)
  fireEvent.click(view.getByRole("button", { name: "Salvar calibração" }))
  await view.findByRole("button", { name: imageCopy.recalibrate })
  const sent = server.calls.find(call => call.method === "PUT").body.calibration
  if (kind === "line") assert.deepEqual(sent, { kind: "REFERENCE_LINE", start: { x: 0.0495, y: 0.29 }, end: { x: 0.5495, y: 0.79 }, known_length_mm: 20 })
  else {
    assert.equal(sent.kind, "REFERENCE_CIRCLE"); assert.equal(sent.known_diameter_mm, 20)
    near(sent.center.x, 0.2995); near(sent.center.y, 0.54)
    near(sent.edge.x, 0.5495); near(sent.edge.y, 0.79)
  }
  near(server.persisted.document.calibration.result.reference_length_px, Math.hypot(1000, 500))
  const savedGeometry = viewport.querySelector("svg").innerHTML, savedPlan = structuredClone(server.persisted)
  assert.equal(savedGeometry, "")
  assert.equal(viewport.querySelector("[data-calibration-handle]"), null)
  fireEvent.click(view.getByRole("button", { name: imageCopy.mirror }))
  assert.equal(raster.dataset.imageMirrored, "false")
  assert.equal(viewport.querySelector("svg").innerHTML, savedGeometry)
  fireEvent.click(view.getByRole("button", { name: imageCopy.mirror }))
  await openCalibration(view)
  near(segment().getAttribute("x2"), 1099)
  assert.equal(view.getByRole("button", { name: "Atualizar calibração" }).disabled, true)
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.calibration.cancelEditing, exact: true }))
  fireEvent.click(view.getByRole("button", { name: imageCopy.reset }))
  assert.equal(raster.dataset.imageMirrored, "false")
  assert.ok(raster.style.transform.includes("translate(20px, -10px) scale(2)"))
  assert.deepEqual(server.persisted, savedPlan)
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 1)
})

test("mirrored drawing clamps both source edges and a cancelled pointer gesture preserves the committed reference", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await openImageOptions(view)
  fireEvent.click(view.getByRole("button", { name: imageCopy.mirror }))
  await openCalibration(view)
  fireEvent.change(await referenceInput(view, "Comprimento real"), { target: { value: "20" } })
  const viewport = view.container.querySelector("[data-calibration-viewport]")
  view.getByRole("img").parentElement.getBoundingClientRect = () => ({ left: 100, top: 50, width: 1000, height: 500, right: 1100, bottom: 550 })
  fireEvent.pointerDown(viewport, { button: 0, clientX: 1100, clientY: 150 })
  fireEvent.pointerMove(viewport, { clientX: 50, clientY: 350 })
  fireEvent.pointerUp(viewport, { clientX: 50, clientY: 350 })
  const line = viewport.querySelector("svg line")
  assert.equal(line.getAttribute("x1"), "0"); assert.equal(line.getAttribute("x2"), "2000")
  const committed = line.outerHTML
  fireEvent.pointerDown(viewport, { button: 0, clientX: 100, clientY: 350 })
  fireEvent.pointerMove(viewport, { clientX: 1200, clientY: 400 })
  assert.equal(line.getAttribute("x2"), "0")
  fireEvent.pointerCancel(viewport)
  assert.equal(viewport.querySelector("svg line").outerHTML, committed)
  fireEvent.click(view.getByRole("button", { name: "Salvar calibração" }))
  await view.findByRole("button", { name: imageCopy.recalibrate })
  const sent = server.calls.find(call => call.method === "PUT").body.calibration
  assert.deepEqual(sent.start, { x: 0, y: 0.2 }); assert.deepEqual(sent.end, { x: 1, y: 0.6 })
})

test("an unconfirmed recalibration stays in its editor across remounts and returns to Image only after a read confirms it", async () => {
  const server = backend(), queryClient = client()
  server.persisted = f.publicPlan(f.persist({ base_revision: 0, document: { ...f.initial.document, calibration: f.circle } }))
  const previous = structuredClone(server.persisted)
  let showCommit = false, committed = null, writes = 0
  globalThis.fetch = async (url, init = {}) => {
    if (init.method === "PUT") { writes++; committed = await (await server.fetch(url, init)).json(); throw new TypeError("lost acknowledgement") }
    if (url.endsWith("/plan")) return Response.json(showCommit ? committed : previous)
    return server.fetch(url, init)
  }
  let view = render(h(Workspace, { queryClient }))
  await openImageOptions(view)
  fireEvent.click(view.getByRole("button", { name: imageCopy.recalibrate }))
  await acknowledgeRecalibration(view)
  fireEvent.change(await referenceInput(view, "Diâmetro real"), { target: { value: "30" } })
  fireEvent.click(view.getByRole("button", { name: "Atualizar calibração" }))
  await view.findByText(messages.cases.workspace.calibration.remote.uncertain)
  assert.equal(view.queryByRole("button", { name: imageCopy.recalibrate }), null)
  assert.equal(view.getByRole("button", { name: messages.cases.workspace.calibration.cancelEditing, exact: true }).disabled, true)
  assert.ok(view.container.querySelector("[data-calibration-viewport] svg circle"))
  view.unmount()
  view = render(h(Workspace, { queryClient }))
  await openCalibration(view)
  await view.findByText(messages.cases.workspace.calibration.remote.uncertain)
  showCommit = true
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.calibration.remote.check }))
  await view.findByRole("button", { name: imageCopy.recalibrate })
  assert.equal(view.container.querySelector("[data-calibration-viewport] svg").children.length, 0)
  assert.equal(view.queryByRole("switch", { name: "Mostrar referência" }), null)
  assert.equal(queryClient.getQueryData(keys.imagePlan(image.caseId, image.id)).document.calibration.known_diameter_mm, 30)
  assert.equal(writes, 1)
})

const qualityCopy = messages.cases.workspace.quality
const internalQuality = { ...Object.fromEntries(qualityFields.map(field => [field, "PASS"])), tibial_plateau_visible: "FAIL", notes: "Internal backend assessment" }

test("radiographic quality stays internal across all workspace panels and never creates a manual draft or write", async () => {
  const server = backend(), queryClient = client()
  server.persisted = f.publicPlan(f.persist({ base_revision: 0, document: { ...f.initial.document, calibration: f.circle } }))
  server.persisted = { ...server.persisted, document: { ...server.persisted.document, radiographic_quality: internalQuality,
    tplo: { laterality: "RIGHT", projection: "MEDIOLATERAL", image_quality: "LIMITED", eligibility: "INELIGIBLE" } } }
  const persisted = structuredClone(server.persisted)
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  const assertInternal = () => {
    assert.equal([...view.container.querySelectorAll("nav button")].filter(button => button.getAttribute("aria-label") !== toolsCopy.title).length, 3)
    assert.equal(view.queryByRole("button", { name: qualityCopy.title, exact: true }), null)
    assert.equal(view.queryByRole("heading", { name: qualityCopy.title }), null)
    assert.equal(view.queryByRole("combobox", { name: qualityCopy.fields.true_lateral }), null)
    assert.equal(view.queryByRole("textbox", { name: qualityCopy.notes }), null)
    assert.equal(view.queryByRole("button", { name: qualityCopy.save }), null)
  }
  assertInternal()
  await openImageOptions(view)
  for (const label of [messages.cases.workspace.sidebar.title, messages.cases.workspace.images.title, imageCopy.title]) {
    fireEvent.click(view.getByRole("button", { name: label, exact: true })); assertInternal()
  }
  await openCalibration(view)
  assertInternal()
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.calibration.cancelEditing, exact: true }))
  assert.equal(queryClient.getQueryData(keys.imageQualityDraft(image.caseId, image.id)) ?? null, null)
  assert.deepEqual(queryClient.getQueryData(keys.imagePlan(image.caseId, image.id)).document.radiographic_quality, internalQuality)
  assert.deepEqual(server.persisted, persisted)
  assert.equal(server.calls.some(call => call.method === "PATCH" || call.method === "PUT"), false)
})

test("saving calibration preserves backend quality and eligibility without asking the user to assess or approve them", async () => {
  const server = backend(), queryClient = client()
  const internalTplo = { laterality: "RIGHT", projection: "MEDIOLATERAL", image_quality: "LIMITED", eligibility: "INELIGIBLE" }
  server.persisted = { ...initial, revision: 1, updatedAt: "2026-10-27T15:00:00Z", document: { ...initial.document, radiographic_quality: internalQuality, tplo: internalTplo } }
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await editingWorkspace(view)
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.calibration.remote.save }))
  await view.findByRole("button", { name: imageCopy.recalibrate })
  assert.deepEqual(server.persisted.document.radiographic_quality, internalQuality)
  assert.deepEqual(server.persisted.document.tplo, internalTplo)
  assert.deepEqual(Object.keys(server.calls.find(call => call.method === "PUT").body), ["baseRevision", "calibration"])
  assert.equal(server.calls.some(call => call.method === "PATCH"), false)
  assert.equal(view.queryByRole("button", { name: qualityCopy.title, exact: true }), null)
})

test("Tools stays in the rail before preview decoding and does not bypass unsupported DICOM calibration", async () => {
  const server = backend(), queryClient = client()
  const selected = { ...image, kind: "DICOM", pixelSpacingMm: [0.2, 0.3] }
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient, selected }))
  assert.equal(view.container.querySelectorAll("nav button").length, 4)
  assert.ok(view.getByRole("button", { name: toolsCopy.title, exact: true }))
  assert.equal(view.getByRole("button", { name: imageCopy.title, exact: true }).disabled, true)
  await openImageOptions(view)
  assert.equal(view.getByRole("button", { name: imageCopy.calibrate }).disabled, true)
  assert.ok(view.getByRole("button", { name: toolsCopy.title, exact: true }))
  assert.equal(view.queryByRole("heading", { name: toolsCopy.title, exact: true }), null)
  assert.equal(view.queryByRole("button", { name: qualityCopy.title, exact: true }), null)
  assert.equal(view.queryByRole("combobox", { name: qualityCopy.fields.true_lateral }), null)
  view.rerender(h(Workspace, { queryClient, selected: { ...selected, status: "QUARANTINED" } }))
  await waitFor(() => assert.equal(view.getByRole("button", { name: imageCopy.title, exact: true }).disabled, true))
  assert.equal(view.container.querySelectorAll("nav button").length, 4)
  assert.ok(view.getByRole("button", { name: toolsCopy.title, exact: true }))
})

test("Tools stays visible before decoding and opens a focused panel after a saved calibration without editing or writing", async () => {
  const server = backend(), queryClient = client()
  server.persisted = f.publicPlan(f.persist({ base_revision: 0, document: { ...f.initial.document, calibration: f.circle } }))
  const saved = structuredClone(server.persisted)
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  const tools = view.getByRole("button", { name: toolsCopy.title, exact: true })
  assert.equal(view.container.querySelectorAll("nav button").length, 4)
  assert.equal(tools.disabled, true)
  await openImageOptions(view)
  await waitFor(() => assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).disabled, false))
  fireEvent.change(view.getByRole("slider", { name: imageCopy.brightness }), { target: { value: "135" } })
  fireEvent.click(view.getByRole("button", { name: imageCopy.mirror }))
  const rail = [...view.container.querySelectorAll("nav button")]
  assert.equal(rail.length, 4)
  assert.equal(rail.at(-1).getAttribute("aria-label"), toolsCopy.title)
  const enabledTools = view.getByRole("button", { name: toolsCopy.title, exact: true })
  enabledTools.focus(); assert.equal(document.activeElement, enabledTools)
  fireEvent.click(enabledTools)
  const heading = view.getByRole("heading", { name: toolsCopy.title, exact: true })
  assert.equal(document.activeElement, heading)
  assert.equal(enabledTools.getAttribute("aria-pressed"), "true")
  assert.ok(view.getByRole("region", { name: toolsCopy.measurements }))
  assert.ok(view.getByText(toolsCopy.description))
  assert.equal(view.queryByRole("button", { name: messages.cases.workspace.viewer.mark }), null)
  assert.equal(view.queryByRole("slider", { name: "Comprimento real" }), null)
  assert.equal(view.container.querySelector("[data-calibration-viewport] svg").children.length, 0)
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.viewer.zoomIn }))
  assert.equal(view.getByRole("img").parentElement.dataset.imageMirrored, "true")
  assert.ok(view.getByRole("img").style.filter.startsWith("brightness(135%)"))
  fireEvent.click(view.getByRole("button", { name: imageCopy.title, exact: true }))
  assert.equal(document.activeElement, view.getByRole("heading", { name: imageCopy.title, exact: true }))
  assert.equal(view.getByRole("slider", { name: imageCopy.brightness }).value, "135")
  assert.deepEqual(server.persisted, saved)
  assert.equal(server.calls.some(call => call.method === "PUT" || call.method === "PATCH"), false)
})

test("Tools and its saved scale stay available while a background plan read resolves, then lose content if scale is absent", async () => {
  const server = backend(), queryClient = client()
  const saved = f.publicPlan(f.persist({ base_revision: 0, document: { ...f.initial.document, calibration: f.circle } }))
  const uncalibrated = f.publicPlan(f.persist({ base_revision: saved.revision, document: { ...f.initial.document, calibration: null } }))
  server.persisted = saved
  let planReads = 0, pendingPlan = null
  globalThis.fetch = (url, init) => {
    if (url.endsWith("/plan")) {
      planReads++
      if (pendingPlan) { const current = pendingPlan; pendingPlan = null; return current.promise }
    }
    return server.fetch(url, init)
  }
  const view = render(h(Workspace, { queryClient }))
  await openImageOptions(view)
  await waitFor(() => assert.equal(queryClient.getQueryState(keys.imagePlan(image.caseId, image.id)).fetchStatus, "idle"))
  await waitFor(() => assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).disabled, false))
  fireEvent.click(view.getByRole("button", { name: toolsCopy.title, exact: true }))
  await view.findByRole("region", { name: toolsCopy.measurements })

  const stableRead = deferred()
  pendingPlan = stableRead
  act(() => { void queryClient.refetchQueries({ queryKey: keys.imagePlan(image.caseId, image.id) }) })
  await waitFor(() => {
    assert.equal(planReads, 2)
    assert.equal(queryClient.getQueryState(keys.imagePlan(image.caseId, image.id)).fetchStatus, "fetching")
  })
  assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).getAttribute("aria-pressed"), "true")
  assert.ok(view.getByRole("region", { name: toolsCopy.measurements }))
  assert.equal(view.queryByText(messages.cases.workspace.calibration.remote.loading), null)
  fireEvent.click(view.getByRole("button", { name: imageCopy.title, exact: true }))
  assert.match(view.getByLabelText(messages.cases.workspace.calibration.savedScale).textContent, /mm\/px/)
  assert.equal(view.queryByText(messages.cases.workspace.calibration.remote.loading), null)
  assert.equal(view.getByRole("button", { name: imageCopy.recalibrate, exact: true }).disabled, true)
  await act(async () => stableRead.resolve(Response.json(saved)))
  await waitFor(() => assert.equal(queryClient.getQueryState(keys.imagePlan(image.caseId, image.id)).fetchStatus, "idle"))
  assert.ok(view.getByLabelText(messages.cases.workspace.calibration.savedScale))
  fireEvent.click(view.getByRole("button", { name: toolsCopy.title, exact: true }))
  await view.findByRole("region", { name: toolsCopy.measurements })

  const losingRead = deferred()
  server.persisted = uncalibrated
  pendingPlan = losingRead
  act(() => { void queryClient.refetchQueries({ queryKey: keys.imagePlan(image.caseId, image.id) }) })
  await waitFor(() => {
    assert.equal(planReads, 3)
    assert.equal(queryClient.getQueryState(keys.imagePlan(image.caseId, image.id)).fetchStatus, "fetching")
  })
  assert.ok(view.getByRole("region", { name: toolsCopy.measurements }))
  assert.equal(view.queryByText(messages.cases.workspace.calibration.remote.loading), null)
  await act(async () => losingRead.resolve(Response.json(uncalibrated)))
  await waitFor(() => assert.equal(queryClient.getQueryState(keys.imagePlan(image.caseId, image.id)).fetchStatus, "idle"))
  await waitFor(() => assert.equal(view.queryByRole("heading", { name: toolsCopy.title, exact: true }), null))
  assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).getAttribute("aria-pressed"), "false")
  assert.equal(view.queryByLabelText(messages.cases.workspace.calibration.savedScale), null)
})

test("a remounted workspace shows a cached saved scale while its fresh plan read is pending", async () => {
  const server = backend(), queryClient = client()
  const saved = f.publicPlan(f.persist({ base_revision: 0, document: { ...f.initial.document, calibration: f.circle } }))
  server.persisted = saved
  let planReads = 0, deferNextRead = false
  const refresh = deferred()
  globalThis.fetch = (url, init) => {
    if (url.endsWith("/plan")) {
      planReads++
      if (deferNextRead) { deferNextRead = false; return refresh.promise }
    }
    return server.fetch(url, init)
  }
  let view = render(h(Workspace, { queryClient }))
  await openImageOptions(view)
  await waitFor(() => assert.equal(queryClient.getQueryState(keys.imagePlan(image.caseId, image.id)).fetchStatus, "idle"))
  assert.ok(view.getByLabelText(messages.cases.workspace.calibration.savedScale))
  view.unmount()

  deferNextRead = true
  view = render(h(Workspace, { queryClient }))
  await waitFor(() => {
    assert.equal(planReads, 2)
    assert.equal(queryClient.getQueryState(keys.imagePlan(image.caseId, image.id)).fetchStatus, "fetching")
  })
  await openImageOptions(view)
  assert.ok(view.getByLabelText(messages.cases.workspace.calibration.savedScale))
  assert.equal(view.queryByText(messages.cases.workspace.calibration.remote.loading), null)
  assert.equal(view.getByRole("button", { name: imageCopy.recalibrate, exact: true }).disabled, true)
  await act(async () => refresh.resolve(Response.json(saved)))
  await waitFor(() => assert.equal(queryClient.getQueryState(keys.imagePlan(image.caseId, image.id)).fetchStatus, "idle"))
  assert.ok(view.getByLabelText(messages.cases.workspace.calibration.savedScale))
  assert.equal(view.getByRole("button", { name: imageCopy.recalibrate, exact: true }).disabled, false)
})

test("browser focus leaves a fresh preview and Tools alone, while near-expiry preview is renewed", async () => {
  const server = backend(), queryClient = client()
  server.persisted = f.publicPlan(f.persist({ base_revision: 0, document: { ...f.initial.document, calibration: f.circle } }))
  let planReads = 0, previewReads = 0
  globalThis.fetch = async (url, init) => {
    if (url.endsWith("/plan")) planReads++
    const response = await server.fetch(url, init)
    if (url.endsWith("/preview")) {
      previewReads++
      if (previewReads > 1) return Response.json({ ...await response.json(), url: `https://storage.example/preview-${previewReads}.png` })
    }
    return response
  }
  const cycleFocus = async () => act(async () => {
    focusManager.setFocused(false)
    await new Promise(resolve => setTimeout(resolve, 0))
    focusManager.setFocused(true)
    await new Promise(resolve => setTimeout(resolve, 0))
  })
  const view = render(h(Workspace, { queryClient }))
  try {
    await openImageOptions(view)
    await waitFor(() => assert.equal(queryClient.getQueryState(keys.imagePlan(image.caseId, image.id)).fetchStatus, "idle"))
    fireEvent.click(view.getByRole("button", { name: toolsCopy.title, exact: true }))
    await view.findByRole("region", { name: toolsCopy.measurements })
    const startingCounts = { planReads, previewReads }

    await cycleFocus()
    assert.deepEqual({ planReads, previewReads }, startingCounts)
    assert.ok(view.getByRole("region", { name: toolsCopy.measurements }))
    assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).getAttribute("aria-pressed"), "true")

    const previewKey = keys.preview(image.caseId, image.id)
    const preview = queryClient.getQueryData(previewKey)
    act(() => queryClient.setQueryData(previewKey, { ...preview, expiresAt: new Date(Date.now() + 8_000).toISOString() }))
    await cycleFocus()
    await waitFor(() => assert.equal(previewReads, startingCounts.previewReads + 1))
    await waitFor(() => assert.ok(view.getByRole("img").src.endsWith(`preview-${previewReads}.png`)))
    assert.equal(planReads, startingCounts.planReads)
    fireEvent.load(view.getByRole("img"))
    await waitFor(() => assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).disabled, false))
    fireEvent.click(view.getByRole("button", { name: toolsCopy.title, exact: true }))
    await view.findByRole("region", { name: toolsCopy.measurements })
  } finally { focusManager.setFocused(undefined) }
})

test("Tools starts first-time calibration guidance when no scale is saved and can open Tools after calibration", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient, introduction: true }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  const tools = await view.findByRole("button", { name: toolsCopy.title, exact: true })
  await waitFor(() => assert.equal(tools.disabled, false))
  fireEvent.click(tools)

  const copy = messages.cases.workspace.calibration.introduction
  const dialog = await view.findByRole("dialog", { name: copy.title })
  assert.ok(dialog.textContent.includes(copy.description))
  assert.equal(view.getByRole("button", { name: imageCopy.title, exact: true }).getAttribute("aria-pressed"), "true")
  assert.equal(view.container.querySelector("[data-calibration-viewport] svg line"), null)
  fireEvent.click(view.getByRole("button", { name: copy.confirm }))
  await waitFor(() => assert.equal(view.queryByRole("dialog", { name: copy.title }), null))

  fireEvent.change(await referenceInput(view, "Comprimento real"), { target: { value: "25" } })
  const viewport = view.container.querySelector("[data-calibration-viewport]")
  view.getByRole("img").parentElement.getBoundingClientRect = () => ({ left: 100, top: 50, width: 1000, height: 500, right: 1100, bottom: 550 })
  fireEvent.pointerDown(viewport, { button: 0, clientX: 200, clientY: 150 })
  fireEvent.pointerMove(viewport, { clientX: 600, clientY: 150 })
  fireEvent.pointerUp(viewport, { clientX: 600, clientY: 150 })
  assert.ok(viewport.querySelector("svg line"))
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.calibration.remote.save }))
  await view.findByRole("button", { name: imageCopy.recalibrate })
  assert.ok(view.getByRole("heading", { name: imageCopy.title, exact: true }))
  assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).getAttribute("aria-pressed"), "false")
  assert.equal(view.queryByRole("region", { name: toolsCopy.measurements }), null)
  fireEvent.click(view.getByRole("button", { name: toolsCopy.title, exact: true }))
  await view.findByRole("region", { name: toolsCopy.measurements })
  assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).getAttribute("aria-pressed"), "true")
  assert.ok(server.persisted.document.calibration.result)
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 1)
})

test("Tools stays visible during recalibration and its click does not discard the active calibration draft", async () => {
  const server = backend(), queryClient = client()
  server.persisted = f.publicPlan(f.persist({ base_revision: 0, document: { ...f.initial.document, calibration: f.circle } }))
  const saved = structuredClone(server.persisted)
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await openImageOptions(view)
  assert.ok(view.getByRole("button", { name: toolsCopy.title, exact: true }))
  await openCalibration(view, { confirmRecalibration: false })
  assert.ok(view.getByRole("dialog", { name: messages.cases.workspace.calibration.introduction.title }))
  assert.ok(view.getByRole("button", { name: toolsCopy.title, exact: true }))
  await acknowledgeRecalibration(view)
  assert.equal(view.getByRole("button", { name: "Atualizar calibração" }).disabled, true)
  const diameter = await referenceInput(view, "Diâmetro real")
  fireEvent.change(diameter, { target: { value: "35" } })
  const draft = structuredClone(queryClient.getQueryData(keys.imageCalibrationDraft(image.caseId, image.id)))
  fireEvent.click(view.getByRole("button", { name: toolsCopy.title, exact: true }))
  assert.ok(view.getByRole("heading", { name: messages.cases.workspace.calibration.title, exact: true }))
  assert.equal(view.queryByRole("heading", { name: toolsCopy.title, exact: true }), null)
  assert.equal((await referenceInput(view, "Diâmetro real")).value, "35")
  assert.deepEqual(queryClient.getQueryData(keys.imageCalibrationDraft(image.caseId, image.id)), draft)
  assert.ok(view.getByRole("button", { name: toolsCopy.title, exact: true }))
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.calibration.cancelEditing, exact: true }))
  assert.ok(view.getByRole("button", { name: toolsCopy.title, exact: true }))
  assert.deepEqual(server.persisted, saved)
  assert.equal(server.calls.some(call => call.method === "PUT" || call.method === "PATCH"), false)
})

test("switching from Tools to an uncalibrated image closes its content and Tools starts that image's calibration", async () => {
  const server = backend(), queryClient = client(), other = { ...image, id: "00000000-0000-4000-8000-000000000994" }
  server.persisted = f.publicPlan(f.persist({ base_revision: 0, document: { ...f.initial.document, calibration: f.circle } }))
  globalThis.fetch = (url, init) => url.includes(other.id) && url.endsWith("/plan")
    ? Promise.resolve(Response.json({ ...initial, imageId: other.id })) : server.fetch(url, init)
  const view = render(h(Workspace, { queryClient }))
  await openImageOptions(view)
  fireEvent.click(view.getByRole("button", { name: toolsCopy.title, exact: true }))
  assert.ok(view.getByRole("heading", { name: toolsCopy.title, exact: true }))
  view.rerender(h(Workspace, { queryClient, selected: other }))
  assert.equal(view.queryByRole("heading", { name: toolsCopy.title, exact: true }), null)
  await openImageOptions(view)
  assert.ok(view.getByRole("button", { name: toolsCopy.title, exact: true }))
  assert.ok(view.getByRole("button", { name: imageCopy.calibrate, exact: true }))
  assert.equal(view.queryByLabelText(messages.cases.workspace.calibration.savedScale), null)
  fireEvent.click(view.getByRole("button", { name: toolsCopy.title, exact: true }))
  assert.ok(view.getByRole("heading", { name: messages.cases.workspace.calibration.title, exact: true }))
  assert.equal(view.queryByRole("heading", { name: toolsCopy.title, exact: true }), null)
  assert.ok(view.getByRole("slider", { name: "Comprimento real" }))
  assert.ok(view.getByRole("button", { name: toolsCopy.title, exact: true }))
  assert.equal(server.calls.some(call => call.method === "PUT" || call.method === "PATCH"), false)
})

test("losing the confirmed scale or decoded preview closes Tools content but keeps its rail button", async () => {
  const server = backend(), queryClient = client()
  server.persisted = f.publicPlan(f.persist({ base_revision: 0, document: { ...f.initial.document, calibration: f.circle } }))
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await openImageOptions(view)
  fireEvent.click(view.getByRole("button", { name: toolsCopy.title, exact: true }))
  act(() => queryClient.setQueryData(keys.imagePlan(image.caseId, image.id), current => ({ ...current,
    revision: current.revision + 1, document: { ...current.document, calibration: null } })))
  await view.findByRole("button", { name: imageCopy.calibrate, exact: true })
  assert.ok(view.getByRole("button", { name: toolsCopy.title, exact: true }))
  assert.equal(view.queryByRole("heading", { name: toolsCopy.title, exact: true }), null)
  act(() => queryClient.setQueryData(keys.imagePlan(image.caseId, image.id), server.persisted))
  await view.findByRole("button", { name: toolsCopy.title, exact: true })
  assert.ok(view.getByRole("heading", { name: imageCopy.title, exact: true }))
  fireEvent.click(view.getByRole("button", { name: toolsCopy.title, exact: true }))
  fireEvent.error(view.getByRole("img"))
  await waitFor(() => assert.equal(view.queryByRole("heading", { name: toolsCopy.title, exact: true }), null))
  assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).disabled, true)
  assert.equal(server.calls.some(call => call.method === "PUT" || call.method === "PATCH"), false)
})

test("Tools stays in the rail when calibration is unavailable, locked or unresolved", async () => {
  const saved = f.publicPlan(f.persist({ base_revision: 0, document: { ...f.initial.document, calibration: f.circle } }))
  const scenarios = [
    { selected: { ...image, widthPx: null } },
    { selected: { ...image, kind: "DICOM", pixelSpacingMm: [0.2, 0.3] } },
    { caseLocked: true },
    { deletion: { phase: "uncertain" } },
    { receipt: { phase: "uncertain", draft: { baseRevision: saved.revision, calibration: f.line } } },
    { receipt: { phase: "conflict", currentRevision: saved.revision + 1 } },
    { draft: { baseRevision: saved.revision, kind: "line", reference: "invalid", unit: "mm", geometry: null } },
    { readError: true },
  ]
  for (const scenario of scenarios) {
    const server = backend(), queryClient = client()
    server.persisted = saved
    queryClient.setQueryData(keys.imagePlan(image.caseId, image.id), saved)
    if (scenario.receipt) queryClient.setQueryData(keys.imagePlanSave(image.caseId, image.id), scenario.receipt)
    if (scenario.draft) queryClient.setQueryData(keys.imageCalibrationDraft(image.caseId, image.id), scenario.draft)
    if (scenario.deletion) queryClient.setQueryData(keys.imageDeletion(image.caseId, image.id), scenario.deletion)
    globalThis.fetch = (url, init) => scenario.readError && url.endsWith("/plan")
      ? Promise.resolve(Response.json({ error: { code: "SERVICE_UNAVAILABLE" } }, { status: 503 })) : server.fetch(url, init)
    const view = render(h(Workspace, { queryClient, selected: scenario.selected ?? image, caseLocked: scenario.caseLocked }))
    await waitFor(() => assert.equal(queryClient.getQueryState(keys.imagePlan(image.caseId, image.id)).fetchStatus, "idle"))
    await waitFor(() => assert.ok(view.queryByRole("img")))
    fireEvent.load(view.getByRole("img"))
    fireEvent.click(view.getByRole("button", { name: imageCopy.title, exact: true }))
    assert.ok(view.getByRole("button", { name: toolsCopy.title, exact: true }))
    assert.equal(view.queryByRole("heading", { name: toolsCopy.title, exact: true }), null)
    view.unmount()
  }
})

test("the first calibration entry explains the workflow and confirms only an unsaved line with no assumed measurement", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient, introduction: true }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  await openCalibration(view)
  const copy = messages.cases.workspace.calibration.introduction
  const dialog = await view.findByRole("dialog", { name: copy.title })
  assert.ok(dialog.textContent.includes(copy.description))
  const viewport = view.container.querySelector("[data-calibration-viewport]")
  assert.equal(dialog.closest("section"), viewport.closest("section"))
  assert.equal(dialog.getAttribute("aria-modal"), null)
  assert.ok(viewport.parentElement.hasAttribute("inert"))
  assert.notEqual(document.body.style.pointerEvents, "none")
  const zoomIn = view.getByRole("button", { name: messages.cases.workspace.viewer.zoomIn })
  assert.equal(zoomIn.disabled, true)
  fireEvent.click(zoomIn)
  fireEvent.pointerDown(viewport, { button: 0, clientX: 200, clientY: 200 })
  fireEvent.pointerMove(viewport, { clientX: 400, clientY: 300 })
  fireEvent.pointerUp(viewport, { clientX: 400, clientY: 300 })
  fireEvent.keyDown(viewport, { key: "ArrowRight" })
  assert.ok(view.getByText("100%"))
  fireEvent.pointerDown(view.getByRole("heading", { name: messages.cases.workspace.calibration.title, exact: true }))
  assert.ok(view.queryByRole("dialog", { name: copy.title }))
  assert.equal(queryClient.getQueryData(keys.imageCalibrationDraft(image.caseId, image.id)), null)
  assert.equal(view.container.querySelector("[data-calibration-viewport] svg line"), null)
  const confirm = view.getByRole("button", { name: copy.confirm })
  assert.equal(document.activeElement, confirm)
  fireEvent.click(confirm)
  await waitFor(() => assert.equal(view.queryByRole("dialog"), null))
  assert.equal(viewport.parentElement.hasAttribute("inert"), false)
  assert.equal(zoomIn.disabled, false)
  const line = viewport.querySelector("svg line")
  assert.equal(line.getAttribute("x1"), "800")
  assert.equal(line.getAttribute("x2"), "1200")
  assert.equal(queryClient.getQueryData(keys.imageCalibrationDraft(image.caseId, image.id)).reference, "")
  assert.equal(view.getByRole("slider", { name: "Comprimento real" }).value, "0")
  assert.equal(view.getByRole("button", { name: "Salvar calibração" }).disabled, true)
  assert.equal(queryClient.getQueryData(keys.imageCalibrationIntroduction(image.caseId, image.id)), true)
  await waitFor(() => assert.equal(document.activeElement, viewport))
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 0)
})

test("switching panels cancels the local guidance without accepting it or leaving the viewer blocked", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient, introduction: true }))
  await openCalibration(view)
  const copy = messages.cases.workspace.calibration.introduction
  await view.findByRole("dialog", { name: copy.title })
  fireEvent.click(view.getByRole("button", { name: imageCopy.title, exact: true }))
  assert.ok(view.queryByRole("dialog", { name: copy.title }))
  assert.equal(view.getByRole("button", { name: messages.cases.workspace.viewer.zoomIn }).disabled, true)
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.images.title, exact: true }))
  await waitFor(() => assert.equal(view.queryByRole("dialog"), null))
  assert.equal(queryClient.getQueryData(keys.imageCalibrationIntroduction(image.caseId, image.id)), false)
  assert.equal(queryClient.getQueryData(keys.imageCalibrationDraft(image.caseId, image.id)), null)
  assert.equal(view.getByRole("button", { name: messages.cases.workspace.viewer.zoomIn }).disabled, false)
  await openCalibration(view)
  await view.findByRole("dialog", { name: copy.title })
  assert.equal(server.calls.some(call => call.method === "PUT" || call.method === "PATCH"), false)
})

test("canceling guidance leaves no draft; accepting it is remembered per image and organization session without undoing later discard", async () => {
  const server = backend(), queryClient = client()
  const other = { ...image, id: "00000000-0000-4000-8000-000000000995" }
  globalThis.fetch = (url, init) => url.includes(other.id) && url.endsWith("/plan")
    ? Promise.resolve(Response.json({ ...initial, imageId: other.id })) : server.fetch(url, init)
  const copy = messages.cases.workspace.calibration.introduction
  const view = render(h(Workspace, { queryClient, introduction: true }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  await openCalibration(view)
  fireEvent.keyDown(await view.findByRole("dialog", { name: copy.title }), { key: "Escape" })
  await waitFor(() => assert.equal(view.queryByRole("dialog"), null))
  assert.equal(queryClient.getQueryData(keys.imageCalibrationDraft(image.caseId, image.id)), null)
  assert.equal(queryClient.getQueryData(keys.imageCalibrationIntroduction(image.caseId, image.id)), false)
  await openCalibration(view)
  fireEvent.click(await view.findByRole("button", { name: copy.confirm }))
  await waitFor(() => assert.equal(view.queryByRole("dialog"), null))
  fireEvent.click(view.getByRole("button", { name: "Descartar ajustes" }))
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.images.title, exact: true }))
  await openCalibration(view)
  assert.equal(view.queryByRole("dialog"), null)
  assert.equal(view.container.querySelector("[data-calibration-viewport] svg line"), null)
  view.unmount()
  const reopened = render(h(Workspace, { queryClient, introduction: true }))
  await waitFor(() => assert.ok(reopened.queryByRole("img")))
  fireEvent.load(reopened.getByRole("img"))
  await openCalibration(reopened)
  assert.equal(reopened.queryByRole("dialog"), null)
  reopened.rerender(h(Workspace, { queryClient, selected: other, introduction: true }))
  await waitFor(() => assert.ok(reopened.queryByRole("img")))
  fireEvent.load(reopened.getByRole("img"))
  await openCalibration(reopened)
  await reopened.findByRole("dialog", { name: copy.title })
  reopened.unmount()
  const otherOrganization = render(h(Workspace, { queryClient: client(), introduction: true }))
  await waitFor(() => assert.ok(otherOrganization.queryByRole("img")))
  fireEvent.load(otherOrganization.getByRole("img"))
  await openCalibration(otherOrganization)
  await otherOrganization.findByRole("dialog", { name: copy.title })
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 0)
})

test("a saved calibration explains recalibration before retaining its circle, geometry and measurement", async () => {
  const server = backend(), queryClient = client()
  server.persisted = f.publicPlan(f.persist({ base_revision: 0, document: { ...f.initial.document, calibration: f.circle } }))
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient, introduction: true }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  await openCalibration(view, { confirmRecalibration: false })
  const copy = messages.cases.workspace.calibration.introduction
  assert.ok((await view.findByRole("dialog", { name: copy.title })).textContent.includes(copy.recalibrationDescription))
  await acknowledgeRecalibration(view)
  await view.findByRole("button", { name: "Atualizar calibração" })
  assert.equal(view.queryByRole("dialog"), null)
  assert.equal(view.getByRole("button", { name: "Círculo", exact: true }).getAttribute("aria-pressed"), "true")
  assert.equal(queryClient.getQueryData(keys.imageCalibrationDraft(image.caseId, image.id)), null)
  assert.ok(view.container.querySelector("[data-calibration-viewport] [data-calibration-diameter]"))
  assert.ok(view.container.querySelector("[data-calibration-viewport] [data-calibration-circle]"))
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 0)
})

test("every explicit recalibration warns before editing, preserves the saved scale on cancel and keeps other plan data on save", async () => {
  const server = backend(), queryClient = client()
  server.persisted = f.publicPlan(f.persist({ base_revision: 0, document: { ...f.initial.document, calibration: f.circle } }))
  const previous = structuredClone(server.persisted)
  queryClient.setQueryData(keys.imageCalibrationIntroduction(image.caseId, image.id), true)
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient, introduction: true }))
  await openImageOptions(view)
  fireEvent.change(view.getByRole("slider", { name: imageCopy.contrast }), { target: { value: "80" } })
  const copy = messages.cases.workspace.calibration.introduction
  await openCalibration(view, { confirmRecalibration: false })
  const popup = await view.findByRole("dialog", { name: copy.title })
  assert.ok(popup.textContent.includes(copy.recalibrationDescription))
  assert.equal(view.getByRole("button", { name: "Círculo", exact: true }).matches(":disabled"), true)
  assert.equal(view.getByRole("button", { name: "Atualizar calibração" }).disabled, true)
  fireEvent.click(view.getByRole("button", { name: "Atualizar calibração" }))
  assert.equal(server.calls.some(call => call.method === "PUT"), false)
  fireEvent.keyDown(popup, { key: "Escape" })
  await view.findByRole("button", { name: imageCopy.recalibrate })
  assert.deepEqual(server.persisted, previous)
  assert.equal(queryClient.getQueryData(keys.imageCalibrationDraft(image.caseId, image.id)), null)

  await openCalibration(view, { confirmRecalibration: false })
  await view.findByRole("dialog", { name: copy.title })
  await acknowledgeRecalibration(view)
  assert.equal(view.getByRole("button", { name: "Círculo", exact: true }).matches(":disabled"), false)
  assert.equal(view.queryByLabelText(messages.cases.workspace.calibration.savedScale), null)
  assert.equal(view.queryByText(messages.cases.workspace.calibration.remote.states.saved), null)
  fireEvent.change(await referenceInput(view, "Diâmetro real"), { target: { value: "25" } })
  assert.equal(view.queryByText(messages.cases.workspace.calibration.remote.states.editing), null)
  fireEvent.click(view.getByRole("button", { name: "Atualizar calibração" }))
  await view.findByRole("button", { name: imageCopy.recalibrate })
  assert.equal(server.persisted.document.calibration.known_diameter_mm, 25)
  const { calibration: beforeCalibration, ...beforeOther } = previous.document
  const { calibration: afterCalibration, ...afterOther } = server.persisted.document
  assert.deepEqual(afterOther, beforeOther)
  assert.equal(view.getByRole("slider", { name: imageCopy.contrast }).value, "80")
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 1)
  await openCalibration(view, { confirmRecalibration: false })
  await view.findByRole("dialog", { name: copy.title })
})

test("an existing image draft bypasses guidance and preserves its circle and invalid text", async () => {
  const server = backend(), queryClient = client()
  const draft = { baseRevision: initial.revision, kind: "circle", reference: "2,,", unit: "cm",
    geometry: { kind: "REFERENCE_CIRCLE", center: { x: 0.3, y: 0.4 }, edge: { x: 0.35, y: 0.4 } } }
  queryClient.setQueryData(keys.imageCalibrationDraft(image.caseId, image.id), draft)
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient, introduction: true }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  await openCalibration(view)
  assert.equal(view.queryByRole("dialog"), null)
  assert.equal(view.getByRole("button", { name: "Círculo", exact: true }).getAttribute("aria-pressed"), "true")
  assert.equal((await referenceInput(view, "Diâmetro real")).value, "2,,")
  assert.deepEqual(queryClient.getQueryData(keys.imageCalibrationDraft(image.caseId, image.id)), draft)
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 0)
})

test("the introduction waits for a usable plan before allowing the initial marker", async () => {
  const server = backend(), queryClient = client(), plan = deferred()
  globalThis.fetch = (url, init) => url.endsWith("/plan") ? plan.promise : server.fetch(url, init)
  const view = render(h(Workspace, { queryClient, introduction: true }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  await openCalibration(view)
  assert.equal(view.queryByRole("dialog"), null)
  assert.equal(queryClient.getQueryData(keys.imageCalibrationDraft(image.caseId, image.id)), null)
  await act(async () => plan.resolve(Response.json(initial)))
  assert.equal(view.queryByRole("dialog"), null)
  await openCalibration(view)
  await view.findByRole("dialog", { name: messages.cases.workspace.calibration.introduction.title })
  assert.equal(queryClient.getQueryData(keys.imageCalibrationDraft(image.caseId, image.id)), null)
})

test("zoom, pan and viewport resizing preserve original-matrix geometry and scale for line/circle in landscape, portrait and square images", async t => {
  for (const matrix of [{ widthPx: 2011, heightPx: 1003, previewWidthPx: 1600, previewHeightPx: 798 },
    { widthPx: 1003, heightPx: 2011, previewWidthPx: 798, previewHeightPx: 1600 },
    { widthPx: 1573, heightPx: 1573, previewWidthPx: 800, previewHeightPx: 800 }]) {
    for (const kind of ["line", "circle"]) await t.test(`${kind} ${matrix.widthPx}x${matrix.heightPx}`, async () => {
      const selected = { ...image, ...matrix }, server = backend(selected), queryClient = client()
      globalThis.fetch = server.fetch
      const view = render(h(Workspace, { queryClient, selected }))
      await waitFor(() => assert.ok(view.queryByRole("img")))
      fireEvent.load(view.getByRole("img"))
      await openCalibration(view)
      if (kind === "circle") fireEvent.click(await view.findByRole("button", { name: messages.cases.workspace.calibration.circle, exact: true }))
      const label = messages.cases.workspace.calibration.remote[kind === "line" ? "length" : "diameter"]
      fireEvent.change(await referenceInput(view, label), { target: { value: "25" } })
      fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.calibration.remote.place }))
      const expected = structuredClone(queryClient.getQueryData(keys.imageCalibrationDraft(image.caseId, image.id)))
      const viewport = view.container.querySelector("[data-calibration-viewport]"), raster = view.getByRole("img").parentElement
      const svg = raster.querySelector("svg")
      assert.equal(svg.getAttribute("viewBox"), `0 0 ${matrix.widthPx} ${matrix.heightPx}`)
      assert.ok(Math.abs(parseFloat(raster.style.width) / parseFloat(raster.style.height) - matrix.widthPx / matrix.heightPx) < 1e-12)
      for (let index = 0; index < 3; index++) fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.viewer.zoomIn }))
      fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.viewer.pan, exact: true }))
      fireEvent.pointerDown(viewport, { button: 0, clientX: 300, clientY: 200 })
      fireEvent.pointerMove(viewport, { clientX: 390, clientY: 245 })
      fireEvent.pointerUp(viewport, { clientX: 390, clientY: 245 })
      assert.ok(raster.style.transform.includes("translate(90px, 45px) scale(1.75)"))
      act(() => { for (const observer of resizeObservers) observer.resize(320, 568) })
      assert.ok(Math.abs(parseFloat(raster.style.width) / parseFloat(raster.style.height) - matrix.widthPx / matrix.heightPx) < 1e-12)
      assert.deepEqual(queryClient.getQueryData(keys.imageCalibrationDraft(image.caseId, image.id)), expected)
      fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.viewer.fit }))
      assert.ok(raster.style.transform.includes("translate(0px, 0px) scale(1)"))
      fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.calibration.remote.save }))
      await waitFor(() => assert.ok(view.queryByLabelText(messages.cases.workspace.calibration.savedScale)))
      const result = server.persisted.document.calibration.result
      const expectedPixels = kind === "line" ? matrix.widthPx * 0.2 : Math.min(matrix.widthPx, matrix.heightPx) * 0.2
      assert.ok(Math.abs(result.reference_length_px - expectedPixels) < 1e-8)
      assert.ok(Math.abs(result.mm_per_pixel - 25 / expectedPixels) < 1e-12)
      assert.equal(server.calls.filter(call => call.method === "PUT").length, 1)
      view.unmount()
    })
  }
})

test("circle and diameter stay linked through hover, zoom, endpoint drag, save and reopening against the plan API", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await editingWorkspace(view)
  act(() => { for (const observer of resizeObservers) observer.resize(1048, 548) })
  const viewport = view.container.querySelector("[data-calibration-viewport]"), raster = view.getByRole("img").parentElement
  let scale = 0.5
  raster.getBoundingClientRect = () => ({ left: scale === 0.5 ? 100 : -400, top: scale === 0.5 ? 50 : -250,
    width: 2000 * scale, height: 1000 * scale })
  const pointer = (type, x, y) => {
    const rect = raster.getBoundingClientRect()
    fireEvent[type](viewport, { button: 0, clientX: rect.left + x * scale, clientY: rect.top + y * scale })
  }
  const original = structuredClone(queryClient.getQueryData(keys.imageCalibrationDraft(image.caseId, image.id)))
  const startHandle = viewport.querySelector('[data-calibration-handle="start"]')
  const normalRadius = Number(startHandle.getAttribute("r"))
  pointer("pointerMove", 800, 500)
  assert.equal(Number(startHandle.getAttribute("r")), normalRadius * 1.75)
  assert.deepEqual(queryClient.getQueryData(keys.imageCalibrationDraft(image.caseId, image.id)), original)
  fireEvent.pointerLeave(viewport)
  assert.equal(Number(startHandle.getAttribute("r")), normalRadius)
  fireEvent.click(view.getByRole("button", { name: "Círculo", exact: true }))
  const circle = viewport.querySelector("[data-calibration-circle]"), diameter = viewport.querySelector("[data-calibration-diameter]")
  assert.equal(circle.getAttribute("stroke"), "var(--case-calibration-circle)")
  assert.equal(circle.getAttribute("cx"), "1000")
  assert.ok(Math.abs(Number(circle.getAttribute("r")) - 200) < 1e-9)
  assert.equal(diameter.getAttribute("x1"), "800")
  assert.equal(diameter.getAttribute("x2"), "1200")
  for (let index = 0; index < 4; index++) fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.viewer.zoomIn }))
  scale = 1
  const endHandle = viewport.querySelector('[data-calibration-handle="end"]')
  assert.equal(Number(endHandle.getAttribute("r")), 4)
  pointer("pointerMove", 1200, 500)
  assert.equal(Number(endHandle.getAttribute("r")), 7)
  assert.ok(Math.abs(Number(viewport.querySelector("[data-calibration-circle]").getAttribute("r")) - 200) < 1e-9)
  assert.equal(server.calls.some(call => call.method === "PUT"), false)
  pointer("pointerDown", 1200, 500)
  pointer("pointerMove", 1400, 600)
  assert.equal(viewport.querySelector("[data-calibration-circle]").getAttribute("cx"), "1100")
  assert.equal(queryClient.getQueryData(keys.imageCalibrationDraft(image.caseId, image.id)).geometry.center.x, 0.5)
  pointer("pointerUp", 1400, 600)
  assert.equal(viewport.querySelector("[data-calibration-diameter]").getAttribute("x1"), "800")
  assert.equal(viewport.querySelector("[data-calibration-diameter]").getAttribute("x2"), "1400")
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.calibration.remote.save }))
  await view.findByRole("button", { name: imageCopy.recalibrate })
  const sent = server.calls.find(call => call.method === "PUT").body.calibration
  assert.deepEqual(sent, { kind: "REFERENCE_CIRCLE", center: { x: 0.55, y: 0.55 }, edge: { x: 0.7, y: 0.6 }, known_diameter_mm: 25 })
  assert.ok(Math.abs(server.persisted.document.calibration.result.reference_length_px - Math.hypot(600, 100)) < 1e-9)
  await openCalibration(view)
  assert.equal(viewport.querySelector("[data-calibration-circle]").getAttribute("cx"), "1100")
  assert.equal(viewport.querySelector("[data-calibration-diameter]").getAttribute("x2"), "1400")
  assert.equal(view.getByRole("button", { name: "Atualizar calibração" }).disabled, true)
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 1)
})

test("drawing a circle across its diameter stores half the span as radius without doubling the API reference length", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await openCalibration(view)
  fireEvent.click(view.getByRole("button", { name: "Círculo", exact: true }))
  fireEvent.change(await referenceInput(view, "Diâmetro real"), { target: { value: "20" } })
  const viewport = view.container.querySelector("[data-calibration-viewport]")
  view.getByRole("img").parentElement.getBoundingClientRect = () => ({ left: 100, top: 50, width: 1000, height: 500 })
  fireEvent.pointerDown(viewport, { button: 0, clientX: 300, clientY: 200 })
  fireEvent.pointerMove(viewport, { clientX: 700, clientY: 400 })
  assert.equal(viewport.querySelector("[data-calibration-circle]").getAttribute("cx"), "800")
  assert.equal(viewport.querySelector("[data-calibration-diameter]").getAttribute("x1"), "400")
  fireEvent.pointerUp(viewport, { clientX: 700, clientY: 400 })
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.calibration.remote.save }))
  await view.findByRole("button", { name: imageCopy.recalibrate })
  const sent = server.calls.find(call => call.method === "PUT").body.calibration
  assert.deepEqual(sent, { kind: "REFERENCE_CIRCLE", center: { x: 0.4, y: 0.5 }, edge: { x: 0.6, y: 0.7 }, known_diameter_mm: 20 })
  assert.ok(Math.abs(server.persisted.document.calibration.result.reference_length_px - Math.hypot(800, 400)) < 1e-9)
})

test("the first diameter handle and circle body move one linked reference, which is hidden after saving", async () => {
  const server = backend(), queryClient = client()
  server.persisted = { ...initial, revision: 1, updatedAt: "2026-10-27T15:00:00Z", document: { ...initial.document,
    calibration: { kind: "REFERENCE_CIRCLE", center: { x: 0.5, y: 0.5 }, edge: { x: 0.6, y: 0.5 }, known_diameter_mm: 20,
      result: { calibration_id: "b".repeat(64), reference_length_px: 400, mm_per_pixel: 0.05 } } } }
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await openCalibration(view)
  const viewport = view.container.querySelector("[data-calibration-viewport]")
  view.getByRole("img").parentElement.getBoundingClientRect = () => ({ left: 100, top: 50, width: 1000, height: 500 })
  fireEvent.pointerDown(viewport, { button: 0, clientX: 500, clientY: 300 })
  fireEvent.pointerMove(viewport, { clientX: 400, clientY: 250 })
  fireEvent.pointerUp(viewport, { clientX: 400, clientY: 250 })
  assert.equal(viewport.querySelector("[data-calibration-circle]").getAttribute("cx"), "900")
  assert.equal(viewport.querySelector("[data-calibration-diameter]").getAttribute("x2"), "1200")
  fireEvent.pointerDown(viewport, { button: 0, clientX: 550, clientY: 275 })
  fireEvent.pointerMove(viewport, { clientX: 600, clientY: 250 })
  fireEvent.pointerUp(viewport, { clientX: 600, clientY: 250 })
  assert.equal(viewport.querySelector("[data-calibration-circle]").getAttribute("cx"), "1000")
  assert.equal(viewport.querySelector("[data-calibration-diameter]").getAttribute("x1"), "700")
  assert.equal(viewport.querySelector("[data-calibration-diameter]").getAttribute("x2"), "1300")
  fireEvent.click(view.getByRole("button", { name: "Atualizar calibração" }))
  await view.findByRole("button", { name: imageCopy.recalibrate })
  assert.equal(viewport.querySelector("[data-calibration-circle]"), null)
  assert.equal(viewport.querySelector("[data-calibration-handle]"), null)
  assert.equal(viewport.querySelector("[data-calibration-diameter]"), null)
  const sent = server.calls.find(call => call.method === "PUT").body.calibration
  assert.deepEqual(sent.center, { x: 0.5, y: 0.4 })
  assert.deepEqual(sent.edge, { x: 0.65, y: 0.45 })
  assert.equal(sent.known_diameter_mm, 20)
})

test("saved calibration never enables editing or future measurements for an unready image, missing matrix, unsupported DICOM or pending deletion", async () => {
  const persisted = f.publicPlan(f.persist({ base_revision: 0, document: { ...f.initial.document, calibration: f.line } }))
  const scenarios = [
    { selected: { ...image, status: "PROCESSING" } }, { selected: { ...image, widthPx: null } },
    { selected: { ...image, kind: "DICOM", pixelSpacingMm: [0.2, 0.4] } },
    { selected: { ...image, kind: "DICOM", imagerPixelSpacingMm: [0.4, 0.2] } },
    { selected: image, previewReady: false }, { selected: image, caseLocked: true },
    { selected: image, imageDeletion: { phase: "uncertain" } },
  ]
  for (const scenario of scenarios) {
    const queryClient = client()
    queryClient.setQueryData(keys.imagePlan(image.caseId, image.id), persisted)
    if (scenario.imageDeletion) queryClient.setQueryData(keys.imageDeletion(image.caseId, image.id), scenario.imageDeletion)
    globalThis.fetch = async (_, init) => { assert.notEqual(init.method, "PUT"); return Response.json(persisted) }
    const hook = renderHook(() => useImageCalibration(scenario.selected, scenario.previewReady ?? true, scenario.caseLocked ?? false), { wrapper: wrapper(queryClient) })
    await waitFor(() => assert.equal(hook.result.current.planQuery.isFetching, false))
    assert.equal(hook.result.current.canEdit, false)
    assert.equal(hook.result.current.canSave, false)
    assert.equal(hook.result.current.measurementEligible, false)
    act(() => { hook.result.current.placeMarker(); hook.result.current.changeReference("90") })
    assert.equal(queryClient.getQueryData(keys.imageCalibrationDraft(image.caseId, image.id)), null)
    assert.equal(hook.result.current.command(), null)
    hook.unmount()
  }
})

test("raw invalid drafts survive remounts, stay scoped to their case and organization, and resume against the latest revision", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const hook = renderHook(() => useImageCalibration(image, true, false), { wrapper: wrapper(queryClient) })
  await waitFor(() => assert.equal(hook.result.current.canEdit, true))
  act(() => { hook.result.current.placeMarker(); hook.result.current.changeUnit("cm"); hook.result.current.changeReference("1,,2") })
  const expected = structuredClone(hook.result.current.editor)
  assert.equal(hook.result.current.state, "editing")
  assert.equal(hook.result.current.measurementEligible, false)
  hook.unmount()
  server.persisted = f.publicPlan(f.persist({ base_revision: 2, document: { ...f.initial.document, calibration: f.circle } }))
  const reopened = renderHook(() => useImageCalibration(image, true, false), { wrapper: wrapper(queryClient) })
  await waitFor(() => assert.equal(reopened.result.current.state, "conflict"))
  assert.deepEqual(reopened.result.current.editor, expected)
  assert.equal(reopened.result.current.canSave, false)
  const differentCase = renderHook(() => useImageCalibration({ ...image, caseId: "00000000-0000-4000-8000-000000000999" }, true, false), { wrapper: wrapper(queryClient) })
  await waitFor(() => assert.equal(differentCase.result.current.canEdit, true))
  assert.equal(differentCase.result.current.editor.reference, "20")
  const differentOrganization = renderHook(() => useImageCalibration(image, true, false), { wrapper: wrapper(client()) })
  await waitFor(() => assert.equal(differentOrganization.result.current.canEdit, true))
  assert.equal(differentOrganization.result.current.editor.reference, "20")
  act(() => reopened.result.current.discard())
  await waitFor(() => assert.equal(reopened.result.current.state, "saved"))
  assert.equal(reopened.result.current.measurementEligible, true)
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 0)
})

test("measurement eligibility requires the current persisted result and excludes every incomplete or unresolved state", () => {
  const plan = f.publicPlan(f.persist({ base_revision: 2, document: { ...f.initial.document, calibration: f.circle } }))
  const args = { plan, imageId: image.id, receipt: { phase: "idle" }, dirty: false, needsRebase: false, pending: false, readError: false, available: true }
  assert.deepEqual(calibrationProductState(args), { state: "saved", measurementEligible: true })
  for (const override of [{ dirty: true }, { needsRebase: true }, { readError: true }, { available: false }, { imageId: "different-image" },
    { plan: { ...plan, document: { ...plan.document, calibration: { ...plan.document.calibration, result: null } } } },
    ...["saving", "checking", "uncertain", "conflict", "error"].map(phase => ({ receipt: { phase } }))]) {
    assert.equal(calibrationProductState({ ...args, ...override }).measurementEligible, false)
  }
  assert.equal(calibrationProductState({ ...args, plan: undefined, pending: true }).state, "loading")
  assert.equal(calibrationProductState({ ...args, plan: initial }).state, "uncalibrated")
})

test("canceling navigation preserves the draft; confirming discard clears it before navigating", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  let navigated = 0
  const view = render(h(Workspace, { queryClient, navigate: () => { navigated++; assert.equal(queryClient.getQueryData(keys.imageCalibrationDraft(image.caseId, image.id)), null) } }))
  await editingWorkspace(view)
  const before = queryClient.getQueryData(keys.imageCalibrationDraft(image.caseId, image.id))
  const leaving = new window.Event("beforeunload", { cancelable: true })
  window.dispatchEvent(leaving)
  assert.equal(leaving.defaultPrevented, true)
  fireEvent.click(view.getByRole("button", { name: "Navigate" }))
  const dialog = await view.findByRole("alertdialog")
  assert.equal(navigated, 0)
  fireEvent.click(view.getAllByRole("button", { name: messages.common.unsavedChanges.continueEditing, exact: true }).at(-1))
  await waitFor(() => assert.equal(view.queryByRole("alertdialog"), null))
  assert.deepEqual(queryClient.getQueryData(keys.imageCalibrationDraft(image.caseId, image.id)), before)
  fireEvent.click(view.getByRole("button", { name: "Navigate" }))
  await view.findByRole("alertdialog")
  assert.ok(dialog)
  fireEvent.click(view.getByRole("button", { name: messages.common.unsavedChanges.discard, exact: true }))
  await waitFor(() => assert.equal(navigated, 1))
  const clean = new window.Event("beforeunload", { cancelable: true }); window.dispatchEvent(clean)
  assert.equal(clean.defaultPrevented, false)
})

test("a save starting while the discard dialog is open vetoes navigation and keeps its draft until acknowledged", async () => {
  const server = backend(), queryClient = client(), began = deferred(), barrier = deferred()
  const notices = []; toast.info = (title, options) => notices.push({ title, description: options.description })
  globalThis.fetch = async (url, init) => { if (init.method === "PUT") { began.resolve(); await barrier.promise } return server.fetch(url, init) }
  let navigated = 0
  const view = render(h(Workspace, { queryClient, navigate: () => { navigated++ } }))
  await editingWorkspace(view)
  fireEvent.click(view.getByRole("button", { name: "Navigate" }))
  await view.findByRole("alertdialog")
  let saving
  await act(async () => { saving = requestCalibrationSave(queryClient, { caseId: image.caseId, imageId: image.id },
    { baseRevision: initial.revision, calibration: { kind: "REFERENCE_LINE", start: { x: 0.4, y: 0.5 }, end: { x: 0.6, y: 0.5 }, known_length_mm: 25 } }); await began.promise })
  fireEvent.click(view.getByRole("button", { name: messages.common.unsavedChanges.discard, exact: true }))
  await waitFor(() => assert.equal(view.queryByRole("alertdialog"), null))
  assert.equal(navigated, 0)
  assert.ok(queryClient.getQueryData(keys.imageCalibrationDraft(image.caseId, image.id)))
  assert.deepEqual(notices, [{ title: messages.cases.workspace.calibration.remote.navigationBlockedTitle, description: messages.cases.workspace.calibration.remote.navigationBlockedDescription }])
  fireEvent.click(view.getByRole("button", { name: "Navigate" }))
  assert.equal(navigated, 0)
  await act(async () => { barrier.resolve(); await saving })
  await waitFor(() => assert.equal(queryClient.getQueryData(keys.imageCalibrationDraft(image.caseId, image.id)), null))
  fireEvent.click(view.getByRole("button", { name: "Navigate" }))
  assert.equal(navigated, 1)
})

test("image and case deletion refuse dirty drafts before any request, including drafts whose view is unmounted", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const hook = renderHook(() => useImageCalibration(image, true, false), { wrapper: wrapper(queryClient) })
  await waitFor(() => assert.equal(hook.result.current.canEdit, true))
  act(() => hook.result.current.changeReference("invalid"))
  hook.unmount()
  const noRequest = { fetchImpl: async () => assert.fail("dirty calibration must block deletion before HTTP") }
  assert.deepEqual(await requestCaseDeletion(queryClient, image.caseId, noRequest), { phase: "error", message: "blocked" })
  assert.deepEqual(await requestImageDeletion(queryClient, { caseId: image.caseId, imageId: image.id, uploadId: "upload" }, noRequest), { phase: "error", message: "blocked" })
  assert.equal(queryClient.getQueryData(keys.imageCalibrationDraft(image.caseId, image.id)).reference, "invalid")
})

test("a persisted save clears its matching draft even after the view unmounts", async () => {
  const server = backend(), queryClient = client(), began = deferred(), barrier = deferred()
  globalThis.fetch = async (url, init) => { if (init.method === "PUT") { began.resolve(); await barrier.promise } return server.fetch(url, init) }
  const hook = renderHook(() => useImageCalibration(image, true, false), { wrapper: wrapper(queryClient) })
  await waitFor(() => assert.equal(hook.result.current.canEdit, true))
  act(() => { hook.result.current.placeMarker(); hook.result.current.changeReference("25") })
  let saving
  await act(async () => { saving = hook.result.current.save.mutateAsync({ input: hook.result.current.command() }); await began.promise })
  hook.unmount()
  barrier.resolve(); await saving
  assert.equal(queryClient.getQueryData(keys.imageCalibrationDraft(image.caseId, image.id)), null)
  const reopened = renderHook(() => useImageCalibration(image, true, false), { wrapper: wrapper(queryClient) })
  await waitFor(() => assert.equal(reopened.result.current.state, "saved"))
  assert.equal(reopened.result.current.measurementEligible, true)
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 1)
})

test("an uncertain save blocks leaving and discarding, then checking shows success once without another PUT", async () => {
  const server = backend(), queryClient = client(), notices = []
  let unreadable = false
  toast.success = (title, options) => notices.push(["success", title, options.description]); toast.error = (title, options) => notices.push(["error", title, options.description])
  globalThis.fetch = async (url, init) => {
    if (init.method === "PUT") { unreadable = true; await server.fetch(url, init); throw new TypeError("response lost") }
    if (url.endsWith("/plan") && unreadable) throw new TypeError("read unavailable")
    return server.fetch(url, init)
  }
  let navigated = 0
  const view = render(h(Workspace, { queryClient, navigate: () => { navigated++ } }))
  await editingWorkspace(view)
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.calibration.remote.save }))
  await waitFor(() => assert.ok(view.queryByRole("button", { name: messages.cases.workspace.calibration.remote.check })))
  assert.ok(view.getByRole("button", { name: toolsCopy.title, exact: true }))
  assert.equal(view.getByRole("button", { name: messages.cases.workspace.calibration.reset }).disabled, true)
  fireEvent.click(view.getByRole("button", { name: "Navigate" }))
  assert.equal(navigated, 0)
  assert.equal(view.queryByRole("alertdialog"), null)
  assert.equal(notices.some(([kind]) => kind === "success"), false)
  unreadable = false
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.calibration.remote.check }))
  await waitFor(() => assert.deepEqual(notices.filter(([kind]) => kind === "success"), [["success", messages.cases.workspace.calibration.savedTitle, messages.cases.workspace.calibration.savedDescription]]))
  assert.ok(view.getByRole("button", { name: toolsCopy.title, exact: true }))
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 1)
  fireEvent.click(view.getByRole("button", { name: "Caso", exact: true }))
  await openCalibration(view)
  assert.equal(notices.filter(([kind]) => kind === "success").length, 1)
})

test("a failed initial read shows a red Calibrate tooltip and retries from that same action without writes", async () => {
  const server = backend(), queryClient = client(), errors = [], errorIds = []
  toast.error = (title, options) => { errors.push({ title, description: options.description }); errorIds.push(options.id) }
  let fail = true, planReads = 0
  globalThis.fetch = (url, init) => {
    if (url.endsWith("/plan")) {
      planReads++
      if (fail) return Promise.resolve(Response.json({ error: { code: "SERVICE_UNAVAILABLE" } }, { status: 503 }))
    }
    return server.fetch(url, init)
  }
  const view = render(h(Workspace, { queryClient }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  await waitFor(() => assert.equal(queryClient.getQueryState(keys.imagePlan(image.caseId, image.id)).status, "error"))
  await openImageOptions(view)

  const errorCopy = messages.cases.workspace.image.calibrationReadError
  const calibrate = view.getByRole("button", { name: messages.cases.workspace.image.calibrate, exact: true })
  assert.ok(calibrate.className.includes("text-destructive"))
  const descriptionId = calibrate.getAttribute("aria-describedby")
  assert.ok(descriptionId)
  assert.equal(document.getElementById(descriptionId).textContent, errorCopy)
  assert.ok(document.getElementById(descriptionId).className.includes("sr-only"))
  assert.equal(view.queryByRole("alert"), null)
  assert.equal(view.queryByRole("button", { name: messages.cases.workspace.calibration.remote.retry }), null)
  assert.equal(errors.length, 1)
  fireEvent.focus(calibrate)
  assert.equal((await view.findByRole("tooltip")).textContent, errorCopy)
  fireEvent.blur(calibrate)

  fireEvent.click(calibrate)
  await waitFor(() => {
    assert.equal(planReads, 2)
    assert.equal(queryClient.getQueryState(keys.imagePlan(image.caseId, image.id)).fetchStatus, "idle")
  })
  assert.ok(view.getByRole("button", { name: messages.cases.workspace.image.calibrate, exact: true }))
  assert.equal(view.queryByRole("slider", { name: "Comprimento real" }), null)
  assert.equal(view.queryByRole("heading", { name: messages.cases.workspace.calibration.title, exact: true }), null)
  assert.equal(view.queryByRole("alert"), null)
  assert.equal(server.calls.some(call => call.method === "PUT" || call.method === "PATCH"), false)

  fail = false
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.image.calibrate, exact: true }))
  await waitFor(() => assert.equal(planReads, 3))
  await waitFor(() => assert.ok(view.getByRole("slider", { name: "Comprimento real" })))
  assert.equal(view.queryByRole("button", { name: messages.cases.workspace.calibration.remote.retry }), null)
  assert.equal(server.calls.some(call => call.method === "PUT" || call.method === "PATCH"), false)
  assert.deepEqual(errors, Array(2).fill({ title: messages.cases.workspace.calibration.remote.readErrorTitle,
    description: messages.cases.workspace.calibration.remote.readErrorDescription }))
  assert.deepEqual(errorIds, Array(2).fill(`calibration-read-error:${image.caseId}:${image.id}`))
})

test("leaving Image while its Calibrate retry is pending prevents a late response from opening the editor", async () => {
  const server = backend(), queryClient = client(), recovery = deferred()
  let planReads = 0
  globalThis.fetch = (url, init) => {
    if (url.endsWith("/plan")) {
      planReads++
      if (planReads === 1) return Promise.resolve(Response.json({ error: { code: "SERVICE_UNAVAILABLE" } }, { status: 503 }))
      if (planReads === 2) return recovery.promise
    }
    return server.fetch(url, init)
  }
  const view = render(h(Workspace, { queryClient }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  await waitFor(() => assert.equal(queryClient.getQueryState(keys.imagePlan(image.caseId, image.id)).status, "error"))
  await openImageOptions(view)
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.image.calibrate, exact: true }))
  await waitFor(() => assert.equal(planReads, 2))
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.sidebar.title, exact: true }))
  assert.equal(view.getByRole("button", { name: messages.cases.workspace.sidebar.title, exact: true }).getAttribute("aria-pressed"), "true")

  await act(async () => recovery.resolve(Response.json(server.persisted)))
  await waitFor(() => assert.equal(queryClient.getQueryState(keys.imagePlan(image.caseId, image.id)).fetchStatus, "idle"))
  assert.equal(view.queryByRole("slider", { name: "Comprimento real" }), null)
  assert.equal(view.queryByRole("heading", { name: messages.cases.workspace.calibration.title, exact: true }), null)
  assert.equal(server.calls.some(call => call.method === "PUT" || call.method === "PATCH"), false)
})

test("discarding a conflict reloads a known newer revision when reconciliation failed; stale saved scales stay ineligible", async () => {
  const server = backend(), queryClient = client()
  server.persisted = f.publicPlan(f.persist({ base_revision: 2, document: { ...f.initial.document, calibration: f.circle } }))
  let unreadable = false
  globalThis.fetch = async (url, init) => {
    if (init.method === "PUT") {
      server.persisted = f.publicPlan(f.persist({ base_revision: 3, document: { ...f.initial.document, calibration: f.line } }))
      unreadable = true
      return Response.json({ error: { code: "PLAN_REVISION_CONFLICT", uncertain: false, currentRevision: 4 } }, { status: 409 })
    }
    if (unreadable) throw new TypeError("read unavailable")
    return server.fetch(url, init)
  }
  const hook = renderHook(() => useImageCalibration(image, true, false), { wrapper: wrapper(queryClient) })
  await waitFor(() => assert.equal(hook.result.current.measurementEligible, true))
  act(() => hook.result.current.changeReference("25"))
  await act(async () => { await hook.result.current.save.mutateAsync({ input: hook.result.current.command() }) })
  await waitFor(() => assert.equal(hook.result.current.state, "conflict"))
  assert.equal(hook.result.current.plan.revision, 3)
  act(() => hook.result.current.discard())
  await waitFor(() => assert.equal(hook.result.current.planQuery.isError, true))
  assert.equal(hook.result.current.measurementEligible, false)
  assert.equal(hook.result.current.canEdit, false)
  unreadable = false
  act(() => hook.result.current.refresh())
  await waitFor(() => assert.equal(hook.result.current.state, "saved"))
  assert.equal(hook.result.current.plan.revision, 4)
  assert.equal(hook.result.current.editor.kind, "line")
  assert.equal(hook.result.current.measurementEligible, true)
})

test("the image trash action asks to discard calibration before opening its own destructive confirmation", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  let deleted = false
  const view = render(h(Workspace, { queryClient, actions: h(CaseImageDeleteAction, { image, onDeleted: () => { deleted = true } }) }))
  await editingWorkspace(view)
  fireEvent.click(view.getByRole("button", { name: messages.cases.imageDeletion.namedAction.replace("{name}", image.originalFilename) }))
  await view.findByRole("alertdialog", { name: messages.common.unsavedChanges.title })
  assert.equal(view.queryByRole("alertdialog", { name: messages.cases.imageDeletion.title }), null)
  fireEvent.click(view.getByRole("button", { name: messages.common.unsavedChanges.discard, exact: true }))
  await view.findByRole("alertdialog", { name: messages.cases.imageDeletion.title })
  assert.equal(queryClient.getQueryData(keys.imageCalibrationDraft(image.caseId, image.id)), null)
  assert.equal(deleted, false)
  assert.equal(server.calls.some(call => call.method === "DELETE"), false)
})

test("the shared guard discards current registrations rather than an old form and handles multiple unsaved forms", async () => {
  const first = { dirty: true, discarded: 0 }, second = { dirty: true, discarded: 0 }, replacement = { dirty: true, discarded: 0 }
  let navigated = 0
  function Form({ record, label }) {
    const { registerUnsavedChangesHandler } = useUnsavedChangesGuard()
    React.useEffect(() => registerUnsavedChangesHandler({ hasUnsavedChanges: () => record.dirty,
      discardChanges: () => { record.dirty = false; record.discarded++ },
      getUnsavedChanges: () => [{ field: label, label, previousValue: "before", value: "after" }],
    }), [record, label, registerUnsavedChangesHandler])
    return null
  }
  const tree = current => h(NextIntlClientProvider, { locale: "pt-BR", timeZone: "UTC", messages }, h(UnsavedChangesGuard, null,
    h(Form, { record: current, label: "first" }), h(Form, { record: second, label: "second" }), h(NavigationProbe, { navigate: () => { navigated++ } })))
  const view = render(tree(first))
  fireEvent.click(view.getByRole("button", { name: "Navigate" }))
  await view.findByRole("alertdialog")
  view.rerender(tree(replacement))
  fireEvent.click(view.getByRole("button", { name: messages.common.unsavedChanges.discard, exact: true }))
  assert.equal(first.discarded, 0)
  assert.equal(replacement.discarded, 1)
  assert.equal(second.discarded, 1)
  assert.equal(navigated, 1)
})

test("image options wait for decoding; saving calibration hides the reference and reopens the saved scale", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  const ruler = view.getByRole("button", { name: messages.cases.workspace.image.title, exact: true })
  assert.equal(ruler.disabled, true)
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  await waitFor(() => assert.equal(ruler.disabled, false))
  fireEvent.click(ruler)
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.image.calibrate }))
  const reference = await referenceInput(view, "Comprimento real")
  fireEvent.change(reference, { target: { value: "2,5" } })
  await chooseUnit(view, "cm")
  // Changing units preserves the physical size; explicitly enter 2.5 cm afterwards.
  fireEvent.change(reference, { target: { value: "2,5" } })
  fireEvent.click(view.getByRole("button", { name: "Posicionar referência" }))
  const viewport = view.container.querySelector("[data-calibration-viewport]")
  fireEvent.keyDown(viewport, { key: "ArrowRight", shiftKey: true })
  assert.equal(viewport.querySelector("svg line")?.getAttribute("x1"), "810")
  fireEvent.click(view.getByRole("button", { name: "Salvar calibração" }))
  await waitFor(() => assert.ok(view.queryByLabelText(messages.cases.workspace.calibration.savedScale)))
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 1)
  const sent = server.calls.find(call => call.method === "PUT").body
  assert.equal(sent.calibration.known_length_mm, 25)
  assert.equal(sent.calibration.start.x, 0.405)
  assert.equal(sent.calibration.result, undefined)
  fireEvent.click(view.getByRole("button", { name: "Caso", exact: true }))
  assert.equal(viewport.querySelector("svg line"), null, "a confirmed reference is hidden by default")
  assert.equal(view.queryByRole("button", { name: "Marcar referência" }), null)
  view.unmount()
  queryClient.clear()
  const reopened = render(h(Workspace, { queryClient }))
  await waitFor(() => assert.ok(reopened.queryByRole("img")))
  fireEvent.load(reopened.getByRole("img"))
  await openCalibration(reopened)
  await waitFor(() => assert.ok(reopened.container.querySelector("[data-calibration-viewport] svg line")), "recalibration restores the persisted reference")
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 1)
})

test("the ruler is the default control and saves centimetres as millimetres without requiring typing", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  await openCalibration(view)
  const ruler = await view.findByRole("slider", { name: "Comprimento real" })
  assert.equal(view.queryByRole("textbox"), null)
  assert.equal(view.queryByText(messages.cases.workspace.calibration.description), null)
  assert.equal(view.container.querySelector("details"), null)
  assert.equal(view.queryByRole("tooltip"), null)
  fireEvent.click(view.getByRole("button", { name: "Posicionar referência" }))
  assert.equal(view.queryByRole("alert"), null, "placing a marker before choosing a size is an incomplete draft, not an error")
  fireEvent.change(ruler, { target: { value: "2.5" } })
  fireEvent.click(view.getByRole("button", { name: "Salvar calibração" }))
  await waitFor(() => assert.ok(view.queryByLabelText(messages.cases.workspace.calibration.savedScale)))
  assert.equal(server.persisted.document.calibration.known_length_mm, 25)
  await openCalibration(view)
  fireEvent.click(view.getByRole("button", { name: "Outro valor" }))
  assert.equal(view.getByRole("textbox", { name: "Comprimento real" }).value, "25")
  await chooseUnit(view, "cm")
  fireEvent.click(view.getByRole("button", { name: "Outro valor" }))
  assert.equal(view.getByRole("button", { name: "Atualizar calibração" }).disabled, true, "opening or closing typing does not dirty a saved calibration")
  fireEvent.change(view.getByRole("slider", { name: "Comprimento real" }), { target: { value: "3" } })
  fireEvent.click(view.getByRole("button", { name: "Atualizar calibração" }))
  await waitFor(() => assert.equal(server.persisted.document.calibration.known_length_mm, 30))
})

test("a typed size beyond the ruler range reopens exactly and collapsing the input preserves it", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  await openCalibration(view)
  fireEvent.change(await referenceInput(view, "Comprimento real"), { target: { value: "123,456" } })
  fireEvent.click(view.getByRole("button", { name: "Posicionar referência" }))
  fireEvent.click(view.getByRole("button", { name: "Outro valor" }))
  fireEvent.click(view.getByRole("button", { name: "Salvar calibração" }))
  await waitFor(() => assert.ok(view.queryByLabelText(messages.cases.workspace.calibration.savedScale)))
  assert.equal(server.persisted.document.calibration.known_length_mm, 123.456)
  view.unmount(); queryClient.clear()
  const reopened = render(h(Workspace, { queryClient }))
  await waitFor(() => assert.ok(reopened.queryByRole("img")))
  fireEvent.load(reopened.getByRole("img"))
  await openCalibration(reopened)
  assert.equal((await reopened.findByRole("textbox", { name: "Comprimento real" })).value, "123.456")
  assert.equal(reopened.getByRole("button", { name: "Atualizar calibração" }).disabled, true)
})

test("calibration explanations open as tooltips by keyboard or tap without changing the draft", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  await openCalibration(view)
  const help = await view.findByRole("button", { name: "Como ajustar" })
  assert.equal(view.queryByRole("tooltip"), null)
  act(() => help.focus())
  assert.ok((await view.findByRole("tooltip")).textContent.includes(messages.cases.workspace.calibration.lineHint))
  fireEvent.keyDown(help, { key: "Escape" })
  await waitFor(() => assert.equal(view.queryByRole("tooltip"), null))
  act(() => help.blur())
  fireEvent.click(help)
  assert.ok((await view.findByRole("tooltip")).textContent.includes(messages.cases.workspace.calibration.remote.keyboard))
  fireEvent.click(help)
  await waitFor(() => assert.equal(view.queryByRole("tooltip"), null))
  fireEvent.click(view.getByRole("button", { name: "Sobre a medida real" }))
  assert.ok((await view.findByRole("tooltip")).textContent.includes(messages.cases.workspace.calibration.remote.sizeHelp))
  fireEvent.keyDown(document, { key: "Escape" })
  await waitFor(() => assert.equal(view.queryByRole("tooltip"), null))
  assert.equal(view.queryByRole("button", { name: "Sobre a calibração" }), null)
  assert.equal(view.getByRole("slider", { name: "Comprimento real" }).value, "0")
  assert.equal(view.getByRole("button", { name: "Descartar ajustes" }).disabled, false, "an unchanged calibration form can still be cancelled")
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 0)
})

test("circle editing, invalid input, discard and preview renewal preserve the correct image draft", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  await openCalibration(view)
  const shape = await view.findByRole("button", { name: "Círculo", exact: true })
  fireEvent.click(shape)
  const reference = await referenceInput(view, "Diâmetro real")
  fireEvent.change(reference, { target: { value: "10001" } })
  fireEvent.click(view.getByRole("button", { name: "Posicionar referência" }))
  assert.equal(view.getByRole("button", { name: "Salvar calibração" }).disabled, true)
  assert.equal(reference.getAttribute("aria-invalid"), "true")
  fireEvent.change(reference, { target: { value: "20" } })
  act(() => { queryClient.setQueryData(keys.preview(image.caseId, image.id), current => ({ ...current, url: "https://storage.example/renewed.png" })) })
  assert.equal(reference.value, "20")
  await waitFor(() => assert.equal(view.getByRole("img").src, "https://storage.example/renewed.png"))
  fireEvent.load(view.getByRole("img"))
  await waitFor(() => assert.equal(view.getByRole("button", { name: "Salvar calibração" }).disabled, false))
  fireEvent.click(view.getByRole("button", { name: "Descartar ajustes" }))
  assert.ok(view.getByRole("button", { name: messages.cases.workspace.image.calibrate }))
  await openCalibration(view)
  assert.equal((await referenceInput(view, "Comprimento real")).value, "")
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 0)
})

test("an unconfirmed save keeps its draft and a check reads the persisted result without replaying PUT", async () => {
  const server = backend(), queryClient = client()
  let unreadable = false
  globalThis.fetch = async (url, init) => {
    if (init.method === "PUT") { unreadable = true; await server.fetch(url, init); throw new TypeError("response lost") }
    if (unreadable) throw new TypeError("read unavailable")
    return server.fetch(url, init)
  }
  const hook = renderHook(() => useImageCalibration(image, true, false), { wrapper: wrapper(queryClient) })
  await waitFor(() => assert.equal(hook.result.current.canEdit, true))
  act(() => hook.result.current.placeMarker())
  act(() => hook.result.current.changeReference("25"))
  const command = hook.result.current.command()
  await act(async () => { await hook.result.current.save.mutateAsync({ input: command }) })
  await waitFor(() => assert.equal(hook.result.current.receipt.phase, "uncertain"))
  assert.equal(hook.result.current.editor.reference, "25")
  assert.equal(hook.result.current.canEdit, false)
  unreadable = false
  act(() => hook.result.current.check())
  await waitFor(() => assert.equal(hook.result.current.receipt.phase, "saved"))
  assert.equal(hook.result.current.hasChanges, false)
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 1)
})

test("revision conflict retains the draft and disables save until explicitly discarding to load the latest plan", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = async (url, init) => {
    if (init.method === "PUT") {
      server.persisted = f.publicPlan(f.persist({ base_revision: 2, document: { ...f.initial.document, calibration: f.circle } }))
      return Response.json({ error: { code: "PLAN_REVISION_CONFLICT", uncertain: false } }, { status: 409 })
    }
    return server.fetch(url, init)
  }
  const hook = renderHook(() => useImageCalibration(image, true, false), { wrapper: wrapper(queryClient) })
  await waitFor(() => assert.equal(hook.result.current.canEdit, true))
  act(() => hook.result.current.placeMarker())
  act(() => hook.result.current.changeReference("25"))
  await act(async () => { await hook.result.current.save.mutateAsync({ input: hook.result.current.command() }) })
  await waitFor(() => assert.equal(hook.result.current.receipt.phase, "conflict"))
  assert.equal(hook.result.current.editor.reference, "25")
  assert.equal(hook.result.current.canSave, false)
  act(() => hook.result.current.discard())
  await waitFor(() => assert.equal(hook.result.current.hasChanges, false))
  assert.equal(hook.result.current.editor.kind, "circle")
  assert.equal(hook.result.current.editor.baseRevision, 3)
})

test("saving locks edits immediately and ignores simultaneous changes until the persisted acknowledgement arrives", async () => {
  const server = backend(), queryClient = client(), began = deferred(), barrier = deferred()
  globalThis.fetch = async (url, init) => {
    if (init.method === "PUT") { began.resolve(); await barrier.promise }
    return server.fetch(url, init)
  }
  const hook = renderHook(() => useImageCalibration(image, true, false), { wrapper: wrapper(queryClient) })
  await waitFor(() => assert.equal(hook.result.current.canEdit, true))
  act(() => hook.result.current.placeMarker())
  act(() => hook.result.current.changeReference("25"))
  let saving
  await act(async () => { saving = hook.result.current.save.mutateAsync({ input: hook.result.current.command() }); await began.promise })
  await waitFor(() => assert.equal(hook.result.current.locked, true))
  act(() => hook.result.current.changeReference("99"))
  assert.equal(hook.result.current.editor.reference, "25")
  await act(async () => { barrier.resolve(); await saving })
  assert.equal(hook.result.current.hasChanges, false)
  assert.equal(hook.result.current.plan.document.calibration.known_length_mm, 25)
})

test("pointer gestures map the displayed rectangle to the original image and cannot edit saved markers in other panels", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  await openCalibration(view)
  const input = await referenceInput(view, "Comprimento real")
  fireEvent.change(input, { target: { value: "50" } })
  const viewport = view.container.querySelector("[data-calibration-viewport]")
  view.getByRole("img").parentElement.getBoundingClientRect = () => ({ left: 100, top: 50, width: 1000, height: 500, right: 1100, bottom: 550 })
  fireEvent.pointerDown(viewport, { button: 0, clientX: 200, clientY: 150 })
  fireEvent.pointerMove(viewport, { clientX: 600, clientY: 350 })
  fireEvent.pointerUp(viewport, { clientX: 600, clientY: 350 })
  fireEvent.click(view.getByRole("button", { name: "Salvar calibração" }))
  await waitFor(() => assert.ok(view.queryByLabelText(messages.cases.workspace.calibration.savedScale)))
  const sent = server.calls.find(call => call.method === "PUT").body.calibration
  assert.deepEqual(sent.start, { x: 0.1, y: 0.2 })
  assert.deepEqual(sent.end, { x: 0.5, y: 0.6 })
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.images.title, exact: true }))
  assert.equal(viewport.querySelector("svg line"), null)
  fireEvent.pointerDown(viewport, { button: 0, clientX: 200, clientY: 150 })
  fireEvent.pointerUp(viewport, { clientX: 800, clientY: 400 })
  assert.equal(viewport.querySelector("svg line"), null)
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 1)
})

test("a circle saves its center and edge using the actual diameter and reopens as a circle", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  await openCalibration(view)
  fireEvent.click(await view.findByRole("button", { name: "Círculo", exact: true }))
  fireEvent.change(await referenceInput(view, "Diâmetro real"), { target: { value: "20" } })
  fireEvent.click(view.getByRole("button", { name: "Posicionar referência" }))
  fireEvent.click(view.getByRole("button", { name: "Salvar calibração" }))
  await waitFor(() => assert.ok(view.queryByLabelText(messages.cases.workspace.calibration.savedScale)))
  assert.ok(Math.abs(server.persisted.document.calibration.result.reference_length_px - 200) < 1e-9)
  assert.ok(Math.abs(server.persisted.document.calibration.result.mm_per_pixel - 0.1) < 1e-12)
  assert.equal(server.persisted.document.calibration.known_diameter_mm, 20)
  view.unmount(); queryClient.clear()
  const reopened = render(h(Workspace, { queryClient }))
  await waitFor(() => assert.ok(reopened.queryByRole("img")))
  fireEvent.load(reopened.getByRole("img"))
  await openCalibration(reopened)
  assert.equal((await reopened.findByRole("button", { name: "Círculo", exact: true })).getAttribute("aria-pressed"), "true")
  assert.equal((await referenceInput(reopened, "Diâmetro real")).value, "20")
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 1)
})

test("a different image never inherits the previous image's draft or original dimensions", async () => {
  const server = backend(), queryClient = client()
  const other = { ...image, id: "00000000-0000-4000-8000-000000000999", widthPx: 1000, heightPx: 2000 }
  globalThis.fetch = async (url, init) => url.includes(other.id) && url.endsWith("/plan")
    ? Response.json({ ...initial, imageId: other.id }) : server.fetch(url, init)
  const view = render(h(Workspace, { queryClient }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  await openCalibration(view)
  fireEvent.change(await referenceInput(view, "Comprimento real"), { target: { value: "25" } })
  fireEvent.click(view.getByRole("button", { name: "Posicionar referência" }))
  view.rerender(h(Workspace, { queryClient, selected: other }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  await openCalibration(view)
  const input = await referenceInput(view, "Comprimento real")
  assert.equal(input.value, "")
  assert.equal(view.container.querySelector("[data-calibration-viewport] svg line"), null)
  assert.equal(view.getByRole("button", { name: "Salvar calibração" }).disabled, true)
})

test("switching from drawing to pan cancels an in-progress gesture before pointer release", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  await openCalibration(view)
  fireEvent.change(await referenceInput(view, "Comprimento real"), { target: { value: "50" } })
  const viewport = view.container.querySelector("[data-calibration-viewport]")
  view.getByRole("img").parentElement.getBoundingClientRect = () => ({ left: 100, top: 50, width: 1000, height: 500, right: 1100, bottom: 550 })
  fireEvent.pointerDown(viewport, { button: 0, clientX: 200, clientY: 150 })
  fireEvent.pointerMove(viewport, { clientX: 600, clientY: 350 })
  assert.ok(viewport.querySelector("svg line"))
  fireEvent.click(view.getByRole("button", { name: "Mover imagem", exact: true }))
  fireEvent.pointerUp(viewport, { clientX: 600, clientY: 350 })
  assert.equal(viewport.querySelector("svg line"), null)
  assert.equal(view.getByRole("button", { name: "Salvar calibração" }).disabled, true)
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 0)
})

test("updates batched in one event compose the geometry, value and unit instead of replacing each other", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const hook = renderHook(() => useImageCalibration(image, true, false), { wrapper: wrapper(queryClient) })
  await waitFor(() => assert.equal(hook.result.current.canEdit, true))
  act(() => {
    hook.result.current.placeMarker()
    hook.result.current.changeReference("25")
    hook.result.current.changeUnit("cm")
  })
  assert.equal(hook.result.current.editor.reference, "2.5")
  assert.equal(hook.result.current.editor.unit, "cm")
  assert.equal(hook.result.current.command().calibration.known_length_mm, 25)
  assert.ok(hook.result.current.marker)
  act(() => hook.result.current.discard())
  act(() => {
    hook.result.current.changeKind("circle")
    hook.result.current.placeMarker()
    hook.result.current.changeReference("20")
  })
  assert.equal(hook.result.current.command().calibration.kind, "REFERENCE_CIRCLE")
})

test("retrying a failed image with the same preview URL waits for decoding again before enabling calibration", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  const ruler = view.getByRole("button", { name: messages.cases.workspace.image.title, exact: true })
  fireEvent.load(view.getByRole("img"))
  await waitFor(() => assert.equal(ruler.disabled, false))
  fireEvent.error(view.getByRole("img"))
  const retry = await view.findByRole("button", { name: messages.cases.workspace.preview.refresh })
  assert.equal(ruler.disabled, true)
  fireEvent.click(retry)
  await waitFor(() => assert.ok(view.queryByRole("img")))
  assert.equal(ruler.disabled, true, "a successful metadata retry cannot stand in for image decoding")
  fireEvent.load(view.getByRole("img"))
  await waitFor(() => assert.equal(ruler.disabled, false))
})

test("a second touch cannot replace or finish the pointer that is drawing a reference", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  await openCalibration(view)
  fireEvent.change(await referenceInput(view, "Comprimento real"), { target: { value: "50" } })
  const viewport = view.container.querySelector("[data-calibration-viewport]")
  view.getByRole("img").parentElement.getBoundingClientRect = () => ({ left: 100, top: 50, width: 1000, height: 500, right: 1100, bottom: 550 })
  function pointer(type, id, primary, x, y) {
    const event = new dom.window.MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y })
    Object.defineProperties(event, { pointerId: { value: id }, isPrimary: { value: primary } })
    fireEvent(viewport, event)
  }
  pointer("pointerdown", 1, true, 200, 150)
  pointer("pointerdown", 2, false, 400, 300)
  pointer("pointermove", 1, true, 600, 350)
  pointer("pointerup", 2, false, 800, 400)
  assert.equal(view.getByRole("button", { name: "Salvar calibração" }).disabled, true)
  pointer("pointerup", 1, true, 600, 350)
  fireEvent.click(view.getByRole("button", { name: "Salvar calibração" }))
  await waitFor(() => assert.ok(view.queryByLabelText(messages.cases.workspace.calibration.savedScale)))
  const calibration = server.calls.find(call => call.method === "PUT").body.calibration
  assert.deepEqual(calibration.start, { x: 0.1, y: 0.2 })
  assert.deepEqual(calibration.end, { x: 0.5, y: 0.6 })
})

test("a partially visible saved circle can be moved, resized by keyboard and saved without a geometry jump", async () => {
  const server = backend(), queryClient = client()
  server.persisted = { ...initial, revision: 1, updatedAt: "2026-10-26T15:00:00Z", document: { ...initial.document,
    calibration: { kind: "REFERENCE_CIRCLE", center: { x: 0.02, y: 0.5 }, edge: { x: 0.07, y: 0.5 }, known_diameter_mm: 20,
      result: { calibration_id: "b".repeat(64), reference_length_px: 200, mm_per_pixel: 0.1 } } } }
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  await openCalibration(view)
  await view.findByRole("slider", { name: "Diâmetro real" })
  const viewport = view.container.querySelector("[data-calibration-viewport]")
  view.getByRole("img").parentElement.getBoundingClientRect = () => ({ left: 100, top: 50, width: 1000, height: 500, right: 1100, bottom: 550 })
  fireEvent.pointerDown(viewport, { button: 0, clientX: 120, clientY: 300 })
  fireEvent.pointerUp(viewport, { clientX: 121, clientY: 299 })
  assert.equal(viewport.querySelector("svg circle").getAttribute("cx"), "42")
  fireEvent.keyDown(viewport, { key: "ArrowRight", altKey: true })
  fireEvent.click(view.getByRole("button", { name: "Atualizar calibração" }))
  await waitFor(() => assert.equal(server.calls.filter(call => call.method === "PUT").length, 1))
  const sent = server.calls.find(call => call.method === "PUT").body.calibration
  assert.equal(sent.center.x, 0.021)
  assert.equal(sent.center.y, 0.498)
  assert.ok(Math.abs(sent.edge.x - 0.0715) < 1e-12)
  assert.equal(sent.edge.y, 0.498)
  assert.equal(sent.known_diameter_mm, 20)
  await waitFor(() => assert.ok(view.queryByLabelText(messages.cases.workspace.calibration.savedScale)))
})

test("losing pointer capture cancels an unfinished reference instead of committing it on a late release", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  await openCalibration(view)
  fireEvent.change(await referenceInput(view, "Comprimento real"), { target: { value: "50" } })
  const viewport = view.container.querySelector("[data-calibration-viewport]")
  view.getByRole("img").parentElement.getBoundingClientRect = () => ({ left: 100, top: 50, width: 1000, height: 500, right: 1100, bottom: 550 })
  fireEvent.pointerDown(viewport, { button: 0, clientX: 200, clientY: 150 })
  fireEvent.pointerMove(viewport, { clientX: 600, clientY: 350 })
  assert.ok(viewport.querySelector("svg line"))
  fireEvent.lostPointerCapture(viewport)
  fireEvent.pointerUp(viewport, { clientX: 600, clientY: 350 })
  assert.equal(viewport.querySelector("svg line"), null)
  assert.equal(view.getByRole("button", { name: "Salvar calibração" }).disabled, true)
})
