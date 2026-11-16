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
const { render, renderHook, fireEvent, waitFor, cleanup, act, within } = await import("@testing-library/react")
const { QueryClient, QueryClientProvider, focusManager } = await import("@tanstack/react-query")
const { NextIntlClientProvider } = await import("next-intl")
const { UnsavedChangesGuard, useUnsavedChangesGuard } = await import("../src/components/shared/app-shell/unsaved-changes-guard.tsx")
const { CaseImageWorkspace } = await import("../src/features/cases/components/case-image-workspace.tsx")
const { CaseImageViewer } = await import("../src/features/cases/components/case-image-viewer.tsx")
const { CaseImageToolsPanel } = await import("../src/features/cases/components/case-image-tools-panel.tsx")
const { CaseImageDistanceValues } = await import("../src/features/cases/components/case-image-distance-values.tsx")
const { CaseImageDistanceToolbar } = await import("../src/features/cases/components/case-image-distance-toolbar.tsx")
const { CaseImageDistanceActions } = await import("../src/features/cases/components/case-image-distance-actions.tsx")
const { CaseImageAngleValueControl } = await import("../src/features/cases/components/case-image-angle-value-control.tsx")
const { DistanceOverlay } = await import("../src/features/cases/components/distance-overlay.tsx")
const { selectSavedDistances } = await import("../src/features/cases/lib/distance-result.ts")
const { CaseImageDeleteAction } = await import("../src/features/cases/components/case-image-delete-action.tsx")
const { useImageCalibration } = await import("../src/features/cases/hooks/use-image-calibration.ts")
const { useImageDistance } = await import("../src/features/cases/hooks/use-image-distance.ts")
const { distanceEditorFromCommand } = await import("../src/features/cases/lib/distance-editor.ts")
const { applyPlanCommand } = await import("../src/features/cases/schemas/image-plan-command.schema.ts")
const { qualityFields } = await import("../src/features/cases/lib/image-quality-draft.ts")
const { hasImagePlanDraft } = await import("../src/features/cases/lib/image-plan-draft.ts")
const { casesQueryKeys: keys } = await import("../src/features/cases/hooks/cases-query-keys.ts")
const { requestCalibrationSave, requestPlanEditSave, checkImagePlanSave } = await import("../src/features/cases/lib/image-plan-saving.ts")
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
          document: input.kind === "radiographic-quality" ? { ...persisted.document, radiographic_quality: input.quality }
            : applyPlanCommand(persisted.document, input) }
        return Response.json(persisted)
      }
      if (init.method !== "PUT") return Response.json(persisted)
      const input = JSON.parse(init.body), calibration = input.calibration
      const length = calibration.kind === "REFERENCE_LINE"
        ? Math.hypot((calibration.end.x - calibration.start.x) * dimensions.widthPx, (calibration.end.y - calibration.start.y) * dimensions.heightPx)
        : 2 * Math.hypot((calibration.edge.x - calibration.center.x) * dimensions.widthPx, (calibration.edge.y - calibration.center.y) * dimensions.heightPx)
      const document = applyPlanCommand(persisted.document, input)
      if (input.initialDistance || input.distanceId) {
        const line = document.objects.find(object => object.id === (input.initialDistance?.id ?? input.distanceId))
        line.measurement = { status: "CALCULATED", calibration_id: "b".repeat(64), values: { length: calibration.known_length_mm ?? calibration.known_diameter_mm }, units: { length: "mm" } }
      }
      persisted = { ...persisted, revision: input.baseRevision + 1, updatedAt: "2026-10-26T15:00:00Z", document: { ...document,
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
async function openToolsMeasurements(view) {
  if (view.queryByRole("heading", { name: toolsCopy.measurements, exact: true })) {
    await view.findByRole("region", { name: toolsCopy.measurements, exact: true })
    return
  }
  const tools = view.getByRole("button", { name: toolsCopy.title, exact: true })
  if (tools.getAttribute("aria-pressed") !== "true") fireEvent.click(tools)
  if (!view.queryByRole("heading", { name: toolsCopy.measurements, exact: true })) {
    const measurements = view.queryByRole("button", { name: toolsCopy.measurements, exact: true })
    if (measurements) fireEvent.click(measurements)
  }
  await view.findByRole("heading", { name: toolsCopy.measurements, exact: true })
  await view.findByRole("region", { name: toolsCopy.measurements, exact: true })
}
async function openImageOptions(view) {
  await waitFor(() => assert.ok(view.queryByRole("img")))
  // A remount can renew the signed URL; decode the resulting image, not a stale
  // cached element that React will replace after the metadata promise settles.
  await act(async () => {})
  fireEvent.load(view.getByRole("img"))
  fireEvent.click(view.getByRole("button", { name: imageCopy.title, exact: true }))
  await view.findByRole("slider", { name: imageCopy.brightness })
}

async function savedImageOptions(view) {
  // Calibration saves hand off to Tools; image-adjustment tests explicitly reopen Image.
  await waitFor(() => assert.ok(view.queryByRole("button", { name: imageCopy.recalibrate, exact: true })
    || view.getByRole("button", { name: toolsCopy.title, exact: true }).getAttribute("aria-pressed") === "true"))
  await openImageOptions(view)
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

test("line calibration opens Tools only after acknowledgement and preserves image adjustments when returning to Image", async () => {
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
    await waitFor(() => assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).getAttribute("aria-pressed"), "true"))
    await savedImageOptions(view)
    assert.ok(view.getByRole("button", { name: toolsCopy.title, exact: true }))
    assert.ok(view.getByRole("heading", { name: imageCopy.title, exact: true }))
    assert.equal(view.queryByRole("slider", { name: "Comprimento real" }), null)
    assert.equal(view.queryByRole("button", { name: "Marcar referência" }), null)
    assert.equal(view.container.querySelector("[data-calibration-handle]"), null)
    assert.ok(!view.container.querySelector("[data-distance-id] text"))
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
  assert.equal(segment().parentElement.getAttribute("stroke"), "var(--radiograph-mark-measurement)")
  for (const handle of viewport.querySelectorAll("[data-calibration-handle]")) assert.equal(handle.getAttribute("fill"), "var(--radiograph-mark-measurement)")
  if (kind === "circle") assert.equal(viewport.querySelector("[data-calibration-circle]").getAttribute("stroke"), "var(--radiograph-mark-interest)")
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
  await savedImageOptions(view)
  const sent = server.calls.find(call => call.method === "PUT").body.calibration
  if (kind === "line") assert.deepEqual(sent, { kind: "REFERENCE_LINE", start: { x: 0.0495, y: 0.29 }, end: { x: 0.5495, y: 0.79 }, known_length_mm: 20 })
  else {
    assert.equal(sent.kind, "REFERENCE_CIRCLE"); assert.equal(sent.known_diameter_mm, 20)
    near(sent.center.x, 0.2995); near(sent.center.y, 0.54)
    near(sent.edge.x, 0.5495); near(sent.edge.y, 0.79)
  }
  near(server.persisted.document.calibration.result.reference_length_px, Math.hypot(1000, 500))
  const savedPlan = structuredClone(server.persisted)
  assert.ok(!viewport.querySelector("[data-calibration-circle]"))
  assert.equal(viewport.querySelectorAll("[data-distance-id]").length, 0)
  const savedSegments = [...viewport.querySelectorAll("svg line")].map(line => ["x1", "x2", "y1", "y2"].map(key => line.getAttribute(key)))
  assert.equal(viewport.querySelector("[data-calibration-handle]"), null)
  fireEvent.click(view.getByRole("button", { name: imageCopy.mirror }))
  assert.equal(raster.dataset.imageMirrored, "false")
  assert.deepEqual([...viewport.querySelectorAll("svg line")].map(line => ["x1", "x2", "y1", "y2"].map(key => line.getAttribute(key))), savedSegments)
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
  await savedImageOptions(view)
  const sent = server.calls.find(call => call.method === "PUT").body.calibration
  assert.deepEqual(sent.start, { x: 0, y: 0.2 }); assert.deepEqual(sent.end, { x: 1, y: 0.6 })
})

test("an unconfirmed recalibration stays in its editor across remounts and hands off its line only after a read confirms it", async () => {
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
  await savedImageOptions(view)
  assert.ok(!view.container.querySelector("[data-calibration-circle]"))
  assert.equal(view.container.querySelectorAll("[data-distance-id]").length, 0)
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
  await savedImageOptions(view)
  assert.deepEqual(server.persisted.document.radiographic_quality, internalQuality)
  assert.deepEqual(server.persisted.document.tplo, internalTplo)
  const input = server.calls.find(call => call.method === "PUT").body
  assert.deepEqual(Object.keys(input), ["baseRevision", "calibration", "initialDistance"])
  assert.deepEqual(Object.keys(input.initialDistance), ["id", "label"])
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
  assert.ok(view.getByRole("button", { name: toolsCopy.measurements, exact: true }))
  assert.ok(!view.queryByRole("region", { name: toolsCopy.measurements }))
  assert.ok(!view.queryByRole("list", { name: messages.cases.workspace.distance.list }))
  assert.equal(view.queryByRole("button", { name: messages.cases.workspace.viewer.mark }), null)
  assert.equal(view.queryByRole("slider", { name: "Comprimento real" }), null)
  assert.equal(view.container.querySelector("[data-calibration-viewport] svg").children.length, 0)
  fireEvent.click(view.getByRole("button", { name: toolsCopy.measurements, exact: true }))
  assert.ok(document.activeElement === view.getByRole("heading", { name: toolsCopy.measurements, exact: true }))
  assert.ok(view.getByRole("region", { name: toolsCopy.measurements }))
  assert.ok(view.getByRole("button", { name: messages.cases.workspace.distance.title, exact: true }))
  assert.ok(!view.queryByRole("list", { name: messages.cases.workspace.distance.list }))
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
  await openToolsMeasurements(view)

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
  await openToolsMeasurements(view)

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
    await openToolsMeasurements(view)
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
    await openToolsMeasurements(view)
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
  await savedImageOptions(view)
  assert.ok(view.getByRole("heading", { name: imageCopy.title, exact: true }))
  assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).getAttribute("aria-pressed"), "false")
  assert.equal(view.queryByRole("region", { name: toolsCopy.measurements }), null)
  fireEvent.click(view.getByRole("button", { name: toolsCopy.title, exact: true }))
  await openToolsMeasurements(view)
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
  await waitFor(() => assert.ok(document.activeElement === viewport))
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
  await savedImageOptions(view)
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
  await savedImageOptions(view)
  assert.equal(server.persisted.document.calibration.known_diameter_mm, 25)
  const { calibration: beforeCalibration, objects: beforeObjects, ...beforeOther } = previous.document
  const { calibration: afterCalibration, objects: afterObjects, ...afterOther } = server.persisted.document
  assert.deepEqual(afterOther, beforeOther)
  assert.deepEqual(beforeObjects, [])
  assert.equal(afterObjects.length, 1)
  assert.equal(afterObjects[0].type, "LINE")
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
      await savedImageOptions(view)
      assert.ok(view.getByLabelText(messages.cases.workspace.calibration.savedScale))
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
  assert.equal(circle.getAttribute("stroke"), "var(--radiograph-mark-interest)")
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
  await savedImageOptions(view)
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
  await savedImageOptions(view)
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
  await savedImageOptions(view)
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
  await savedImageOptions(view)
  assert.ok(view.getByLabelText(messages.cases.workspace.calibration.savedScale))
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 1)
  const sent = server.calls.find(call => call.method === "PUT").body
  assert.equal(sent.calibration.known_length_mm, 25)
  assert.equal(sent.calibration.start.x, 0.405)
  assert.equal(sent.calibration.result, undefined)
  fireEvent.click(view.getByRole("button", { name: "Caso", exact: true }))
  assert.equal(viewport.querySelector("[data-calibration-handle]"), null, "the calibration reference is hidden")
  assert.ok(!viewport.querySelector("[data-distance-id] line"), "the saved distance stays hidden in case information")
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
  await savedImageOptions(view)
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
  await savedImageOptions(view)
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
  await savedImageOptions(view)
  const sent = server.calls.find(call => call.method === "PUT").body.calibration
  assert.deepEqual(sent.start, { x: 0.1, y: 0.2 })
  assert.deepEqual(sent.end, { x: 0.5, y: 0.6 })
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.images.title, exact: true }))
  assert.ok(!viewport.querySelector("[data-distance-id] line"))
  assert.equal(viewport.querySelector("[data-distance-draft]"), null)
  const savedGeometry = structuredClone(server.persisted.document.objects)
  fireEvent.pointerDown(viewport, { button: 0, clientX: 200, clientY: 150 })
  fireEvent.pointerUp(viewport, { clientX: 800, clientY: 400 })
  assert.ok(!viewport.querySelector("[data-distance-id] line"))
  assert.deepEqual(server.persisted.document.objects, savedGeometry)
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
  await savedImageOptions(view)
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
  await savedImageOptions(view)
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
  await waitFor(() => assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).getAttribute("aria-pressed"), "true"))
  assert.equal(server.persisted.document.objects.length, 0)
  assert.ok(!view.container.querySelector("[data-calibration-circle]"))
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

const distanceId = "00000000-0000-4000-8000-000000000abc"
const distanceGeometry = { start: { x: 0.1, y: 0.2 }, end: { x: 0.7, y: 0.8 } }
function distancePlan() {
  return f.publicPlan(f.persist({ base_revision: 2, document: { ...f.initial.document, calibration: f.circle,
    objects: [{ id: distanceId, type: "LINE", start: { x: 0.2, y: 0.3 }, end: { x: 0.8, y: 0.3 }, label: "Existing distance" }] } }))
}

test("distance selection is clean, a creation keeps its UUID through edits and cancel is entirely local", async () => {
  const server = backend(), queryClient = client()
  server.persisted = distancePlan(); globalThis.fetch = server.fetch
  const hook = renderHook(() => useImageDistance(image, true, false), { wrapper: wrapper(queryClient) })
  await waitFor(() => assert.equal(hook.result.current.canEdit, true))
  act(() => assert.equal(hook.result.current.select(distanceId), true))
  assert.equal(hook.result.current.selectedId, distanceId)
  assert.equal(hook.result.current.editor, null)
  assert.equal(hasImagePlanDraft(queryClient, image.caseId, image.id), false)
  act(() => assert.equal(hook.result.current.beginCreate("Distância 1"), true))
  const id = hook.result.current.editor.id
  assert.match(id, /^[0-9a-f-]{36}$/)
  assert.equal(hook.result.current.editor.geometry, null)
  assert.equal(hook.result.current.canSave, false)
  act(() => assert.equal(hook.result.current.changeGeometry(distanceGeometry), true))
  assert.equal(hook.result.current.editor.id, id)
  assert.equal(hook.result.current.command().id, id)
  assert.equal(hook.result.current.canSave, true)
  act(() => {
    assert.equal(hook.result.current.beginCreate("Distância 2"), false)
    assert.equal(hook.result.current.select(distanceId), false)
    assert.equal(hook.result.current.beginDelete(distanceId), false)
    assert.equal(hook.result.current.changeGeometry({ ...distanceGeometry, end: { x: 0.9, y: 0.8 } }), true)
  })
  assert.equal(hook.result.current.editor.id, id)
  act(() => assert.equal(hook.result.current.discard(), true))
  assert.equal(hook.result.current.editor, null)
  assert.equal(hasImagePlanDraft(queryClient, image.caseId, image.id), false)
  assert.equal(server.calls.filter(call => call.method !== "GET").length, 0)
})

test("distance drafts survive remount, remain isolated from another organization and cannot be recreated by stale callbacks after clear", async () => {
  const server = backend(), queryClient = client()
  server.persisted = distancePlan(); globalThis.fetch = server.fetch
  const first = renderHook(() => useImageDistance(image, true, false), { wrapper: wrapper(queryClient) })
  await waitFor(() => assert.equal(first.result.current.canEdit, true))
  act(() => { first.result.current.beginCreate("Distância 1"); first.result.current.changeGeometry({ start: distanceGeometry.start, end: distanceGeometry.start }) })
  const draft = queryClient.getQueryData(keys.imageDistanceDraft(image.caseId, image.id))
  assert.equal(first.result.current.command(), null)
  const detached = first.result.current
  first.unmount()
  assert.equal(detached.changeGeometry(distanceGeometry), false)
  assert.equal(detached.discard(), false)
  assert.deepEqual(queryClient.getQueryData(keys.imageDistanceDraft(image.caseId, image.id)), draft)
  const reopened = renderHook(() => useImageDistance(image, true, false), { wrapper: wrapper(queryClient) })
  await waitFor(() => assert.equal(reopened.result.current.canEdit, true))
  assert.deepEqual(reopened.result.current.editor, draft)
  assert.equal(reopened.result.current.hasChanges, true)
  assert.equal(reopened.result.current.canSave, false)
  const separate = renderHook(() => useImageDistance(image, true, false), { wrapper: wrapper(client()) })
  await waitFor(() => assert.equal(separate.result.current.canEdit, true))
  assert.equal(separate.result.current.editor, null)
  const stale = reopened.result.current
  reopened.unmount(); queryClient.clear()
  assert.equal(stale.beginCreate("Stale edit"), false)
  assert.equal(stale.changeGeometry(distanceGeometry), false)
  assert.equal(queryClient.getQueryData(keys.imageDistanceDraft(image.caseId, image.id)), undefined)
})

test("distance save acknowledges and clears only its draft while selection remains separate from unsaved state", async () => {
  const server = backend(), queryClient = client()
  server.persisted = distancePlan(); globalThis.fetch = server.fetch
  const hook = renderHook(() => useImageDistance(image, true, false), { wrapper: wrapper(queryClient) })
  await waitFor(() => assert.equal(hook.result.current.canEdit, true))
  act(() => { hook.result.current.beginCreate("Distância 1"); hook.result.current.changeGeometry(distanceGeometry) })
  const input = hook.result.current.command()
  await act(async () => { assert.equal((await hook.result.current.save.mutateAsync({ input })).phase, "saved") })
  await waitFor(() => assert.equal(hook.result.current.editor, null))
  assert.equal(hook.result.current.selectedId, input.id)
  assert.equal(hook.result.current.hasChanges, false)
  assert.equal(queryClient.getQueryData(keys.imageDistanceDraft(image.caseId, image.id)), null)
  assert.equal(server.calls.filter(call => call.method === "PATCH").length, 1)
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 0)
})

test("distance and calibration react to each other's drafts; a newer plan never rebases distance geometry silently", async () => {
  const server = backend(), queryClient = client()
  server.persisted = distancePlan(); globalThis.fetch = server.fetch
  const hook = renderHook(() => ({ calibration: useImageCalibration(image, true, false), distance: useImageDistance(image, true, false) }), { wrapper: wrapper(queryClient) })
  await waitFor(() => assert.equal(hook.result.current.distance.canEdit, true))
  act(() => { hook.result.current.distance.beginUpdate(distanceId); hook.result.current.distance.changeGeometry(distanceGeometry) })
  await waitFor(() => assert.equal(hook.result.current.calibration.canEdit, false))
  assert.equal(hook.result.current.calibration.measurementEligible, true)
  act(() => hook.result.current.calibration.changeReference("100"))
  assert.equal(queryClient.getQueryData(keys.imageCalibrationDraft(image.caseId, image.id)), null)
  const before = structuredClone(hook.result.current.distance.editor)
  act(() => { queryClient.setQueryData(keys.imagePlan(image.caseId, image.id), { ...server.persisted, revision: server.persisted.revision + 1 }) })
  await waitFor(() => assert.equal(hook.result.current.distance.needsRebase, true))
  assert.deepEqual(hook.result.current.distance.editor, before)
  assert.equal(hook.result.current.distance.command(), null)
  act(() => hook.result.current.distance.discard())
  await waitFor(() => assert.equal(hook.result.current.calibration.canEdit, true))
  act(() => hook.result.current.calibration.changeReference("25"))
  await waitFor(() => assert.equal(hook.result.current.distance.canEdit, false))
  act(() => assert.equal(hook.result.current.distance.beginCreate("Blocked"), false))
  assert.equal(server.calls.filter(call => call.method !== "GET").length, 0)
})

test("distance draft blocks leaving/recalibrating; cancel preserves it and confirmed discard clears it before navigation", async () => {
  const server = backend(), queryClient = client(); let navigated = 0
  server.persisted = distancePlan(); globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient, navigate: () => {
    navigated++; assert.equal(queryClient.getQueryData(keys.imageDistanceDraft(image.caseId, image.id)), null)
  } }))
  await openImageOptions(view)
  const command = { kind: "distance-create", baseRevision: server.persisted.revision, id: "00000000-0000-4000-8000-000000000def", ...distanceGeometry, label: "Distância 1" }
  act(() => queryClient.setQueryData(keys.imageDistanceDraft(image.caseId, image.id), distanceEditorFromCommand(command)))
  fireEvent.click(view.getByRole("button", { name: imageCopy.recalibrate, exact: true }))
  assert.equal(view.queryByRole("slider", { name: "Diâmetro real" }), null)
  const leaving = new window.Event("beforeunload", { cancelable: true }); window.dispatchEvent(leaving)
  assert.equal(leaving.defaultPrevented, true)
  fireEvent.click(view.getByRole("button", { name: "Navigate" }))
  const dialog = await view.findByRole("alertdialog")
  assert.ok(dialog.textContent.includes(messages.cases.workspace.distance.title))
  fireEvent.click(view.getAllByRole("button", { name: messages.common.unsavedChanges.continueEditing, exact: true }).at(-1))
  await waitFor(() => assert.equal(view.queryByRole("alertdialog"), null))
  assert.equal(hasImagePlanDraft(queryClient, image.caseId, image.id), true)
  fireEvent.click(view.getByRole("button", { name: "Navigate" }))
  await view.findByRole("alertdialog")
  fireEvent.click(view.getByRole("button", { name: messages.common.unsavedChanges.discard, exact: true }))
  await waitFor(() => assert.equal(navigated, 1))
  const clean = new window.Event("beforeunload", { cancelable: true }); window.dispatchEvent(clean)
  assert.equal(clean.defaultPrevented, false)
  assert.equal(server.calls.filter(call => call.method !== "GET").length, 0)
})

test("Tools keeps its panel and owns blocked navigation during a distance save, uncertainty and successful read-only recovery", async () => {
  const server = backend(), queryClient = client(), entered = deferred(), barrier = deferred(); let navigated = 0
  server.persisted = distancePlan()
  globalThis.fetch = async (url, init = {}) => {
    if (init.method === "PATCH") { server.calls.push({ method: "PATCH" }); entered.resolve(); await barrier.promise; throw new TypeError("lost response") }
    return server.fetch(url, init)
  }
  const notices = []; toast.info = (...args) => notices.push(args)
  const view = render(h(Workspace, { queryClient, navigate: () => navigated++ }))
  await openImageOptions(view)
  fireEvent.click(view.getByRole("button", { name: toolsCopy.title, exact: true }))
  const command = { kind: "distance-update", baseRevision: server.persisted.revision, id: distanceId, ...distanceGeometry }
  act(() => queryClient.setQueryData(keys.imageDistanceDraft(image.caseId, image.id), distanceEditorFromCommand(command)))
  let pending
  act(() => { pending = requestPlanEditSave(queryClient, { caseId: image.caseId, imageId: image.id }, command) })
  await entered.promise
  await waitFor(() => assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).getAttribute("aria-pressed"), "true"))
  assert.equal(view.getByRole("button", { name: toolsCopy.back, exact: true }).disabled, true)
  fireEvent.click(view.getByRole("button", { name: "Navigate" }))
  assert.equal(navigated, 0); assert.equal(view.queryByRole("alertdialog"), null)
  assert.equal(notices.at(-1)[0], messages.cases.workspace.distance.navigationBlockedTitle)
  await act(async () => { barrier.resolve(); assert.equal((await pending).phase, "uncertain") })
  assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).getAttribute("aria-pressed"), "true")
  assert.equal(view.getByRole("button", { name: toolsCopy.back, exact: true }).disabled, true)
  fireEvent.click(view.getByRole("button", { name: imageCopy.title, exact: true }))
  fireEvent.click(view.getByRole("button", { name: "Navigate" }))
  assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).getAttribute("aria-pressed"), "true")
  server.persisted = { ...server.persisted, revision: server.persisted.revision + 1, document: applyPlanCommand(server.persisted.document, command) }
  await act(async () => { assert.equal((await checkImagePlanSave(queryClient, { caseId: image.caseId, imageId: image.id }, command)).phase, "saved") })
  assert.equal(queryClient.getQueryData(keys.imageDistanceDraft(image.caseId, image.id)), null)
  assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).getAttribute("aria-pressed"), "true")
  fireEvent.click(view.getByRole("button", { name: "Navigate" }))
  assert.equal(navigated, 1)
  assert.equal(server.calls.filter(call => call.method === "PATCH").length, 1)
})


function editorViewer(props) {
  return h(NextIntlClientProvider, { locale: "pt-BR", timeZone: "UTC", messages }, h(CaseImageViewer, {
    brightness: 100, contrast: 100, inverted: false, name: "Original image", coordinateSpace: "image-edges",
    rendering: { url: "https://storage.example/preview.png", widthPx: 1000, heightPx: 500 }, ...props,
  }))
}
function viewerPointer(viewport, type, x, y, { pointerId = 7, pointerType = "mouse", isPrimary = true } = {}) {
  const event = new dom.window.MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y })
  Object.defineProperties(event, { pointerId: { value: pointerId }, pointerType: { value: pointerType }, isPrimary: { value: isPrimary } })
  fireEvent(viewport, event)
}
function viewerRect(view) {
  const viewport = view.container.querySelector("[data-calibration-viewport]")
  const image = view.container.querySelector("[data-image-mirrored]")
  image.getBoundingClientRect = () => ({ left: 100, top: 100, right: 600, bottom: 350, width: 500, height: 250 })
  return { viewport, image }
}

test("viewer editor seam routes local distance geometry through original pixels and mirrors keyboard movement", () => {
  const geometry = { start: { x: 0.2, y: 0.2 }, end: { x: 0.6, y: 0.6 } }
  const changes = [], tools = []
  const editor = { kind: "distance", id: "line-a", editable: true, tool: "mark", geometry,
    onGeometryChange: value => changes.push(value), onToolChange: value => tools.push(value) }
  const overlay = h("line", { "data-saved-overlay": true, x1: 0, y1: 0, x2: 1000, y2: 500 })
  const view = render(editorViewer({ editor, renderOverlay: () => overlay }))
  const { viewport, image } = viewerRect(view)
  assert.equal(image.querySelector("svg").getAttribute("viewBox"), "0 0 1000 500")
  assert.ok(view.container.querySelector("[data-saved-overlay]"))
  viewerPointer(viewport, "pointerdown", 150, 125)
  viewerPointer(viewport, "pointermove", 350, 225)
  assert.equal(changes.length, 0)
  viewerPointer(viewport, "pointerup", 350, 225)
  assert.deepEqual(changes, [{ start: { x: 0.1, y: 0.1 }, end: { x: 0.5, y: 0.5 } }])
  view.rerender(editorViewer({ editor, renderOverlay: () => overlay, mirrored: true }))
  fireEvent.keyDown(viewport, { key: "ArrowRight", shiftKey: true })
  assert.deepEqual(changes[1], { start: { x: 0.19, y: 0.2 }, end: { x: 0.59, y: 0.6 } })
  assert.ok(image.style.transform.includes("scaleX(-1)"))
  assert.equal(tools.length, 0)
})

test("viewer editor seam cancels capture on target or mode changes and Escape without committing another editor", () => {
  const changes = [], tools = [], captures = new Set()
  const distance = { kind: "distance", id: "line-a", editable: true, tool: "mark", geometry: null,
    onGeometryChange: value => changes.push(value), onToolChange: value => tools.push(value) }
  const view = render(editorViewer({ editor: distance }))
  const { viewport } = viewerRect(view)
  viewport.setPointerCapture = id => captures.add(id)
  viewport.hasPointerCapture = id => captures.has(id)
  viewport.releasePointerCapture = id => captures.delete(id)
  const begin = () => { viewerPointer(viewport, "pointerdown", 150, 125); viewerPointer(viewport, "pointermove", 350, 225); assert.equal(captures.has(7), true) }
  begin()
  view.rerender(editorViewer({ editor: { ...distance, id: "line-b" } }))
  assert.equal(captures.size, 0)
  viewerPointer(viewport, "pointerup", 350, 225)
  assert.equal(changes.length, 0)
  begin()
  fireEvent.keyDown(viewport, { key: "Escape" })
  assert.equal(captures.size, 0)
  viewerPointer(viewport, "pointerup", 350, 225)
  assert.deepEqual(tools, [])
  assert.equal(changes.length, 0)
  begin()
  view.rerender(editorViewer({ editor: { kind: "calibration", editable: true, tool: "mark", marker: null, markerKind: "circle",
    onMarkerChange: value => changes.push(value), onToolChange() {} } }))
  assert.equal(captures.size, 0)
  viewerPointer(viewport, "pointerup", 350, 225)
  assert.equal(changes.length, 0)
  begin()
  view.unmount()
  assert.equal(captures.size, 0)
})

test("viewer editor seam keeps passive overlays, pan, zoom, fit and fullscreen without an active editor", async () => {
  const viewer = messages.cases.workspace.viewer
  let overlayView
  const view = render(editorViewer({ editor: { kind: "none" }, renderOverlay: value => {
    overlayView = value
    return h("line", { "data-saved-overlay": true, x1: 0, y1: 0, x2: 1000, y2: 500 })
  } }))
  const { viewport, image } = viewerRect(view)
  assert.equal(view.queryByRole("button", { name: viewer.mark }), null)
  fireEvent.click(view.getByRole("button", { name: viewer.zoomIn }))
  viewerPointer(viewport, "pointerdown", 300, 200)
  viewerPointer(viewport, "pointermove", 340, 220)
  viewerPointer(viewport, "pointerup", 340, 220)
  assert.ok(image.style.transform.includes("translate(40px, 20px) scale(1.25)"))
  assert.ok(view.container.querySelector("[data-saved-overlay]"))
  assert.deepEqual(overlayView, { widthPx: 1000, heightPx: 500, scale: 0.952 * 1.25, mirrored: false, activeGesture: false })
  fireEvent.click(view.getByRole("button", { name: viewer.fit }))
  assert.ok(image.style.transform.includes("translate(0px, 0px) scale(1)"))
  const section = viewport.closest("section")
  const descriptor = Object.getOwnPropertyDescriptor(document, "fullscreenElement")
  const originalExit = document.exitFullscreen
  let fullscreen = null
  Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => fullscreen })
  section.requestFullscreen = async () => { fullscreen = section; document.dispatchEvent(new dom.window.Event("fullscreenchange")) }
  document.exitFullscreen = async () => { fullscreen = null; document.dispatchEvent(new dom.window.Event("fullscreenchange")) }
  try {
    fireEvent.click(view.getByRole("button", { name: viewer.fullscreen }))
    assert.equal(document.fullscreenElement, section)
    fireEvent.click(view.getByRole("button", { name: viewer.exitFullscreen }))
    assert.equal(document.fullscreenElement, null)
  } finally {
    if (descriptor) Object.defineProperty(document, "fullscreenElement", descriptor)
    else delete document.fullscreenElement
    document.exitFullscreen = originalExit
  }
})


// Synthetic distance results following the API shape. No local clinical calculation.
function savedDistancesPlan() {
  const saved = f.publicPlan(f.persist({ base_revision: 0, document: { ...f.initial.document, calibration: f.line } }))
  const line = { id: "00000000-0000-4000-8000-000000000920", type: "LINE", start: { x: 0.1234, y: 0.2345 }, end: { x: 0.6789, y: 0.7891 }, label: "Saved distance",
    measurement: { status: "CALCULATED", calibration_id: saved.document.calibration.result.calibration_id, values: { length: 123.456789 }, units: { length: "mm" } } }
  const missing = { ...structuredClone(line), id: "00000000-0000-4000-8000-000000000921", label: null, measurement: null }
  const other = { id: "00000000-0000-4000-8000-000000000922", type: "ANGLE", start: { x: 0.1, y: 0.1 }, vertex: { x: 0.5, y: 0.5 }, end: { x: 0.9, y: 0.9 }, label: "Not a distance" }
  saved.document.objects = [line, other, missing]
  return saved
}
async function openDistanceTool(view) {
  await openToolsMeasurements(view)
  const distance = view.getByRole("button", { name: messages.cases.workspace.distance.title, exact: true })
  if (distance.getAttribute("aria-pressed") !== "true") fireEvent.click(distance)
  return view.findByRole("list", { name: messages.cases.workspace.distance.list })
}
async function openSavedDistances(view) {
  await openImageOptions(view)
  await waitFor(() => assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).disabled, false))
  return openDistanceTool(view)
}

test("distance marks require Tools and an active Distance; hiding preserves saved data and a dirty edit", async () => {
  const server = backend(), queryClient = client()
  server.persisted = savedDistancesPlan(); globalThis.fetch = server.fetch
  const before = structuredClone(server.persisted)
  const view = render(h(Workspace, { queryClient }))
  await openImageOptions(view)
  const hidden = () => {
    assert.ok(!view.container.querySelector("[data-distance-overlay]"))
    assert.ok(!view.container.querySelector("[data-distance-draft]"))
    assert.ok(!view.container.querySelector("[data-distance-controls]"))
  }
  hidden()
  for (const name of [messages.cases.workspace.sidebar.title, messages.cases.workspace.images.title, toolsCopy.title]) {
    fireEvent.click(view.getByRole("button", { name, exact: true })); hidden()
  }
  const list = await openDistanceTool(view)
  const tool = view.getByRole("button", { name: messages.cases.workspace.distance.title, exact: true })
  assert.equal(tool.getAttribute("aria-pressed"), "true")
  assert.ok(view.container.querySelector("[data-distance-controls]").contains(list))
  const row = list.querySelector("button")
  assert.equal(row.querySelector('[id$="-value"]').textContent, "123,46 mm")
  assert.ok(row.querySelector('[id$="-name"]').classList.contains("sr-only"))
  fireEvent.click(row)
  assert.ok(view.container.querySelector("[data-distance-overlay]"))
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.distance.edit, exact: true }))
  const key = keys.imageDistanceDraft(image.caseId, image.id)
  const id = queryClient.getQueryData(key).id
  fireEvent.keyDown(view.getByRole("button", { name: messages.cases.workspace.distance.targets.end, exact: true }), { key: "ArrowRight" })
  const draft = structuredClone(queryClient.getQueryData(key))
  assert.equal(hasImagePlanDraft(queryClient, image.caseId, image.id), true)
  for (const name of [messages.cases.workspace.sidebar.title, messages.cases.workspace.images.title, imageCopy.title]) {
    fireEvent.click(view.getByRole("button", { name, exact: true }))
    hidden()
    fireEvent.keyDown(view.container.querySelector("[data-calibration-viewport]"), { key: "ArrowRight" })
    assert.deepEqual(queryClient.getQueryData(key), draft)
  }
  fireEvent.click(view.getByRole("button", { name: toolsCopy.title, exact: true }))
  assert.ok(view.container.querySelector("[data-distance-draft]"))
  assert.ok(view.container.querySelector("[data-distance-controls]"))
  assert.deepEqual(queryClient.getQueryData(key), draft)
  assert.equal(draft.id, id)
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.distance.cancelEditing }))
  hidden()
  assert.equal(queryClient.getQueryData(key), null)
  assert.deepEqual(server.persisted, before)
  assert.equal(server.calls.some(call => call.method !== "GET"), false)
})

test("the Measurements back button hides viewer marks, preserves a dirty distance draft, and resumes it on return", async () => {
  const server = backend(), queryClient = client()
  server.persisted = editableDistancesPlan(); globalThis.fetch = server.fetch
  const before = structuredClone(server.persisted), view = render(h(Workspace, { queryClient }))
  await editFirstDistance(view)
  const key = keys.imageDistanceDraft(image.caseId, image.id)
  fireEvent.keyDown(view.getByRole("button", { name: distanceCopy.targets.end, exact: true }), { key: "ArrowRight", shiftKey: true })
  const draft = structuredClone(queryClient.getQueryData(key))
  assert.ok(view.container.querySelector("[data-distance-controls]"))
  assert.ok(view.container.querySelector("[data-distance-preview]"))

  fireEvent.click(view.getByRole("button", { name: toolsCopy.back, exact: true }))
  await view.findByRole("heading", { name: toolsCopy.title, exact: true })
  assert.ok(!view.container.querySelector("[data-distance-controls]"))
  assert.ok(!view.container.querySelector("[data-distance-overlay]"))
  assert.ok(!view.container.querySelector("[data-distance-draft]"))
  assert.deepEqual(queryClient.getQueryData(key), draft)
  assert.equal(hasImagePlanDraft(queryClient, image.caseId, image.id), true)

  fireEvent.click(view.getByRole("button", { name: toolsCopy.measurements, exact: true }))
  await view.findByRole("region", { name: toolsCopy.measurements, exact: true })
  assert.ok(view.container.querySelector("[data-distance-controls]"))
  assert.ok(view.container.querySelector("[data-distance-preview]"))
  assert.deepEqual(queryClient.getQueryData(key), draft)
  fireEvent.click(view.getByRole("button", { name: distanceCopy.cancelEditing, exact: true }))
  await waitFor(() => assert.ok(!view.container.querySelector("[data-distance-controls]")))
  assert.ok(!view.container.querySelector("[data-distance-overlay]"))
  assert.equal(queryClient.getQueryData(key), null)
  assert.equal(hasImagePlanDraft(queryClient, image.caseId, image.id), false)
  assert.deepEqual(server.persisted, before)
  assert.equal(server.calls.some(call => call.method !== "GET"), false)
})

test("saved distances restore from the plan API, preserve unavailable lines and select accessibly without drafts or writes", async () => {
  const server = backend(), queryClient = client()
  server.persisted = savedDistancesPlan()
  const before = structuredClone(server.persisted)
  globalThis.fetch = server.fetch
  let view = render(h(Workspace, { queryClient }))
  let list = await openSavedDistances(view)
  assert.equal(list.children.length, 2)
  assert.equal(list.querySelector('[id$="-value"]').textContent, "123,46 mm")
  assert.ok(list.textContent.includes(messages.cases.workspace.distance.defaultName.replace("{index}", "2")))
  assert.ok(list.textContent.includes(messages.cases.workspace.distance.unavailable))
  assert.equal(view.queryByText("Not a distance"), null)
  const buttons = list.querySelectorAll("[data-distance-row]")
  assert.equal(buttons[0].getAttribute("aria-pressed"), "false")
  assert.ok(view.container.querySelector("[data-distance-overlay]"))
  assert.equal(view.container.querySelectorAll("[data-distance-selected=true]").length, 0)
  buttons[0].focus()
  assert.ok(document.activeElement === buttons[0])
  fireEvent.click(buttons[0])
  assert.equal(buttons[0].getAttribute("aria-pressed"), "true")
  const overlay = view.container.querySelector("[data-distance-overlay]")
  assert.equal(overlay.children.length, 2)
  assert.equal(overlay.children[1].getAttribute("data-distance-selected"), "true")
  assert.equal(overlay.children[1].querySelectorAll("rect").length, 2)
  assert.equal(overlay.children[0].querySelectorAll("circle").length, 2)
  assert.ok(!hasImagePlanDraft(queryClient, image.caseId, image.id))
  assert.equal(server.calls.some(call => call.method !== "GET"), false)
  assert.deepEqual(server.persisted, before)
  view.unmount(); queryClient.clear()
  const freshClient = client()
  view = render(h(Workspace, { queryClient: freshClient }))
  list = await openSavedDistances(view)
  assert.match(list.textContent, /123,46 mm/)
  assert.equal(server.calls.filter(call => call.url.endsWith("/plan")).length, 2)
  assert.equal(view.container.querySelectorAll("[data-distance-id]").length, 2)
  assert.equal(view.container.querySelectorAll("[data-distance-selected=true]").length, 0)
  assert.deepEqual(server.persisted, before)
})

test("saved distances keep original-matrix geometry, fixed visual size and readable mirrored text through zoom, pan and resize", async () => {
  const selected = { ...image, widthPx: 2011, heightPx: 1003, previewWidthPx: 1600, previewHeightPx: 798 }
  const server = backend(selected), queryClient = client()
  server.persisted = savedDistancesPlan()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient, selected }))
  const list = await openSavedDistances(view)
  fireEvent.click(list.querySelector("button"))
  let group = view.container.querySelector("[data-distance-selected=true]")
  let segment = group.querySelector("line")
  const labelAngle = () => Number(group.querySelector("text").parentElement.getAttribute("transform").match(/rotate\(([^)]+)\)/)[1])
  const originalAngle = labelAngle()
  const line = server.persisted.document.objects[0]
  const endpoints = ["x1", "y1", "x2", "y2"].map(name => Number(segment.getAttribute(name)))
  assert.deepEqual(endpoints, [line.start.x * selected.widthPx, line.start.y * selected.heightPx, line.end.x * selected.widthPx, line.end.y * selected.heightPx])
  let scale = Math.min((1000 - 48) / selected.widthPx, (700 - 48) / selected.heightPx)
  const assertScreenSize = () => {
    assert.ok(Math.abs(Number(group.querySelector("text").getAttribute("font-size")) * scale - 11) < 1e-10)
    assert.ok(Math.abs(Number(group.querySelector("rect").getAttribute("width")) * scale - 8) < 1e-10)
    const strokes = [...group.querySelectorAll("line")].map(line => Number(line.getAttribute("stroke-width")) * scale)
    assert.equal(strokes.length, 1)
    assert.ok(Math.abs(strokes[0] - 2) < 1e-10)
    assert.deepEqual(["x1", "y1", "x2", "y2"].map(name => Number(segment.getAttribute(name))), endpoints)
  }
  assertScreenSize()
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.viewer.zoomIn }))
  scale *= 1.25; assertScreenSize()
  const viewport = view.container.querySelector("[data-calibration-viewport]")
  viewerPointer(viewport, "pointerdown", 300, 200); viewerPointer(viewport, "pointermove", 350, 230); viewerPointer(viewport, "pointerup", 350, 230)
  assertScreenSize()
  assert.ok(view.getByRole("img").parentElement.style.transform.includes("translate(50px, 30px)"))
  fireEvent.click(view.getByRole("button", { name: imageCopy.title, exact: true }))
  fireEvent.click(view.getByRole("button", { name: imageCopy.mirror }))
  assert.ok(!view.container.querySelector("[data-distance-overlay]"))
  fireEvent.click(view.getByRole("button", { name: toolsCopy.title, exact: true }))
  group = view.container.querySelector("[data-distance-selected=true]")
  segment = group.querySelector("line")
  assert.ok(group.querySelector("text").parentElement.getAttribute("transform").includes("scale(-1 1)"))
  assert.ok(Math.abs(labelAngle() + originalAngle) < 1e-10)
  assert.ok(view.getByRole("img").parentElement.style.transform.includes("scaleX(-1)"))
  assertScreenSize()
  act(() => { for (const observer of resizeObservers) observer.resize(800, 600) })
  scale = Math.min((800 - 48) / selected.widthPx, (600 - 48) / selected.heightPx) * 1.25
  assertScreenSize()
  assert.equal(server.calls.some(call => call.method !== "GET"), false)
})

test("distance labels follow the line with readable mirrored angles, cyan marks and no outlines", () => {
  const cases = [
    { start: { x: 0.25, y: 0.5 }, end: { x: 0.75, y: 0.5 }, angle: 0 },
    { start: { x: 0.5, y: 0.25 }, end: { x: 0.5, y: 0.75 }, angle: -90 },
    { start: { x: 0.25, y: 0.25 }, end: { x: 0.375, y: 0.5 }, angle: 45 },
    { start: { x: 0.25, y: 0.5 }, end: { x: 0.375, y: 0.25 }, angle: -45 },
    { start: { x: 0.25, y: 0.25 }, end: { x: 0.5, y: 0.5 }, angle: 26.56505117707799 },
    { start: { x: 0, y: 0.25 }, end: { x: 0, y: 0.75 }, angle: -90, offset: [18, -10] },
    { start: { x: 1, y: 0.25 }, end: { x: 1, y: 0.75 }, angle: -90, offset: [-10, 18] },
    { start: { x: 0.25, y: 0 }, end: { x: 0.75, y: 0 }, angle: 0, offset: [18, 18] },
    { start: { x: 0.25, y: 1 }, end: { x: 0.75, y: 1 }, angle: 0, offset: [-10, -10] },
  ]
  const view = render(h("div"))
  for (const item of cases) for (const mirrored of [false, true]) for (const reversed of [false, true]) {
    const plan = savedDistancesPlan(), line = plan.document.objects[0]
    line.start = reversed ? item.end : item.start; line.end = reversed ? item.start : item.end
    const dimensions = { widthPx: 2000, heightPx: 1000, scale: 0.5, mirrored }
    view.rerender(h(NextIntlClientProvider, { locale: "pt-BR", timeZone: "UTC", messages }, h("svg", null,
      h(DistanceOverlay, { distances: selectSavedDistances(plan).slice(0, 1), selectedId: line.id, view: dimensions }))))
    const group = view.container.querySelector("[data-distance-id]"), segment = group.querySelector("line"), label = group.querySelector("text")
    const transform = label.parentElement.getAttribute("transform"), angle = Number(transform.match(/rotate\(([^)]+)\)/)[1])
    const expected = mirrored && item.angle !== -90 ? -item.angle : item.angle
    assert.ok(Math.abs(angle - expected) < 1e-10, `${angle} != ${expected}`)
    assert.ok(transform.includes(`scale(${mirrored ? -1 : 1} 1)`))
    assert.equal(group.querySelectorAll("line").length, 1)
    assert.equal(segment.getAttribute("stroke"), "var(--radiograph-mark-measurement)")
    assert.equal(label.getAttribute("fill"), segment.getAttribute("stroke"))
    assert.equal(label.getAttribute("stroke"), "none")
    assert.equal(label.hasAttribute("paint-order"), false)
    assert.equal(label.textContent, "123,46 mm")
    assert.deepEqual(["x1", "y1", "x2", "y2"].map(key => Number(segment.getAttribute(key))),
      [line.start.x * 2000, line.start.y * 1000, line.end.x * 2000, line.end.y * 1000])
    for (const handle of group.querySelectorAll("rect,circle")) {
      assert.equal(handle.getAttribute("fill"), "var(--radiograph-mark-measurement)")
      assert.equal(handle.hasAttribute("stroke"), false)
    }
    if (item.offset) assert.equal(Number(label.getAttribute("y")) * dimensions.scale, item.offset[Number(mirrored)])
  }
})

test("saved distances hide during recalibration, return on cancel, and only show new official results after the plan refreshes", async () => {
  const server = backend(), queryClient = client()
  server.persisted = savedDistancesPlan()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  fireEvent.click((await openSavedDistances(view)).querySelector("button"))
  assert.equal(view.container.querySelectorAll("[data-distance-id]").length, 2)
  await openCalibration(view)
  assert.equal(view.container.querySelector("[data-distance-overlay]"), null)
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.calibration.reset, exact: true }))
  await view.findByRole("slider", { name: imageCopy.brightness })
  assert.equal(view.container.querySelectorAll("[data-distance-id]").length, 0)
  const updated = structuredClone(server.persisted)
  updated.revision++
  updated.document.calibration.result.calibration_id = "d".repeat(64)
  server.persisted = updated
  await act(async () => { await queryClient.refetchQueries({ queryKey: keys.imagePlan(image.caseId, image.id) }) })
  let list = await openSavedDistances(view)
  assert.ok(list.textContent.includes(messages.cases.workspace.distance.unavailableReasons.outdated))
  assert.equal(list.textContent.includes("123,46 mm"), false)
  assert.equal(view.container.querySelector("[data-distance-id] text").textContent, messages.cases.workspace.distance.unavailable)
  updated.revision++
  updated.document.objects[0].measurement = { status: "CALCULATED", calibration_id: "d".repeat(64), values: { length: 42.987654 }, units: { length: "mm" } }
  server.persisted = structuredClone(updated)
  await act(async () => { await queryClient.refetchQueries({ queryKey: keys.imagePlan(image.caseId, image.id) }) })
  list = view.getByRole("list", { name: messages.cases.workspace.distance.list })
  await waitFor(() => assert.match(view.getByRole("list", { name: messages.cases.workspace.distance.list }).textContent, /42,99 mm/))
  assert.equal(list.textContent.includes("123,46 mm"), false)
  assert.equal(view.container.querySelector(`[data-distance-id="${updated.document.objects[0].id}"] text`).textContent, "42,99 mm")
  assert.equal(server.calls.some(call => call.method !== "GET"), false)
})


test("saved distances remain selectable during a background read, withhold cached values after failure and recover from GET", async () => {
  const server = backend(), queryClient = client(), pending = deferred()
  server.persisted = savedDistancesPlan()
  let nextRead = null
  globalThis.fetch = (url, init) => {
    if (url.endsWith("/plan") && nextRead) { const value = nextRead; nextRead = null; return value.promise }
    return server.fetch(url, init)
  }
  const view = render(h(Workspace, { queryClient }))
  let list = await openSavedDistances(view)
  nextRead = pending
  let refresh
  act(() => { refresh = queryClient.refetchQueries({ queryKey: keys.imagePlan(image.caseId, image.id) }) })
  await waitFor(() => assert.equal(queryClient.getQueryState(keys.imagePlan(image.caseId, image.id)).fetchStatus, "fetching"))
  const button = list.querySelector("button")
  assert.equal(button.disabled, false)
  fireEvent.click(button)
  assert.equal(button.getAttribute("aria-pressed"), "true")
  assert.equal(hasImagePlanDraft(queryClient, image.caseId, image.id), false)
  await act(async () => { pending.resolve(Response.json({ error: { code: "SERVICE_UNAVAILABLE", uncertain: false } }, { status: 502 })); await refresh })
  await waitFor(() => assert.equal(view.container.querySelector("[data-distance-id] text").textContent, messages.cases.workspace.distance.unavailable))
  assert.equal(view.container.querySelectorAll("[data-distance-id]").length, 2)
  assert.equal(queryClient.getQueryData(keys.imagePlan(image.caseId, image.id)).document.objects[0].measurement.values.length, 123.456789)
  await act(async () => { await queryClient.refetchQueries({ queryKey: keys.imagePlan(image.caseId, image.id) }) })
  list = await openSavedDistances(view)
  assert.match(list.textContent, /123,46 mm/)
  assert.equal(server.calls.some(call => call.method !== "GET"), false)
})


test("saved distances use the recalibration acknowledgement's official results immediately without another read or local rounding", async () => {
  const server = backend(), queryClient = client()
  server.persisted = savedDistancesPlan()
  globalThis.fetch = async (url, init) => {
    const response = await server.fetch(url, init)
    if (init?.method !== "PUT") return response
    const body = await response.json()
    body.document.objects[0].measurement = { status: "CALCULATED", calibration_id: body.document.calibration.result.calibration_id,
      values: { length: 77.1234567 }, units: { length: "mm" } }
    server.persisted = body
    return Response.json(body)
  }
  const view = render(h(Workspace, { queryClient }))
  await openSavedDistances(view)
  await openCalibration(view)
  fireEvent.change(await referenceInput(view, "Comprimento real"), { target: { value: "35" } })
  const readsBeforeSave = server.calls.filter(call => call.url.endsWith("/plan") && call.method === "GET").length
  fireEvent.click(view.getByRole("button", { name: "Atualizar calibra\u00e7\u00e3o", exact: true }))
  await savedImageOptions(view)
  assert.ok(!view.container.querySelector("[data-distance-overlay]"))
  const list = await openSavedDistances(view)
  fireEvent.click(list.querySelector("button"))
  assert.equal(view.container.querySelector(`[data-distance-id="${server.persisted.document.objects[0].id}"] text`).textContent, "77,12 mm")
  assert.match(list.textContent, /77,12 mm/)
  assert.equal(list.textContent.includes("123,46 mm"), false)
  assert.equal(server.persisted.document.objects[0].measurement.values.length, 77.1234567)
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 1)
  assert.equal(server.calls.filter(call => call.url.endsWith("/plan") && call.method === "GET").length, readsBeforeSave)
})

test("saved distances use English labels and unit formatting consistently in the list and overlay", () => {
  const en = { cases: JSON.parse(readFileSync(new URL("../src/i18n/messages/en/cases.json", import.meta.url), "utf8")) }
  const saved = savedDistancesPlan()
  saved.document.objects[0].label = null
  saved.document.objects[0].measurement.values.length = 1234.56789
  const distances = selectSavedDistances(saved)
  const selectedId = distances[0].line.id
  const view = render(h(NextIntlClientProvider, { locale: "en", timeZone: "UTC", messages: en },
    h(CaseImageToolsPanel, { measurements: true, onMeasurements() {}, openDisabled: false, onOpen() {}, readError: false,
      canRetryRead: false, onRetryRead() {}, loading: false, distanceActive: true }),
    h(CaseImageDistanceValues, { distances, selectedId, selectionDisabled: false, onSelect() {} }),
    h("svg", { "aria-hidden": true }, h(DistanceOverlay, { distances, selectedId, view: { widthPx: 2000, heightPx: 1000, scale: 0.5, mirrored: false } }))))
  const button = view.getByRole("button", { name: "Distance 1 1,234.57 mm" })
  assert.equal(button.getAttribute("aria-pressed"), "true")
  assert.equal(view.container.querySelector("[data-distance-selected=true] text").textContent, "1,234.57 mm")
  assert.ok(view.getByRole("button", { name: "Distance 2 —" }))
})


const distanceCopy = messages.cases.workspace.distance
// Legacy unsaved creations remain recoverable, but the catalog no longer creates them.
async function restoreDistanceCreationDraft(view, queryClient) {
  await openSavedDistances(view)
  const hook = renderHook(() => useImageDistance(image, true, false), { wrapper: wrapper(queryClient) })
  await waitFor(() => assert.equal(hook.result.current.canCreate, true))
  act(() => { assert.equal(hook.result.current.beginCreate(index => distanceCopy.defaultName.replace("{index}", String(index))), true) })
  hook.unmount()
  fireEvent.click(await view.findByRole("button", { name: distanceCopy.draw, exact: true }))
  await view.findByText(distanceCopy.notSaved)
  const viewport = view.container.querySelector("[data-calibration-viewport]")
  view.getByRole("img").parentElement.getBoundingClientRect = () => ({ left: 100, top: 100, right: 1100, bottom: 600, width: 1000, height: 500 })
  // A restored legacy draft does not enter through the catalog's focus action.
  act(() => viewport.focus())
  assert.ok(document.activeElement === viewport)
  return viewport
}

test("distance creation starts one named unsaved draft, blocks leaving and cancels locally without touching saved lines", async () => {
  const server = backend(), queryClient = client()
  server.persisted = savedDistancesPlan()
  server.persisted.document.objects[0].label = distanceCopy.defaultName.replace("{index}", "1")
  const before = structuredClone(server.persisted)
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await restoreDistanceCreationDraft(view, queryClient)
  const key = keys.imageDistanceDraft(image.caseId, image.id)
  const draft = queryClient.getQueryData(key)
  assert.equal(draft.kind, "distance-create")
  assert.match(draft.id, /^[a-f0-9-]{36}$/)
  assert.equal(draft.label, distanceCopy.defaultName.replace("{index}", "3"))
  assert.equal(draft.geometry, null)
  fireEvent.click(view.getByRole("button", { name: distanceCopy.title, exact: true }))
  assert.equal(queryClient.getQueryData(key).id, draft.id)
  assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).getAttribute("aria-pressed"), "true")
  const event = new dom.window.Event("beforeunload", { cancelable: true })
  window.dispatchEvent(event)
  assert.equal(event.defaultPrevented, true)
  assert.equal(view.container.querySelectorAll("[data-distance-id]").length, 2)
  fireEvent.click(view.getByRole("button", { name: distanceCopy.cancelEditing }))
  assert.equal(queryClient.getQueryData(key), null)
  assert.equal(view.queryByText(distanceCopy.notSaved), null)
  await waitFor(() => assert.ok(document.activeElement === view.getByRole("button", { name: distanceCopy.title, exact: true })))
  assert.equal(hasImagePlanDraft(queryClient, image.caseId, image.id), false)
  assert.deepEqual(server.persisted, before)
  assert.equal(server.calls.some(call => call.method !== "GET"), false)
})

for (const method of ["mouse", "touch", "keyboard"]) test(`distance creation by ${method} produces the same source geometry and retains its ID while adjusting locally`, async () => {
  const server = backend(), queryClient = client()
  server.persisted = savedDistancesPlan()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  const viewport = await restoreDistanceCreationDraft(view, queryClient)
  const key = keys.imageDistanceDraft(image.caseId, image.id)
  const id = queryClient.getQueryData(key).id
  const reads = server.calls.length
  if (method === "keyboard") {
    const place = view.getByRole("button", { name: distanceCopy.place })
    act(() => place.focus())
    fireEvent.click(place, { detail: 0 })
    await waitFor(() => assert.ok(document.activeElement === viewport))
  } else {
    const options = { pointerType: method }
    viewerPointer(viewport, "pointerdown", 500, 350, options)
    viewerPointer(viewport, "pointermove", 700, 350, options)
    assert.equal(queryClient.getQueryData(key).geometry, null)
    if (method === "touch") {
      viewerPointer(viewport, "pointerdown", 900, 500, { pointerType: "touch", pointerId: 8, isPrimary: false })
      viewerPointer(viewport, "pointerup", 900, 500, { pointerType: "touch", pointerId: 8, isPrimary: false })
      assert.equal(queryClient.getQueryData(key).geometry, null)
    }
    viewerPointer(viewport, "pointerup", 700, 350, options)
  }
  assert.deepEqual(queryClient.getQueryData(key).geometry, { start: { x: 0.4, y: 0.5 }, end: { x: 0.6, y: 0.5 } })
  const drawn = view.container.querySelector("[data-distance-draft] line")
  assert.equal(Number(drawn.getAttribute("x1")), 800)
  assert.equal(Number(drawn.getAttribute("x2")), 1200)
  assert.ok(drawn.hasAttribute("stroke-dasharray"))
  assert.equal(queryClient.getQueryData(key).id, id)
  assert.equal(view.queryByRole("button", { name: messages.cases.workspace.viewer.mark }), null)
  assert.equal(view.getByRole("button", { name: distanceCopy.draw }).getAttribute("aria-pressed"), "true")
  fireEvent.keyDown(viewport, { key: "ArrowRight", shiftKey: true })
  fireEvent.keyDown(viewport, { key: "ArrowUp", shiftKey: true, altKey: true })
  const geometry = queryClient.getQueryData(key).geometry
  assert.deepEqual(geometry, { start: { x: 0.405, y: 0.5 }, end: { x: 0.605, y: 0.49 } })
  assert.equal(queryClient.getQueryData(key).id, id)
  assert.equal(view.getByText(distanceCopy.notSaved).getAttribute("role"), "status")
  assert.equal(server.calls.length, reads)
})

test("distance creation ignores outside starts, clicks and degenerate drags, and clamps to both inclusive image edges", async () => {
  const server = backend(), queryClient = client()
  server.persisted = savedDistancesPlan()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  const viewport = await restoreDistanceCreationDraft(view, queryClient), key = keys.imageDistanceDraft(image.caseId, image.id)
  viewerPointer(viewport, "pointerdown", 99, 350)
  viewerPointer(viewport, "pointermove", 700, 350)
  viewerPointer(viewport, "pointerup", 700, 350)
  assert.equal(queryClient.getQueryData(key).geometry, null)
  for (const delta of [0, 0.1, 1, 2, 3.9]) {
    viewerPointer(viewport, "pointerdown", 400, 300)
    viewerPointer(viewport, "pointerup", 400 + delta, 300)
    assert.equal(queryClient.getQueryData(key).geometry, null)
  }
  assert.equal(view.container.querySelector("[data-distance-draft]"), null)
  viewerPointer(viewport, "pointerdown", 400, 300)
  viewerPointer(viewport, "pointerup", 404, 300)
  assert.deepEqual(queryClient.getQueryData(key).geometry, { start: { x: 0.3, y: 0.4 }, end: { x: 0.304, y: 0.4 } })
  viewerPointer(viewport, "pointerdown", 100, 100)
  viewerPointer(viewport, "pointermove", 1200, 700)
  viewerPointer(viewport, "pointerup", 1200, 700)
  assert.deepEqual(queryClient.getQueryData(key).geometry, { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } })
  assert.equal(server.calls.some(call => call.method !== "GET"), false)
})

test("distance creation Escape, pointercancel and lost capture restore the last local geometry and keep drawing active", async () => {
  const server = backend(), queryClient = client()
  server.persisted = savedDistancesPlan()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  const viewport = await restoreDistanceCreationDraft(view, queryClient), key = keys.imageDistanceDraft(image.caseId, image.id)
  fireEvent.click(view.getByRole("button", { name: distanceCopy.place }))
  const before = structuredClone(queryClient.getQueryData(key)), captures = new Set()
  viewport.setPointerCapture = id => captures.add(id)
  viewport.hasPointerCapture = id => captures.has(id)
  viewport.releasePointerCapture = id => captures.delete(id)
  for (const cancel of ["Escape", "pointercancel", "lostpointercapture"]) {
    viewerPointer(viewport, "pointerdown", 250, 150)
    viewerPointer(viewport, "pointermove", 800, 500)
    assert.equal(captures.has(7), true)
    fireEvent.keyDown(viewport, { key: "ArrowRight" })
    assert.deepEqual(queryClient.getQueryData(key), before)
    if (cancel === "Escape") fireEvent.keyDown(viewport, { key: "Escape" })
    else viewerPointer(viewport, cancel, 800, 500)
    viewerPointer(viewport, "pointerup", 800, 500)
    assert.deepEqual(queryClient.getQueryData(key), before)
    assert.equal(captures.size, 0)
    assert.equal(view.getByRole("button", { name: distanceCopy.draw }).getAttribute("aria-pressed"), "true")
  }
  assert.equal(Number(view.container.querySelector("[data-distance-draft] line").getAttribute("x1")), 800)
  assert.equal(server.calls.some(call => call.method !== "GET"), false)
})

test("distance creation remains local across panels and remount; stale revisions freeze drawing until explicit cancel", async () => {
  const server = backend(), queryClient = client()
  server.persisted = savedDistancesPlan()
  globalThis.fetch = server.fetch
  let view = render(h(Workspace, { queryClient }))
  const viewport = await restoreDistanceCreationDraft(view, queryClient), key = keys.imageDistanceDraft(image.caseId, image.id)
  fireEvent.click(view.getByRole("button", { name: distanceCopy.place }))
  const before = structuredClone(queryClient.getQueryData(key))
  fireEvent.click(view.getByRole("button", { name: imageCopy.title, exact: true }))
  assert.equal(view.queryByRole("button", { name: distanceCopy.draw }), null)
  fireEvent.keyDown(viewport, { key: "ArrowLeft" })
  assert.deepEqual(queryClient.getQueryData(key), before)
  assert.equal(view.getByRole("button", { name: imageCopy.recalibrate, exact: true }).disabled, true)
  view.unmount()
  view = render(h(Workspace, { queryClient }))
  await openSavedDistances(view)
  assert.deepEqual(queryClient.getQueryData(key), before)
  assert.ok(view.getByText(distanceCopy.notSaved))
  assert.ok(view.container.querySelector("[data-distance-draft]"))
  const newer = { ...server.persisted, revision: server.persisted.revision + 1 }
  server.persisted = newer
  await act(async () => { await queryClient.refetchQueries({ queryKey: keys.imagePlan(image.caseId, image.id) }) })
  await view.findByText(distanceCopy.planChanged)
  const nextViewport = view.container.querySelector("[data-calibration-viewport]")
  fireEvent.keyDown(nextViewport, { key: "ArrowRight" })
  assert.deepEqual(queryClient.getQueryData(key), before)
  assert.equal(view.queryByRole("button", { name: distanceCopy.draw }), null)
  fireEvent.click(view.getByRole("button", { name: distanceCopy.loadSaved }))
  assert.equal(queryClient.getQueryData(key), null)
  assert.equal(server.calls.some(call => call.method !== "GET"), false)
})


test("distance creation stale actions cannot revive cancelled recovery drafts, target a newer ID or bypass a live lock", async () => {
  const server = backend(), queryClient = client()
  server.persisted = savedDistancesPlan(); globalThis.fetch = server.fetch
  const hook = renderHook(() => useImageDistance(image, true, false), { wrapper: wrapper(queryClient) })
  await waitFor(() => assert.equal(hook.result.current.canCreate, true))
  const stale = hook.result.current
  act(() => { assert.equal(stale.beginCreate("New distance"), true); assert.equal(stale.placeLine(), true) })
  const firstId = hook.result.current.editor.id
  act(() => { assert.equal(stale.discard(), true); assert.equal(stale.beginCreate("Other distance"), true); assert.equal(stale.placeLine(), true) })
  const key = keys.imageDistanceDraft(image.caseId, image.id), receiptKey = keys.imagePlanSave(image.caseId, image.id)
  const current = structuredClone(queryClient.getQueryData(key))
  assert.notEqual(current.id, firstId)
  assert.equal(stale.changeGeometry(distanceGeometry, firstId), false)
  assert.deepEqual(queryClient.getQueryData(key), current)
  const command = hook.result.current.command()
  act(() => {
    queryClient.setQueryData(receiptKey, { phase: "saving", edit: command })
    assert.equal(stale.changeGeometry(distanceGeometry, current.id), false)
    assert.equal(stale.discard(), false)
  })
  assert.deepEqual(queryClient.getQueryData(key), current)
  act(() => {
    queryClient.setQueryData(receiptKey, { phase: "error", edit: command, code: "SERVICE_UNAVAILABLE" })
    queryClient.setQueryData(key, null)
  })
  await waitFor(() => assert.equal(hook.result.current.receipt.phase, "error"))
  const recoveryCallbacks = hook.result.current
  act(() => assert.equal(recoveryCallbacks.discard(), true))
  assert.equal(recoveryCallbacks.changeGeometry(distanceGeometry, current.id), false)
  assert.equal(queryClient.getQueryData(key), null)
  act(() => {
    queryClient.setQueryData(keys.caseDeletion(image.caseId), { phase: "uncertain" })
    assert.equal(stale.beginCreate("Blocked distance"), false)
  })
  assert.equal(server.calls.some(call => call.method !== "GET"), false)
})

test("distance creation capacity counts all plan objects and refuses before allocating a draft", async () => {
  const server = backend(), queryClient = client()
  server.persisted = savedDistancesPlan()
  const angle = server.persisted.document.objects[1]
  server.persisted.document.objects = Array.from({ length: 500 }, (_, index) => ({ ...angle, id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}` }))
  globalThis.fetch = server.fetch
  const hook = renderHook(() => useImageDistance(image, true, false), { wrapper: wrapper(queryClient) })
  await waitFor(() => assert.equal(hook.result.current.canEdit, true))
  assert.equal(hook.result.current.canCreate, false)
  act(() => assert.equal(hook.result.current.beginCreate("Over capacity"), false))
  assert.equal(hook.result.current.editor, null)
  assert.equal(server.calls.some(call => call.method !== "GET"), false)
})

test("distance creation gesture owner prevents committing to a replacement editor or changed geometry before passive effects run", async () => {
  const changes = [], captures = new Set()
  function Replacement({ id, geometry = null }) {
    React.useLayoutEffect(() => {
      if (id === "line-b" || geometry) {
        const event = new dom.window.MouseEvent("pointerup", { bubbles: true, button: 0, clientX: 350, clientY: 225 })
        Object.defineProperties(event, { pointerId: { value: 7 }, isPrimary: { value: true } })
        document.querySelector("[data-calibration-viewport]").dispatchEvent(event)
      }
    }, [id, geometry])
    return editorViewer({ editor: { kind: "distance", id, editable: true, tool: "mark", geometry,
      onGeometryChange: geometry => changes.push({ id, geometry }), onToolChange() {} } })
  }
  const view = render(h(Replacement, { id: "line-a" }))
  const { viewport } = viewerRect(view)
  viewport.setPointerCapture = id => captures.add(id)
  viewport.hasPointerCapture = id => captures.has(id)
  viewport.releasePointerCapture = id => captures.delete(id)
  viewerPointer(viewport, "pointerdown", 150, 125)
  viewerPointer(viewport, "pointermove", 350, 225)
  await act(async () => { view.rerender(h(Replacement, { id: "line-b" })) })
  assert.deepEqual(changes, [])
  assert.equal(captures.size, 0)
  viewerPointer(viewport, "pointerdown", 150, 125)
  viewerPointer(viewport, "pointerup", 350, 225)
  assert.deepEqual(changes, [{ id: "line-b", geometry: { start: { x: 0.1, y: 0.1 }, end: { x: 0.5, y: 0.5 } } }])
  viewerPointer(viewport, "pointerdown", 150, 125)
  viewerPointer(viewport, "pointermove", 350, 225)
  await act(async () => { view.rerender(h(Replacement, { id: "line-b", geometry: { start: { x: 0.4, y: 0.5 }, end: { x: 0.6, y: 0.5 } } })) })
  assert.equal(changes.length, 1)
  assert.equal(captures.size, 0)
  assert.equal(Number(view.container.querySelector("[data-distance-draft] line").getAttribute("x1")), 400)
})


function editableDistancesPlan() {
  const plan = savedDistancesPlan()
  plan.document.objects[0].start = { x: 0.2, y: 0.2 }; plan.document.objects[0].end = { x: 0.6, y: 0.6 }
  plan.document.objects[2].start = { x: 0.8, y: 0.1 }; plan.document.objects[2].end = { x: 0.8, y: 0.9 }
  return plan
}
function distanceRect(view, rect = { left: 100, top: 100, right: 1100, bottom: 600, width: 1000, height: 500 }) {
  view.getByRole("img").parentElement.getBoundingClientRect = () => rect
  return view.container.querySelector("[data-calibration-viewport]")
}
async function editFirstDistance(view) {
  const list = await openSavedDistances(view)
  if (!view.queryByRole("button", { name: distanceCopy.cancelEditing, exact: true })) {
    fireEvent.click(list.querySelector("button"))
    const edit = view.queryByRole("button", { name: distanceCopy.edit, exact: true })
    if (edit) fireEvent.click(edit)
  }
  const viewport = distanceRect(view)
  await waitFor(() => assert.ok(document.activeElement === viewport))
  return viewport
}
const closePoint = (actual, expected) => { assert.ok(Math.abs(actual.x - expected.x) < 1e-12); assert.ok(Math.abs(actual.y - expected.y) < 1e-12) }

test("distance editing selects from the list and adjusts both endpoints entirely by keyboard, with local cancel", async () => {
  const server = backend(), queryClient = client()
  server.persisted = editableDistancesPlan(); globalThis.fetch = server.fetch
  const before = structuredClone(server.persisted), view = render(h(Workspace, { queryClient }))
  const viewport = await editFirstDistance(view), key = keys.imageDistanceDraft(image.caseId, image.id)
  assert.equal(hasImagePlanDraft(queryClient, image.caseId, image.id), false)
  assert.ok(view.getByText(distanceCopy.editingSaved))
  assert.equal(view.container.querySelectorAll("[data-distance-id]").length, 2)
  const editingOverlay = view.container.querySelector(`[data-distance-id="${before.document.objects[0].id}"]`)
  assert.ok(!editingOverlay.querySelector("line"))
  assert.equal(editingOverlay.querySelector("text").textContent, "123,46 mm")
  const start = view.getByRole("button", { name: distanceCopy.targets.start, exact: true })
  act(() => start.focus())
  fireEvent.keyDown(start, { key: "ArrowRight", shiftKey: true })
  const end = view.getByRole("button", { name: distanceCopy.targets.end, exact: true })
  act(() => end.focus())
  fireEvent.keyDown(end, { key: "ArrowUp", shiftKey: true })
  closePoint(queryClient.getQueryData(key).geometry.start, { x: 0.205, y: 0.2 })
  closePoint(queryClient.getQueryData(key).geometry.end, { x: 0.6, y: 0.59 })
  assert.equal(end.getAttribute("aria-pressed"), "true")
  assert.equal(hasImagePlanDraft(queryClient, image.caseId, image.id), true)
  const list = view.getByRole("list", { name: distanceCopy.list })
  assert.ok(list.textContent.includes(distanceCopy.previewValue))
  assert.equal(list.textContent.includes("123,46 mm"), false)
  assert.deepEqual(server.persisted, before)
  fireEvent.click(view.getByRole("button", { name: distanceCopy.cancelEditing }))
  assert.equal(queryClient.getQueryData(key), null)
  assert.equal(view.container.querySelector("[data-distance-draft]"), null)
  assert.equal(view.container.querySelectorAll("[data-distance-id]").length, 0)
  closePoint(server.persisted.document.objects[0].start, { x: 0.2, y: 0.2 })
  fireEvent.keyDown(viewport, { key: "ArrowLeft" })
  assert.equal(queryClient.getQueryData(key), null)
  assert.equal(server.calls.some(call => call.method !== "GET"), false)
})

test("distance editing selects a canvas line on tap, retains pan for dragging, and moves the whole selected segment within bounds", async () => {
  const server = backend(), queryClient = client()
  server.persisted = editableDistancesPlan(); globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  fireEvent.click((await openSavedDistances(view)).querySelector("button"))
  const viewport = distanceRect(view), key = keys.imageDistanceDraft(image.caseId, image.id)
  viewerPointer(viewport, "pointerdown", 500, 300)
  viewerPointer(viewport, "pointerup", 500, 300)
  assert.ok(view.getByRole("button", { name: distanceCopy.edit }))
  assert.equal(queryClient.getQueryData(key), null)
  fireEvent.click(view.getByRole("button", { name: distanceCopy.edit }))
  viewerPointer(viewport, "pointerdown", 500, 300)
  viewerPointer(viewport, "pointermove", 550, 350)
  assert.equal(hasImagePlanDraft(queryClient, image.caseId, image.id), false)
  viewerPointer(viewport, "pointerup", 550, 350)
  closePoint(queryClient.getQueryData(key).geometry.start, { x: 0.25, y: 0.3 })
  closePoint(queryClient.getQueryData(key).geometry.end, { x: 0.65, y: 0.7 })
  viewerPointer(viewport, "pointerdown", 550, 350)
  viewerPointer(viewport, "pointerup", 2000, -500)
  closePoint(queryClient.getQueryData(key).geometry.start, { x: 0.6, y: 0 })
  closePoint(queryClient.getQueryData(key).geometry.end, { x: 1, y: 0.4 })
  assert.equal(view.getByRole("button", { name: distanceCopy.targets.body, exact: true }).getAttribute("aria-pressed"), "true")
  assert.equal(server.calls.some(call => call.method !== "GET"), false)
})

test("distance editing touch handles adjust either endpoint and keep a captured target when crossing another line", async () => {
  const server = backend(), queryClient = client()
  server.persisted = editableDistancesPlan(); globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient })), viewport = await editFirstDistance(view)
  const key = keys.imageDistanceDraft(image.caseId, image.id), id = queryClient.getQueryData(key).id
  viewerPointer(viewport, "pointerdown", 300, 200, { pointerType: "touch" })
  viewerPointer(viewport, "pointerup", 350, 225, { pointerType: "touch" })
  closePoint(queryClient.getQueryData(key).geometry.start, { x: 0.25, y: 0.25 })
  closePoint(queryClient.getQueryData(key).geometry.end, { x: 0.6, y: 0.6 })
  assert.equal(view.getByRole("button", { name: distanceCopy.targets.start, exact: true }).getAttribute("aria-pressed"), "true")
  viewerPointer(viewport, "pointerdown", 700, 400, { pointerType: "touch" })
  viewerPointer(viewport, "pointermove", 900, 350, { pointerType: "touch" })
  viewerPointer(viewport, "pointerup", 650, 350, { pointerType: "touch" })
  closePoint(queryClient.getQueryData(key).geometry.end, { x: 0.55, y: 0.5 })
  assert.equal(queryClient.getQueryData(key).id, id)
  assert.equal(view.getByRole("button", { name: distanceCopy.targets.end, exact: true }).getAttribute("aria-pressed"), "true")
  viewerPointer(viewport, "pointerdown", 500, 287.5, { pointerType: "touch" })
  viewerPointer(viewport, "pointerup", 510, 297.5, { pointerType: "touch" })
  assert.equal(view.getByRole("button", { name: distanceCopy.targets.body, exact: true }).getAttribute("aria-pressed"), "true")
  assert.equal(server.calls.some(call => call.method !== "GET"), false)
})

test("distance editing list resolves overlapping lines and dirty geometry blocks switching by list or canvas", async () => {
  const server = backend(), queryClient = client()
  server.persisted = editableDistancesPlan()
  server.persisted.document.objects[2].start = { x: 0.2, y: 0.2 }; server.persisted.document.objects[2].end = { x: 0.6, y: 0.6 }
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient })), list = await openSavedDistances(view)
  fireEvent.click(list.querySelectorAll("[data-distance-row]")[1])
  assert.equal(view.container.querySelector("[data-distance-overlay]").lastElementChild.dataset.distanceSelected, "true")
  fireEvent.click(view.getByRole("button", { name: distanceCopy.edit }))
  const viewport = distanceRect(view), key = keys.imageDistanceDraft(image.caseId, image.id)
  const id = queryClient.getQueryData(key).id
  assert.equal(id, server.persisted.document.objects[2].id)
  viewerPointer(viewport, "pointerdown", 500, 300)
  viewerPointer(viewport, "pointerup", 550, 350)
  assert.equal(queryClient.getQueryData(key).id, id)
  assert.equal(list.querySelectorAll("[data-distance-row]")[0].disabled, true)
  fireEvent.click(list.querySelectorAll("[data-distance-row]")[0])
  viewerPointer(viewport, "pointerdown", 300, 200)
  viewerPointer(viewport, "pointerup", 300, 200)
  assert.equal(queryClient.getQueryData(key).id, id)
  assert.ok(view.getByText(distanceCopy.finishEditing))
  fireEvent.click(view.getByRole("button", { name: distanceCopy.cancelEditing }))
  fireEvent.click((await openDistanceTool(view)).querySelector("button"))
  assert.ok(view.getByRole("button", { name: distanceCopy.edit }))
  assert.equal(server.calls.some(call => call.method !== "GET"), false)
})

test("distance editing ignores blank-image redraws and read-only panels, and preserves its draft on Escape", async () => {
  const server = backend(), queryClient = client()
  server.persisted = editableDistancesPlan(); globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient })), viewport = await editFirstDistance(view)
  const key = keys.imageDistanceDraft(image.caseId, image.id), before = structuredClone(queryClient.getQueryData(key))
  viewerPointer(viewport, "pointerdown", 500, 300); viewerPointer(viewport, "pointerup", 501, 300)
  assert.deepEqual(queryClient.getQueryData(key), before)
  assert.equal(hasImagePlanDraft(queryClient, image.caseId, image.id), false)
  viewerPointer(viewport, "pointerdown", 100, 100); viewerPointer(viewport, "pointerup", 500, 500)
  assert.deepEqual(queryClient.getQueryData(key), before)
  viewerPointer(viewport, "pointerdown", 300, 200); viewerPointer(viewport, "pointermove", 350, 225)
  fireEvent.keyDown(viewport, { key: "Escape" }); viewerPointer(viewport, "pointerup", 350, 225)
  assert.deepEqual(queryClient.getQueryData(key), before)
  fireEvent.click(view.getByRole("button", { name: imageCopy.title, exact: true }))
  fireEvent.keyDown(viewport, { key: "ArrowRight" })
  assert.deepEqual(queryClient.getQueryData(key), before)
  assert.equal(view.container.querySelector("[data-distance-draft]"), null)
  assert.equal(view.container.querySelectorAll("[data-distance-id]").length, 0)
  await openCalibration(view)
  assert.equal(queryClient.getQueryData(key), null)
  assert.equal(server.calls.some(call => call.method !== "GET"), false)
})

test("distance editing uses source coordinates through mirrored zoom and pan, including keyboard and pointer endpoint adjustment", async () => {
  const server = backend(), queryClient = client()
  server.persisted = editableDistancesPlan(); globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await editFirstDistance(view)
  fireEvent.click(view.getByRole("button", { name: imageCopy.title, exact: true }))
  fireEvent.click(view.getByRole("button", { name: imageCopy.mirror }))
  fireEvent.click(view.getByRole("button", { name: toolsCopy.title, exact: true }))
  const start = view.getByRole("button", { name: distanceCopy.targets.start, exact: true })
  fireEvent.keyDown(start, { key: "ArrowRight", shiftKey: true })
  const key = keys.imageDistanceDraft(image.caseId, image.id)
  closePoint(queryClient.getQueryData(key).geometry.start, { x: 0.195, y: 0.2 })
  for (let i = 0; i < 4; i++) fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.viewer.zoomIn }))
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.viewer.pan }))
  const viewport = distanceRect(view, { left: 80, top: 60, right: 2080, bottom: 1060, width: 2000, height: 1000 })
  viewerPointer(viewport, "pointerdown", 500, 300); viewerPointer(viewport, "pointermove", 550, 320); viewerPointer(viewport, "pointerup", 550, 320)
  fireEvent.click(view.getByRole("button", { name: distanceCopy.adjust }))
  viewerPointer(viewport, "pointerdown", 1690, 260); viewerPointer(viewport, "pointerup", 1650, 280)
  closePoint(queryClient.getQueryData(key).geometry.start, { x: 0.215, y: 0.22 })
  closePoint(queryClient.getQueryData(key).geometry.end, { x: 0.6, y: 0.6 })
  assert.ok(view.getByRole("img").parentElement.style.transform.includes("scaleX(-1)"))
  assert.equal(server.calls.some(call => call.method !== "GET"), false)
})

test("distance editing preserves hidden and locked guards and freezes on a newer plan revision", async () => {
  const server = backend(), queryClient = client()
  server.persisted = editableDistancesPlan(); server.persisted.document.objects[2].locked = true
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient })), list = await openSavedDistances(view)
  fireEvent.click(list.querySelectorAll("[data-distance-row]")[1])
  assert.equal(view.getByRole("button", { name: distanceCopy.edit }).disabled, true)
  assert.ok(view.getAllByText(distanceCopy.locked).length > 0)
  fireEvent.click(list.querySelector("button")); fireEvent.click(view.getByRole("button", { name: distanceCopy.edit }))
  const key = keys.imageDistanceDraft(image.caseId, image.id), before = structuredClone(queryClient.getQueryData(key))
  server.persisted = { ...server.persisted, revision: server.persisted.revision + 1 }
  await act(async () => { await queryClient.refetchQueries({ queryKey: keys.imagePlan(image.caseId, image.id) }) })
  await view.findByText(distanceCopy.planChanged)
  fireEvent.keyDown(view.getByRole("button", { name: distanceCopy.targets.start, exact: true }), { key: "ArrowRight" })
  assert.deepEqual(queryClient.getQueryData(key), before)
  fireEvent.click(view.getByRole("button", { name: distanceCopy.loadSaved }))
  assert.equal(queryClient.getQueryData(key), null)
  assert.equal(server.calls.some(call => call.method !== "GET"), false)
})

// Synthetic official results deliberately differ from any client-side estimate.
function distanceResultBackend(server, length = 42.987654) {
  return async (url, init) => {
    const response = await server.fetch(url, init)
    if (init?.method !== "PATCH" || !response.ok) return response
    const body = await response.json(), input = JSON.parse(init.body)
    const line = body.document.objects.find(object => object.id === input.id)
    if (line) line.measurement = { status: "CALCULATED", calibration_id: body.document.calibration.result.calibration_id,
      values: { length }, units: { length: "mm" } }
    server.persisted = body
    return Response.json(body)
  }
}

function distanceNotices() {
  const notices = []
  toast.success = (title, options) => { notices.push({ kind: "success", title, ...options }); return 1 }
  toast.error = (title, options) => { notices.push({ kind: "error", title, ...options }); return 1 }
  toast.info = (title, options) => { notices.push({ kind: "info", title, ...options }); return 1 }
  return notices
}

test("distance saving completes create, reopen, edit and update with official values and preserved objects", async () => {
  const server = backend(), queryClient = client(), notices = distanceNotices()
  server.persisted = savedDistancesPlan(); globalThis.fetch = distanceResultBackend(server)
  let view = render(h(Workspace, { queryClient }))
  await restoreDistanceCreationDraft(view, queryClient)
  assert.equal(view.getByRole("button", { name: distanceCopy.save, exact: true }).disabled, true)
  fireEvent.click(view.getByRole("button", { name: distanceCopy.place }))
  const draftKey = keys.imageDistanceDraft(image.caseId, image.id), draft = structuredClone(queryClient.getQueryData(draftKey))
  const before = structuredClone(server.persisted)
  fireEvent.click(view.getByRole("button", { name: distanceCopy.save, exact: true }))
  await waitFor(() => assert.equal(notices.length, 1))
  const row = view.container.querySelector(`[data-distance-row="${draft.id}"]`)
  assert.equal(row.getAttribute("aria-pressed"), "true")
  assert.match(row.textContent, /42,99 mm/)
  await waitFor(() => assert.ok(document.activeElement === row))
  assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).getAttribute("aria-pressed"), "true")
  assert.equal(view.container.querySelector("[data-calibration-viewport]").classList.contains("cursor-grab"), true)
  assert.equal(queryClient.getQueryData(draftKey), null)
  assert.equal(hasImagePlanDraft(queryClient, image.caseId, image.id), false)
  assert.equal(notices[0].title, distanceCopy.savedTitle)
  assert.equal(server.calls.filter(call => call.method === "PATCH").length, 1)
  const created = server.persisted.document.objects.find(object => object.id === draft.id)
  closePoint(created.start, draft.geometry.start); closePoint(created.end, draft.geometry.end)
  assert.deepEqual(server.persisted.document.objects.slice(0, 3), before.document.objects)

  view.unmount()
  const reopenedClient = client()
  view = render(h(Workspace, { queryClient: reopenedClient }))
  await openSavedDistances(view)
  fireEvent.click(view.container.querySelector(`[data-distance-row="${draft.id}"]`))
  fireEvent.click(view.getByRole("button", { name: distanceCopy.edit }))
  const update = view.getByRole("button", { name: distanceCopy.update, exact: true })
  assert.equal(update.disabled, true)
  fireEvent.keyDown(view.getByRole("button", { name: distanceCopy.targets.end, exact: true }), { key: "ArrowRight", shiftKey: true })
  const edited = structuredClone(reopenedClient.getQueryData(draftKey)), orderedIds = server.persisted.document.objects.map(object => object.id)
  assert.equal(view.container.querySelector(`[data-distance-row="${draft.id}"]`).textContent.includes("42,99 mm"), false)
  fireEvent.click(update)
  await waitFor(() => assert.equal(notices.length, 2))
  const confirmed = server.persisted.document.objects.find(object => object.id === draft.id)
  closePoint(confirmed.end, edited.geometry.end)
  assert.equal(confirmed.id, created.id); assert.equal(confirmed.label, created.label)
  assert.equal(confirmed.visible, true); assert.equal(confirmed.locked, false)
  assert.deepEqual(server.persisted.document.objects.map(object => object.id), orderedIds)
  assert.deepEqual(server.persisted.document.objects.slice(0, 3), before.document.objects)
  const writes = server.calls.filter(call => call.method === "PATCH")
  assert.deepEqual(writes.map(call => call.body.kind), ["distance-create", "distance-update"])
  assert.equal(writes[1].body.baseRevision, before.revision + 1)
  assert.equal(writes.some(call => "measurement" in call.body), false)
  assert.equal(server.calls.some(call => call.method === "PUT"), false)
  await waitFor(() => assert.ok(document.activeElement === view.container.querySelector(`[data-distance-row="${draft.id}"]`)))
})

test("distance saving double click sends one write and one notice, locks controls and waits for confirmation", async () => {
  const server = backend(), queryClient = client(), notices = distanceNotices(), barrier = deferred(), entered = deferred()
  server.persisted = savedDistancesPlan()
  const official = distanceResultBackend(server)
  globalThis.fetch = async (url, init) => {
    if (init?.method === "PATCH") { entered.resolve(); await barrier.promise }
    return official(url, init)
  }
  const view = render(h(Workspace, { queryClient }))
  const viewport = await restoreDistanceCreationDraft(view, queryClient)
  fireEvent.click(view.getByRole("button", { name: distanceCopy.place }))
  const draftKey = keys.imageDistanceDraft(image.caseId, image.id), before = structuredClone(queryClient.getQueryData(draftKey))
  const button = view.getByRole("button", { name: distanceCopy.save, exact: true })
  act(() => { fireEvent.click(button); fireEvent.click(button) })
  await entered.promise
  const busy = await view.findByRole("button", { name: distanceCopy.saving, exact: true })
  assert.equal(busy.disabled, true)
  assert.equal(busy.getAttribute("aria-busy"), "true")
  assert.equal(view.getByRole("button", { name: distanceCopy.cancelEditing }).disabled, true)
  const activeTool = view.getByRole("button", { name: distanceCopy.title, exact: true })
  assert.equal(activeTool.disabled, false)
  assert.equal(activeTool.getAttribute("aria-pressed"), "true")
  fireEvent.click(activeTool)
  fireEvent.keyDown(viewport, { key: "ArrowRight" })
  assert.deepEqual(queryClient.getQueryData(draftKey), before)
  assert.equal(view.container.textContent.includes("42,99 mm"), false)
  assert.equal(notices.length, 0)
  await act(async () => { barrier.resolve() })
  await waitFor(() => assert.equal(notices.length, 1))
  assert.equal(server.calls.filter(call => call.method === "PATCH").length, 1)
  assert.equal(notices[0].kind, "success")
})

test("distance saving definitive failure preserves the editable draft and requires an explicit retry", async () => {
  const server = backend(), queryClient = client(), notices = distanceNotices()
  server.persisted = savedDistancesPlan()
  let reject = true
  globalThis.fetch = async (url, init) => {
    if (init?.method === "PATCH" && reject) {
      server.calls.push({ url, method: init.method, body: JSON.parse(init.body) })
      return Response.json({ error: { code: "CLINICAL_VALIDATION_INVALID", uncertain: false } }, { status: 422 })
    }
    return server.fetch(url, init)
  }
  const view = render(h(Workspace, { queryClient }))
  await restoreDistanceCreationDraft(view, queryClient); fireEvent.click(view.getByRole("button", { name: distanceCopy.place }))
  const key = keys.imageDistanceDraft(image.caseId, image.id), before = structuredClone(queryClient.getQueryData(key)), reads = server.calls.length
  fireEvent.click(view.getByRole("button", { name: distanceCopy.save, exact: true }))
  await waitFor(() => assert.equal(notices.length, 1))
  assert.equal(notices[0].title, distanceCopy.notAllowedTitle)
  assert.deepEqual(queryClient.getQueryData(key), before)
  assert.equal(view.getByRole("button", { name: distanceCopy.save, exact: true }).disabled, false)
  assert.equal(server.calls.length, reads + 1)
  fireEvent.keyDown(view.getByRole("button", { name: distanceCopy.targets.end, exact: true }), { key: "ArrowDown" })
  assert.notDeepEqual(queryClient.getQueryData(key).geometry, before.geometry)
  assert.equal(server.calls.length, reads + 1)
  reject = false
  fireEvent.click(view.getByRole("button", { name: distanceCopy.save, exact: true }))
  await waitFor(() => assert.equal(notices.length, 2))
  assert.equal(notices[1].title, distanceCopy.savedTitle)
  // Missing derived data is a confirmed geometry save, never a reason to replay.
  const row = view.container.querySelector(`[data-distance-row="${before.id}"]`)
  assert.match(row.textContent, new RegExp(distanceCopy.unavailable))
  assert.equal(server.calls.filter(call => call.method === "PATCH").length, 2)
  assert.equal(queryClient.getQueryData(key), null)
})

for (const newerConflict of [false, true]) test(`distance saving lost acknowledgement checks by GET only and resolves to ${newerConflict ? "conflict" : "saved"}`, async () => {
  const server = backend(), queryClient = client(), notices = distanceNotices()
  server.persisted = savedDistancesPlan()
  const old = structuredClone(server.persisted), official = distanceResultBackend(server)
  let written = false, verify = false
  globalThis.fetch = async (url, init) => {
    if (url.endsWith("/plan") && written && !verify) {
      server.calls.push({ url, method: "GET" }); return Response.json(old)
    }
    const response = await official(url, init)
    if (init?.method === "PATCH") { written = true; throw new TypeError("synthetic lost response") }
    return response
  }
  const view = render(h(Workspace, { queryClient }))
  await restoreDistanceCreationDraft(view, queryClient); fireEvent.click(view.getByRole("button", { name: distanceCopy.place }))
  const key = keys.imageDistanceDraft(image.caseId, image.id), draft = structuredClone(queryClient.getQueryData(key))
  fireEvent.click(view.getByRole("button", { name: distanceCopy.save, exact: true }))
  await view.findByText(distanceCopy.uncertainDescription)
  await waitFor(() => assert.equal(notices.length, 1))
  assert.equal(notices[0].title, distanceCopy.uncertainTitle)
  assert.equal(view.getByRole("button", { name: distanceCopy.cancelEditing }).disabled, true)
  assert.deepEqual(queryClient.getQueryData(key), draft)
  if (newerConflict) server.persisted = { ...old, revision: old.revision + 2 }
  verify = true
  const reads = server.calls.filter(call => call.method === "GET" && call.url.endsWith("/plan")).length
  fireEvent.click(view.getByRole("button", { name: distanceCopy.checkSave }))
  await waitFor(() => assert.equal(notices.length, 2))
  assert.equal(server.calls.filter(call => call.method === "PATCH").length, 1)
  assert.equal(server.calls.filter(call => call.method === "GET" && call.url.endsWith("/plan")).length, reads + 1)
  if (newerConflict) {
    assert.equal(notices[1].title, distanceCopy.conflictTitle)
    assert.deepEqual(queryClient.getQueryData(key), draft)
    assert.equal(view.getByRole("button", { name: distanceCopy.save, exact: true }).disabled, true)
    fireEvent.click(view.getByRole("button", { name: distanceCopy.loadSaved }))
    assert.equal(queryClient.getQueryData(key), null)
    assert.equal(queryClient.getQueryData(keys.imagePlanSave(image.caseId, image.id)).phase, "idle")
    assert.equal(server.persisted.document.objects.some(object => object.id === draft.id), false)
  } else {
    assert.equal(notices[1].title, distanceCopy.savedTitle)
    assert.equal(queryClient.getQueryData(key), null)
    assert.equal(view.container.querySelector(`[data-distance-row="${draft.id}"]`).getAttribute("aria-pressed"), "true")
  }
})

for (const failRecovery of [false, true]) test(`distance saving conflict loads the current plan and preserves Tools when recovery ${failRecovery ? "fails before retry" : "succeeds"}`, async () => {
  const server = backend(), queryClient = client(), notices = distanceNotices(), barrier = deferred()
  server.persisted = savedDistancesPlan()
  let failRead = false, restoring = false, recoveryRejected = failRecovery
  globalThis.fetch = async (url, init) => {
    if (init?.method === "PATCH") {
      server.calls.push({ url, method: "PATCH", body: JSON.parse(init.body) })
      server.persisted = { ...server.persisted, revision: server.persisted.revision + 1 }
      failRead = true
      return Response.json({ error: { code: "PLAN_REVISION_CONFLICT", uncertain: false, currentRevision: server.persisted.revision } }, { status: 409 })
    }
    if (url.endsWith("/plan") && failRead) {
      server.calls.push({ url, method: "GET" })
      return Response.json({ error: { code: "SERVICE_UNAVAILABLE" } }, { status: 503 })
    }
    if (url.endsWith("/plan") && restoring) {
      await barrier.promise
      if (recoveryRejected) {
        server.calls.push({ url, method: "GET" })
        return Response.json({ error: { code: "SERVICE_UNAVAILABLE" } }, { status: 503 })
      }
    }
    return server.fetch(url, init)
  }
  const view = render(h(Workspace, { queryClient }))
  await editFirstDistance(view)
  fireEvent.keyDown(view.getByRole("button", { name: distanceCopy.targets.start, exact: true }), { key: "ArrowUp" })
  const key = keys.imageDistanceDraft(image.caseId, image.id), draft = structuredClone(queryClient.getQueryData(key))
  fireEvent.click(view.getByRole("button", { name: distanceCopy.update, exact: true }))
  await view.findByText(distanceCopy.planChanged)
  assert.deepEqual(queryClient.getQueryData(key), draft)
  assert.equal(view.getByRole("button", { name: distanceCopy.update, exact: true }).disabled, true)
  await waitFor(() => assert.equal(notices.length, 1))
  failRead = false; restoring = true
  const reads = server.calls.filter(call => call.url.endsWith("/plan") && call.method === "GET").length
  fireEvent.click(view.getByRole("button", { name: distanceCopy.loadSaved }))
  await view.findByText(distanceCopy.loadingSaved)
  assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).getAttribute("aria-pressed"), "true")
  assert.equal(view.queryByText(distanceCopy.empty), null)
  await waitFor(() => assert.ok(document.activeElement === view.getByRole("button", { name: toolsCopy.title, exact: true })))
  await act(async () => { barrier.resolve() })
  if (failRecovery) {
    const retry = await view.findByRole("button", { name: distanceCopy.readAgain })
    assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).getAttribute("aria-pressed"), "true")
    assert.equal(view.queryByText(distanceCopy.empty), null)
    await waitFor(() => assert.ok(document.activeElement === retry))
    await waitFor(() => assert.equal(notices.length, 2))
    assert.equal(notices[1].title, distanceCopy.readErrorTitle)
    recoveryRejected = false
    fireEvent.click(retry)
  }
  await waitFor(() => assert.equal(queryClient.getQueryData(keys.imagePlan(image.caseId, image.id))?.revision, server.persisted.revision))
  assert.equal(queryClient.getQueryData(key), null)
  assert.equal(queryClient.getQueryData(keys.imagePlanSave(image.caseId, image.id)).phase, "idle")
  assert.equal(server.calls.filter(call => call.url.endsWith("/plan") && call.method === "GET").length, reads + (failRecovery ? 2 : 1))
  assert.equal(server.calls.filter(call => call.method === "PATCH").length, 1)
  assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).getAttribute("aria-pressed"), "true")
  await waitFor(() => assert.ok(document.activeElement === view.getByRole("button", { name: distanceCopy.title, exact: true })))
})

test("distance saving background read failure keeps Tools and the draft, with one Sonner and an accessible GET action", async () => {
  const server = backend(), queryClient = client(), notices = distanceNotices(), barrier = deferred()
  server.persisted = savedDistancesPlan()
  let background = false, failed = true
  globalThis.fetch = async (url, init) => {
    if (background && url.endsWith("/plan")) {
      await barrier.promise
      if (failed) {
        server.calls.push({ url, method: "GET" })
        return Response.json({ error: { code: "SERVICE_UNAVAILABLE" } }, { status: 503 })
      }
    }
    return server.fetch(url, init)
  }
  const view = render(h(Workspace, { queryClient }))
  await restoreDistanceCreationDraft(view, queryClient); fireEvent.click(view.getByRole("button", { name: distanceCopy.place }))
  const key = keys.imageDistanceDraft(image.caseId, image.id), before = structuredClone(queryClient.getQueryData(key))
  background = true
  let reading
  act(() => { reading = queryClient.refetchQueries({ queryKey: keys.imagePlan(image.caseId, image.id), exact: true }) })
  assert.equal(view.queryByText(messages.cases.workspace.calibration.remote.loading), null)
  assert.ok(view.getByText(distanceCopy.notSaved))
  await act(async () => { barrier.resolve(); await reading })
  const action = await view.findByRole("button", { name: distanceCopy.readAgain, exact: true })
  assert.ok(action.classList.contains("text-[var(--color-coral-500)]"))
  assert.ok(action.getAttribute("aria-describedby"))
  assert.equal(view.queryByRole("button", { name: messages.cases.workspace.calibration.remote.retry }), null)
  assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).getAttribute("aria-pressed"), "true")
  await waitFor(() => assert.equal(notices.length, 1))
  assert.equal(notices[0].title, distanceCopy.readErrorTitle)
  assert.deepEqual(queryClient.getQueryData(key), before)
  const reads = server.calls.length
  failed = false
  fireEvent.click(action)
  await view.findByRole("button", { name: distanceCopy.save, exact: true })
  assert.equal(server.calls.length, reads + 1)
  assert.equal(server.calls.some(call => call.method !== "GET"), false)
  assert.deepEqual(queryClient.getQueryData(key), before)
  assert.equal(notices.length, 1)
  fireEvent.click(view.getByRole("button", { name: distanceCopy.save, exact: true }))
  await waitFor(() => assert.equal(notices.length, 2))
  assert.equal(notices[1].title, distanceCopy.savedTitle)
})

test("distance saving read recovery also keeps a cached saved selection in Tools without creating an editor", async () => {
  const server = backend(), queryClient = client(), notices = distanceNotices()
  server.persisted = savedDistancesPlan(); let failed = false
  globalThis.fetch = async (url, init) => {
    if (url.endsWith("/plan") && failed) return Response.json({ error: { code: "SERVICE_UNAVAILABLE" } }, { status: 503 })
    return server.fetch(url, init)
  }
  const view = render(h(Workspace, { queryClient })), list = await openSavedDistances(view)
  fireEvent.click(list.querySelector("button"))
  failed = true
  await act(async () => { await queryClient.refetchQueries({ queryKey: keys.imagePlan(image.caseId, image.id), exact: true }) })
  const retry = await view.findByRole("button", { name: distanceCopy.readAgain })
  assert.ok(view.getByRole("list", { name: distanceCopy.list }))
  assert.equal(list.querySelector("button").getAttribute("aria-pressed"), "true")
  assert.equal(view.getByRole("button", { name: distanceCopy.edit }).disabled, true)
  assert.equal(queryClient.getQueryData(keys.imageDistanceDraft(image.caseId, image.id)), null)
  assert.equal(notices.length, 1)
  failed = false; fireEvent.click(retry)
  await waitFor(() => assert.equal(view.getByRole("button", { name: distanceCopy.edit }).disabled, false))
  assert.equal(server.calls.some(call => call.method !== "GET"), false)
  assert.equal(notices.length, 1)
})

test("distance saving completion after unmount updates cache without stale UI feedback", async () => {
  const server = backend(), queryClient = client(), notices = distanceNotices(), barrier = deferred(), entered = deferred()
  server.persisted = savedDistancesPlan()
  globalThis.fetch = async (url, init) => {
    if (init?.method === "PATCH") { entered.resolve(); await barrier.promise }
    return server.fetch(url, init)
  }
  const view = render(h(Workspace, { queryClient }))
  await restoreDistanceCreationDraft(view, queryClient); fireEvent.click(view.getByRole("button", { name: distanceCopy.place }))
  const key = keys.imageDistanceDraft(image.caseId, image.id), id = queryClient.getQueryData(key).id
  fireEvent.click(view.getByRole("button", { name: distanceCopy.save, exact: true }))
  await entered.promise
  view.unmount()
  await act(async () => { barrier.resolve() })
  await waitFor(() => assert.equal(queryClient.getQueryData(keys.imagePlanSave(image.caseId, image.id)).phase, "saved"))
  assert.equal(queryClient.getQueryData(key), null)
  assert.equal(notices.length, 0)
  const reopened = render(h(Workspace, { queryClient }))
  await openSavedDistances(reopened)
  assert.ok(reopened.container.querySelector(`[data-distance-row="${id}"]`))
  assert.equal(server.calls.filter(call => call.method === "PATCH").length, 1)
})

test("distance saving stale click cannot replay after a conflict is published before React renders it", async () => {
  const server = backend(), queryClient = client()
  server.persisted = savedDistancesPlan(); globalThis.fetch = server.fetch
  const hook = renderHook(() => useImageDistance(image, true, false), { wrapper: wrapper(queryClient) })
  await waitFor(() => assert.equal(hook.result.current.canCreate, true))
  act(() => { hook.result.current.beginCreate("Distance 3"); hook.result.current.placeLine() })
  const stale = hook.result.current, input = stale.command()
  assert.ok(input)
  let submitted
  act(() => {
    queryClient.setQueryData(keys.imagePlanSave(image.caseId, image.id), { phase: "conflict", edit: input, currentRevision: input.baseRevision + 1 })
    submitted = stale.submit()
  })
  assert.equal(await submitted, null)
  assert.equal(server.calls.some(call => call.method !== "GET"), false)
  assert.equal(queryClient.getQueryData(keys.imagePlanSave(image.caseId, image.id)).phase, "conflict")
})

test("distance saving blocks discard and edits immediately before the writer publishes its lock", async () => {
  const server = backend(), queryClient = client()
  server.persisted = savedDistancesPlan(); globalThis.fetch = server.fetch
  const hook = renderHook(() => useImageDistance(image, true, false), { wrapper: wrapper(queryClient) })
  await waitFor(() => assert.equal(hook.result.current.canCreate, true))
  act(() => { hook.result.current.beginCreate("Distance 3"); hook.result.current.placeLine() })
  const current = hook.result.current, key = keys.imageDistanceDraft(image.caseId, image.id), before = structuredClone(queryClient.getQueryData(key))
  await act(async () => {
    const submitted = current.submit()
    assert.equal(current.discard(), false)
    assert.equal(current.changeGeometry(distanceGeometry), false)
    assert.equal(current.select(null), false)
    assert.deepEqual(queryClient.getQueryData(key), before)
    assert.equal((await submitted).phase, "saved")
  })
  assert.equal(queryClient.getQueryData(key), null)
  assert.equal(server.calls.filter(call => call.method === "PATCH").length, 1)
})

test("distance saving toolbar uses English actions, accessible tips and restrained pending announcements", async () => {
  const en = { cases: JSON.parse(readFileSync(new URL("../src/i18n/messages/en/cases.json", import.meta.url), "utf8")) }
  const props = { name: "Distance 1", hasGeometry: true, editable: true, editing: true, children: null, selection: null, cancelDisabled: false, needsRebase: false,
    onPlace() {}, onCancel() {}, intent: "update", dirty: true, target: "end", onTargetChange() {}, onNudge() {},
    receipt: { phase: "idle" }, pending: false, canSave: true, canCheck: true, readError: false, canRetryRead: true,
    onSave() {}, onCheck() {}, onRetryRead() {} }
  const content = value => h(NextIntlClientProvider, { locale: "en", timeZone: "UTC", messages: en },
    h(CaseImageDistanceToolbar, value, h(CaseImageDistanceActions, value)))
  const view = render(content(props))
  assert.ok(view.getByRole("button", { name: "Update", exact: true }))
  assert.ok(view.getByRole("button", { name: "Cancel distance editing" }))
  const updateButton = view.getByRole("button", { name: "Update", exact: true })
  fireEvent.focus(updateButton)
  assert.equal((await view.findByRole("tooltip")).textContent, en.cases.workspace.distance.update)
  assert.equal(document.getElementById(updateButton.getAttribute("aria-describedby")).textContent, en.cases.workspace.distance.controlTips.update)
  fireEvent.keyDown(document.activeElement, { key: "Escape" })
  view.rerender(content({ ...props, receipt: { phase: "checking" }, pending: true, editable: false, cancelDisabled: true }))
  assert.equal(view.getByRole("button", { name: "Checking…" }).disabled, true)
  assert.equal(view.getByRole("region", { name: en.cases.workspace.distance.editActions }).getAttribute("aria-busy"), "true")
  assert.equal(view.container.querySelectorAll('[aria-live="polite"]').length, 1)
  view.rerender(content({ ...props, readError: true }))
  assert.ok(view.getByRole("button", { name: "Check plan" }).getAttribute("aria-describedby"))
})

test("measurement tooltips wait on hover and open immediately on keyboard focus inside the viewer", async () => {
  const { angle, distance } = messages.cases.workspace
  const view = render(h(NextIntlClientProvider, { locale: "pt-BR", timeZone: "UTC", messages },
    h("section", { "data-image-viewer": true },
      h(CaseImageDistanceToolbar, { name: "Distância", hasGeometry: true, editable: true, editing: true, target: "body" }),
      h(CaseImageAngleValueControl, { enabled: true, open: false, currentDegrees: 90, onOpenChange() {}, onApply: () => true }))))
  const viewer = view.container.querySelector("[data-image-viewer]")
  const angleButton = view.getByRole("button", { name: angle.valueControl.title, exact: true })
  const hoverStarted = performance.now()
  fireEvent.pointerMove(angleButton, { pointerType: "mouse" })
  assert.equal(view.queryByRole("tooltip"), null)
  const hoverTip = await view.findByRole("tooltip")
  assert.ok(performance.now() - hoverStarted >= 425)
  assert.equal(hoverTip.textContent, angle.valueControl.tip)
  assert.ok(viewer.contains(hoverTip.closest("[data-slot=tooltip-content]")))
  assert.equal(angleButton.getAttribute("data-state"), "delayed-open")
  fireEvent.keyDown(angleButton, { key: "Escape" })
  const distanceButton = view.getByRole("button", { name: distance.targets.body, exact: true })
  act(() => distanceButton.focus())
  assert.equal(view.getByRole("tooltip").textContent, distance.move)
  assert.equal(distanceButton.parentElement.getAttribute("data-state"), "instant-open")
  assert.equal(document.getElementById(distanceButton.getAttribute("aria-describedby")).textContent, distance.controlTips.body)
})

test("distance toolbar lives over the viewer outside its gesture surface; the catalog remains read-only for future tools", async () => {
  const server = backend(), queryClient = client()
  server.persisted = savedDistancesPlan(); globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await openSavedDistances(view)
  const create = view.getByRole("button", { name: distanceCopy.title, exact: true })
  assert.equal(create.getAttribute("data-variant"), "ghost")
  for (const name of [toolsCopy.catalog.angle, toolsCopy.catalog.circle, toolsCopy.catalog.additional]) {
    const option = view.getByRole("button", { name, exact: true })
    assert.equal(option.disabled, true)
    assert.ok(option.querySelector("svg"))
    fireEvent.click(option)
  }
  assert.equal(queryClient.getQueryData(keys.imageDistanceDraft(image.caseId, image.id)), null)
  // Ambiguous legacy plans require an explicit saved selection.
  fireEvent.click(view.container.querySelector("[data-distance-row]"))
  fireEvent.click(create)
  const controls = view.container.querySelector("[data-distance-controls]"), viewer = view.container.querySelector("[data-image-viewer]")
  const viewport = view.container.querySelector("[data-calibration-viewport]")
  assert.ok(viewer.contains(controls))
  assert.equal(viewport.contains(controls), false)
  assert.equal(view.container.querySelector("aside").contains(controls), false)
  assert.equal(create.disabled, false)
  assert.equal(create.getAttribute("aria-pressed"), "true")
  assert.ok(create.classList.contains("bg-[var(--button-ghost-background-hover)]"))
  assert.ok(controls.classList.contains("bg-[var(--color-obsidian)]"))
  assert.ok(controls.parentElement.parentElement.classList.contains("left-3"))
  assert.ok(controls.parentElement.parentElement.classList.contains("items-center"))
  assert.ok(controls.querySelector("h3").parentElement.classList.contains("sr-only"))
  const save = view.getByRole("button", { name: distanceCopy.update, exact: true })
  const cancel = view.getByRole("button", { name: distanceCopy.cancelEditing })
  assert.ok(save.classList.contains("text-[var(--color-sage-500)]")); assert.ok(cancel.classList.contains("text-[var(--color-coral-500)]"))
  assert.equal(save.textContent, ""); assert.equal(cancel.textContent, "")
  await waitFor(() => assert.ok(document.activeElement === viewport))
  const before = structuredClone(queryClient.getQueryData(keys.imageDistanceDraft(image.caseId, image.id)))
  const start = view.getByRole("button", { name: distanceCopy.targets.start, exact: true })
  act(() => start.focus())
  assert.equal((await view.findByRole("tooltip")).textContent, distanceCopy.targets.start)
  assert.equal(document.getElementById(start.getAttribute("aria-describedby")).textContent, distanceCopy.controlTips.start)
  assert.ok(viewer.contains(view.getByRole("tooltip").closest("[data-slot=tooltip-content]")))
  fireEvent.keyDown(start, { key: "ArrowRight" })
  const after = queryClient.getQueryData(keys.imageDistanceDraft(image.caseId, image.id))
  closePoint(after.geometry.start, { x: before.geometry.start.x + 1 / image.widthPx, y: before.geometry.start.y })
  closePoint(after.geometry.end, before.geometry.end)
  assert.equal(server.calls.some(call => call.method !== "GET"), false)
})

test("distance toolbar preserves cancellation and its draft when the preview fails", async () => {
  const server = backend(), queryClient = client()
  server.persisted = savedDistancesPlan(); globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await restoreDistanceCreationDraft(view, queryClient)
  fireEvent.click(view.getByRole("button", { name: distanceCopy.place }))
  const key = keys.imageDistanceDraft(image.caseId, image.id), before = structuredClone(queryClient.getQueryData(key))
  fireEvent.error(view.getByRole("img"))
  await view.findByText(messages.cases.workspace.preview.error)
  assert.ok(view.container.querySelector("[data-image-viewer] [data-distance-controls]"))
  assert.equal(view.getByRole("button", { name: distanceCopy.save, exact: true }).disabled, true)
  assert.deepEqual(queryClient.getQueryData(key), before)
  const cancel = view.getByRole("button", { name: distanceCopy.cancelEditing })
  assert.equal(cancel.disabled, false)
  fireEvent.click(cancel)
  assert.equal(queryClient.getQueryData(key), null)
  assert.equal(view.container.querySelector("[data-distance-controls]"), null)
  assert.equal(server.calls.some(call => call.method !== "GET"), false)
})

test("distance layers hide only the canvas value, keep dynamic values in the panel and survive a workspace remount", async () => {
  const server = backend(), queryClient = client()
  server.persisted = editableDistancesPlan(); globalThis.fetch = server.fetch
  const before = structuredClone(server.persisted)
  let view = render(h(Workspace, { queryClient }))
  await editFirstDistance(view)
  const id = before.document.objects[0].id
  const row = () => view.container.querySelector(`[data-distance-row="${id}"]`)
  assert.equal(row().classList.contains("bg-muted"), false)
  assert.equal(row().querySelector('[id$="-value"]').textContent, "123,46 mm")
  const hide = view.getByRole("button", { name: distanceCopy.hideValue, exact: true })
  assert.equal(hide.getAttribute("aria-pressed"), "true")
  fireEvent.click(hide)
  assert.ok(!view.container.querySelector(`[data-distance-id="${id}"] text`))
  assert.ok(view.container.querySelector("[data-distance-draft] line"))
  assert.equal(row().querySelector('[id$="-value"]').textContent, "123,46 mm")
  fireEvent.keyDown(view.getByRole("button", { name: distanceCopy.targets.end, exact: true }), { key: "ArrowRight", shiftKey: true })
  const draft = structuredClone(queryClient.getQueryData(keys.imageDistanceDraft(image.caseId, image.id)))
  const value = row().querySelector('[id$="-value"]').textContent
  assert.notEqual(value, "123,46 mm"); assert.notEqual(value, "—")
  assert.ok(!view.container.querySelector(`[data-distance-id="${id}"] text`))
  view.unmount()
  view = render(h(Workspace, { queryClient }))
  await openSavedDistances(view)
  assert.ok(view.getByRole("button", { name: distanceCopy.showValue, exact: true }))
  assert.ok(!view.container.querySelector(`[data-distance-id="${id}"] text`))
  assert.deepEqual(queryClient.getQueryData(keys.imageDistanceDraft(image.caseId, image.id)), draft)
  fireEvent.click(view.getByRole("button", { name: distanceCopy.showValue, exact: true }))
  assert.equal(view.container.querySelector(`[data-distance-id="${id}"] text`).textContent, value)
  assert.equal(row().querySelector('[id$="-value"]').textContent, value)
  assert.deepEqual(server.persisted, before)
  assert.equal(server.calls.some(call => call.method !== "GET"), false)
  view.unmount()
  view = render(h(Workspace, { queryClient: client() }))
  fireEvent.click((await openSavedDistances(view)).querySelector("[data-distance-row]"))
  assert.ok(view.getByRole("button", { name: distanceCopy.hideValue, exact: true }))
  assert.ok(view.container.querySelector(`[data-distance-id="${id}"] text`))
})

async function openDistanceDeletion(view) {
  fireEvent.click(view.getByRole("button", { name: distanceCopy.deleteAction, exact: true }))
  return within(await view.findByRole("alertdialog", { name: distanceCopy.deleteTitle }))
}

test("distance deletion cancels without losing edits, then removes only its saved LINE after one confirmed command", async () => {
  const server = backend(), queryClient = client(), notices = distanceNotices(), entered = deferred(), barrier = deferred()
  server.persisted = editableDistancesPlan()
  const before = structuredClone(server.persisted), id = before.document.objects[0].id
  let writes = 0
  globalThis.fetch = async (url, init) => {
    if (init?.method === "PATCH") { writes++; entered.resolve(); await barrier.promise }
    return server.fetch(url, init)
  }
  const view = render(h(Workspace, { queryClient }))
  try {
    await editFirstDistance(view)
    fireEvent.keyDown(view.getByRole("button", { name: distanceCopy.targets.start, exact: true }), { key: "ArrowRight" })
    const key = keys.imageDistanceDraft(image.caseId, image.id), draft = structuredClone(queryClient.getQueryData(key))
    let dialog = await openDistanceDeletion(view)
    assert.ok(dialog.getByText(distanceCopy.deleteUnsavedDescription))
    fireEvent.click(dialog.getByRole("button", { name: distanceCopy.cancelDeletion, exact: true }))
    assert.ok(!view.queryByRole("alertdialog"))
    assert.deepEqual(queryClient.getQueryData(key), draft)
    assert.equal(writes, 0)
    dialog = await openDistanceDeletion(view)
    const confirm = dialog.getByRole("button", { name: distanceCopy.deleteAction, exact: true })
    act(() => { fireEvent.click(confirm); fireEvent.click(confirm) })
    await entered.promise
    assert.equal(writes, 1)
    assert.equal(queryClient.getQueryData(key).kind, "distance-delete")
    assert.ok(view.container.querySelector(`[data-distance-id="${id}"] line`))
    assert.equal(dialog.getByRole("button", { name: distanceCopy.cancelDeletion, exact: true }).disabled, true)
    const unload = new dom.window.Event("beforeunload", { cancelable: true }); window.dispatchEvent(unload)
    assert.equal(unload.defaultPrevented, true)
    await act(async () => { barrier.resolve() })
    await waitFor(() => assert.ok(!view.queryByRole("alertdialog")))
    assert.deepEqual(server.persisted.document.objects, before.document.objects.filter(object => object.id !== id))
    assert.deepEqual(server.persisted.document.calibration, before.document.calibration)
    assert.equal(server.calls.filter(call => call.method === "PATCH").length, 1)
    assert.deepEqual(server.calls.find(call => call.method === "PATCH").body, { kind: "distance-delete", baseRevision: before.revision, id })
    assert.ok(!view.container.querySelector(`[data-distance-id="${id}"]`))
    assert.equal(queryClient.getQueryData(key), null)
    assert.equal(notices.filter(item => item.title === distanceCopy.deletedTitle).length, 1)
  } finally { barrier.resolve() }
})

test("distance deletion restores an uncertain command after remount and only checks by GET", async () => {
  const server = backend(), queryClient = client(), notices = distanceNotices()
  server.persisted = editableDistancesPlan()
  const id = server.persisted.document.objects[0].id
  let written = false, confirmRead = false
  globalThis.fetch = async (url, init) => {
    if (written && !confirmRead && url.endsWith("/plan") && init?.method !== "PATCH") throw new TypeError("synthetic read unavailable")
    const response = await server.fetch(url, init)
    if (init?.method === "PATCH") { written = true; throw new TypeError("synthetic lost response") }
    return response
  }
  let view = render(h(Workspace, { queryClient }))
  await editFirstDistance(view)
  let dialog = await openDistanceDeletion(view)
  fireEvent.click(dialog.getByRole("button", { name: distanceCopy.deleteAction, exact: true }))
  await dialog.findByRole("button", { name: distanceCopy.checkDeletion, exact: true })
  assert.equal(dialog.getByRole("button", { name: distanceCopy.cancelDeletion, exact: true }).disabled, true)
  assert.ok(view.container.querySelector(`[data-distance-id="${id}"] line`))
  assert.equal(server.calls.filter(call => call.method === "PATCH").length, 1)
  view.unmount()
  view = render(h(Workspace, { queryClient }))
  dialog = within(await view.findByRole("alertdialog", { name: distanceCopy.deleteTitle }))
  await waitFor(() => assert.ok(view.container.querySelector("img")))
  fireEvent.load(view.container.querySelector("img"))
  assert.equal(view.container.querySelector('nav button[aria-pressed="true"]').getAttribute("aria-label"), toolsCopy.title)
  confirmRead = true
  fireEvent.click(dialog.getByRole("button", { name: distanceCopy.checkDeletion, exact: true }))
  await waitFor(() => assert.ok(!view.queryByRole("alertdialog")))
  assert.ok(!view.container.querySelector(`[data-distance-id="${id}"]`))
  assert.equal(server.calls.filter(call => call.method === "PATCH").length, 1)
  assert.equal(server.calls.at(-1).method, "GET")
  assert.ok(notices.some(item => item.kind === "info" && item.title === distanceCopy.alreadyRemovedTitle))
  assert.equal(notices.some(item => item.title === distanceCopy.deletedTitle), false)
})

for (const removed of [false, true]) test(`distance deletion handles a revision conflict when the LINE is ${removed ? "already removed" : "still present"}`, async () => {
  const server = backend(), queryClient = client(), notices = distanceNotices()
  server.persisted = editableDistancesPlan()
  const id = server.persisted.document.objects[0].id
  globalThis.fetch = async (url, init) => {
    if (init?.method === "PATCH") {
      server.calls.push({ url, method: "PATCH", body: JSON.parse(init.body) })
      server.persisted = { ...server.persisted, revision: server.persisted.revision + 1,
        document: { ...server.persisted.document, objects: server.persisted.document.objects.filter(object => !removed || object.id !== id) } }
      return Response.json({ error: { code: "PLAN_REVISION_CONFLICT", uncertain: false, currentRevision: server.persisted.revision } }, { status: 409 })
    }
    return server.fetch(url, init)
  }
  const view = render(h(Workspace, { queryClient }))
  await editFirstDistance(view)
  const dialog = await openDistanceDeletion(view)
  fireEvent.click(dialog.getByRole("button", { name: distanceCopy.deleteAction, exact: true }))
  if (removed) {
    await waitFor(() => assert.ok(!view.queryByRole("alertdialog")))
    assert.ok(notices.some(item => item.kind === "info" && item.title === distanceCopy.alreadyRemovedTitle))
  } else {
    fireEvent.click(await dialog.findByRole("button", { name: distanceCopy.loadSaved, exact: true }))
    await waitFor(() => assert.ok(!view.queryByRole("alertdialog")))
    assert.ok(server.persisted.document.objects.some(object => object.id === id))
  }
  assert.equal(server.calls.filter(call => call.method === "PATCH").length, 1)
  assert.equal(notices.some(item => item.title === distanceCopy.deletedTitle), false)
  assert.equal(queryClient.getQueryData(keys.imageDistanceDraft(image.caseId, image.id)), null)
})

for (const retry of [false, true]) test(`distance deletion keeps a definitive failure until explicit ${retry ? "retry" : "cancellation"}`, async () => {
  const server = backend(), queryClient = client(), notices = distanceNotices()
  server.persisted = editableDistancesPlan()
  const before = structuredClone(server.persisted), id = before.document.objects[0].id
  let refused = true
  globalThis.fetch = async (url, init) => {
    if (init?.method === "PATCH" && refused) {
      server.calls.push({ url, method: "PATCH", body: JSON.parse(init.body) })
      return Response.json({ error: { code: "SERVICE_UNAVAILABLE", uncertain: false } }, { status: 503 })
    }
    return server.fetch(url, init)
  }
  const view = render(h(Workspace, { queryClient }))
  await editFirstDistance(view)
  const dialog = await openDistanceDeletion(view)
  fireEvent.click(dialog.getByRole("button", { name: distanceCopy.deleteAction, exact: true }))
  await dialog.findByText(distanceCopy.deleteErrorDescription)
  await waitFor(() => assert.ok(notices.some(item => item.title === distanceCopy.deleteErrorTitle)))
  assert.deepEqual(server.persisted, before)
  assert.ok(view.container.querySelector(`[data-distance-id="${id}"] line`))
  assert.equal(server.calls.filter(call => call.method === "PATCH").length, 1)
  if (retry) {
    refused = false
    fireEvent.click(dialog.getByRole("button", { name: distanceCopy.deleteAction, exact: true }))
    await waitFor(() => assert.ok(!view.queryByRole("alertdialog")))
    assert.ok(!server.persisted.document.objects.some(object => object.id === id))
    assert.equal(server.calls.filter(call => call.method === "PATCH").length, 2)
  } else {
    fireEvent.click(dialog.getByRole("button", { name: distanceCopy.cancelDeletion, exact: true }))
    assert.ok(!view.queryByRole("alertdialog"))
    assert.deepEqual(server.persisted, before)
    assert.equal(server.calls.filter(call => call.method === "PATCH").length, 1)
  }
  assert.equal(queryClient.getQueryData(keys.imageDistanceDraft(image.caseId, image.id)), null)
})

test("distance deletion observes a background removal before confirmation without issuing an empty write", async () => {
  const server = backend(), queryClient = client(), notices = distanceNotices()
  server.persisted = editableDistancesPlan(); globalThis.fetch = server.fetch
  const id = server.persisted.document.objects[0].id
  const view = render(h(Workspace, { queryClient }))
  await editFirstDistance(view)
  const dialog = await openDistanceDeletion(view)
  server.persisted = { ...server.persisted, revision: server.persisted.revision + 1,
    document: { ...server.persisted.document, objects: server.persisted.document.objects.filter(object => object.id !== id) } }
  await act(async () => { queryClient.setQueryData(keys.imagePlan(image.caseId, image.id), server.persisted) })
  fireEvent.click(dialog.getByRole("button", { name: distanceCopy.loadSaved, exact: true }))
  await waitFor(() => assert.ok(!view.queryByRole("alertdialog")))
  assert.equal(server.calls.some(call => call.method !== "GET"), false)
  assert.ok(notices.some(item => item.kind === "info" && item.title === distanceCopy.alreadyRemovedTitle))
})

test("distance values follow pointer previews and keyboard edits in both surfaces; cancellation restores and save uses the API result", async () => {
  const server = backend(), queryClient = client(), notices = distanceNotices()
  const official = distanceResultBackend(server, 37.512345)
  globalThis.fetch = (url, init) => init?.method === "PATCH" ? official(url, init) : server.fetch(url, init)
  const view = render(h(Workspace, { queryClient }))
  await editingWorkspace(view)
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.calibration.remote.save, exact: true }))
  await view.findByText(distanceCopy.editingSaved)
  const id = server.persisted.document.objects[0].id, key = keys.imageDistanceDraft(image.caseId, image.id)
  const calibration = structuredClone(server.persisted.document.calibration)
  const original = structuredClone(queryClient.getQueryData(key)), viewport = distanceRect(view)
  const values = (expected, preview = false) => {
    const overlay = view.container.querySelector(`[data-distance-id="${id}"]`)
    const row = view.container.querySelector(`[data-distance-row="${id}"]`)
    assert.equal(overlay.querySelector("text").textContent, expected)
    assert.equal(row.querySelector('[id$="-value"]').textContent, expected)
    assert.equal(overlay.hasAttribute("data-distance-preview"), preview)
    assert.equal(row.hasAttribute("data-distance-preview"), preview)
  }
  values("25,00 mm")
  for (const cancel of ["Escape", "pointercancel", "lostpointercapture"]) {
    viewerPointer(viewport, "pointerdown", 700, 350)
    viewerPointer(viewport, "pointermove", 900, 350)
    values("50,00 mm", true)
    assert.ok(view.container.querySelector(`[data-distance-id="${id}"] text`).parentElement.getAttribute("transform").startsWith("translate(1200 500)"))
    assert.deepEqual(queryClient.getQueryData(key), original)
    assert.equal(hasImagePlanDraft(queryClient, image.caseId, image.id), false)
    viewerPointer(viewport, "pointermove", 800, 350)
    values("37,50 mm", true)
    if (cancel === "Escape") fireEvent.keyDown(viewport, { key: "Escape" })
    else viewerPointer(viewport, cancel, 800, 350)
    viewerPointer(viewport, "pointerup", 900, 350)
    values("25,00 mm")
    assert.deepEqual(queryClient.getQueryData(key), original)
  }
  viewerPointer(viewport, "pointerdown", 700, 350)
  viewerPointer(viewport, "pointermove", 900, 350)
  values("50,00 mm", true)
  viewerPointer(viewport, "pointerup", 900, 350)
  await waitFor(() => values("50,00 mm", true))
  fireEvent.keyDown(view.getByRole("button", { name: distanceCopy.targets.end, exact: true }), { key: "ArrowRight", shiftKey: true })
  values("50,63 mm", true)
  assert.equal(server.persisted.document.objects[0].measurement.values.length, 25)
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 1)
  assert.equal(server.calls.some(call => call.method === "PATCH"), false)
  fireEvent.click(view.getByRole("button", { name: distanceCopy.cancelEditing }))
  assert.ok(!view.container.querySelector("[data-distance-overlay]"))
  assert.ok(!view.container.querySelector(`[data-distance-row="${id}"]`))
  fireEvent.click(view.getByRole("button", { name: distanceCopy.title, exact: true }))
  await view.findByText(distanceCopy.editingSaved)
  values("25,00 mm")
  viewerPointer(viewport, "pointerdown", 700, 350)
  viewerPointer(viewport, "pointermove", 900, 350)
  viewerPointer(viewport, "pointerup", 900, 350)
  await waitFor(() => values("50,00 mm", true))
  fireEvent.click(view.getByRole("button", { name: distanceCopy.update, exact: true }))
  await waitFor(() => assert.equal(notices.filter(item => item.kind === "success").length, 2))
  values("37,51 mm")
  const command = server.calls.find(call => call.method === "PATCH").body
  assert.deepEqual(Object.keys(command).sort(), ["baseRevision", "end", "id", "kind", "start"])
  assert.deepEqual(server.persisted.document.calibration, calibration)
  assert.equal(server.persisted.document.objects.length, 1)
  assert.equal(server.persisted.document.objects[0].id, id)
})

test("distance preview is unavailable after a newer plan revision and late pointer release cannot update its geometry", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await editingWorkspace(view)
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.calibration.remote.save, exact: true }))
  await view.findByText(distanceCopy.editingSaved)
  const id = server.persisted.document.objects[0].id, key = keys.imageDistanceDraft(image.caseId, image.id)
  const original = structuredClone(queryClient.getQueryData(key)), viewport = distanceRect(view)
  viewerPointer(viewport, "pointerdown", 700, 350)
  viewerPointer(viewport, "pointermove", 900, 350)
  assert.equal(view.container.querySelector(`[data-distance-row="${id}"] [id$="-value"]`).textContent, "50,00 mm")
  await act(async () => { queryClient.setQueryData(keys.imagePlan(image.caseId, image.id), current => ({ ...current, revision: current.revision + 1 })) })
  assert.equal(view.container.querySelector(`[data-distance-row="${id}"] [id$="-value"]`).textContent, "—")
  assert.ok(!view.container.querySelector("[data-distance-preview]"))
  viewerPointer(viewport, "pointerup", 900, 350)
  assert.deepEqual(queryClient.getQueryData(key), original)
  assert.equal(server.calls.filter(call => call.method !== "GET").length, 1)
})

test("recalibration retains its explicitly selected LINE after a definitive failure and remount before retry", async () => {
  const server = backend(), queryClient = client()
  server.persisted = editableDistancesPlan()
  const id = server.persisted.document.objects.filter(object => object.type === "LINE")[1].id
  const others = structuredClone(server.persisted.document.objects.filter(object => object.id !== id))
  let reject = true
  globalThis.fetch = async (url, init) => {
    if (init?.method === "PUT" && reject) {
      server.calls.push({ url, method: "PUT", body: JSON.parse(init.body) })
      return Response.json({ error: { code: "SERVICE_UNAVAILABLE", uncertain: false, retryable: true } }, { status: 503 })
    }
    return server.fetch(url, init)
  }
  let hook = renderHook(() => useImageCalibration(image, true, false), { wrapper: wrapper(queryClient) })
  await waitFor(() => assert.equal(hook.result.current.canEdit, true))
  act(() => hook.result.current.changeReference("35"))
  const name = index => distanceCopy.defaultName.replace("{index}", String(index))
  const input = hook.result.current.command(name, id)
  assert.equal(input.distanceId, id)
  await act(async () => { assert.equal((await hook.result.current.save.mutateAsync({ input })).phase, "error") })
  hook.unmount()
  hook = renderHook(() => useImageCalibration(image, true, false), { wrapper: wrapper(queryClient) })
  await waitFor(() => assert.equal(hook.result.current.canSave, true))
  const recovered = hook.result.current.command(name)
  assert.equal(recovered.distanceId, id)
  reject = false
  await act(async () => { assert.equal((await hook.result.current.save.mutateAsync({ input: recovered })).phase, "saved") })
  assert.equal(server.persisted.document.objects.length, 3)
  assert.deepEqual(server.persisted.document.objects.filter(object => object.id !== id), others)
  const line = server.persisted.document.objects.find(object => object.id === id)
  closePoint(line.start, server.persisted.document.calibration.start)
  closePoint(line.end, server.persisted.document.calibration.end)
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 2)
})

for (const kind of ["line", "circle"]) test(`calibration ${kind} and recalibration return to the same distance; reopening or dragging blank space cannot create another`, async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await editingWorkspace(view)
  if (kind === "circle") fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.calibration.circle, exact: true }))
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.calibration.remote.save, exact: true }))
  await view.findByText(distanceCopy.editingSaved)
  const key = keys.imageDistanceDraft(image.caseId, image.id), id = server.persisted.document.objects[0].id
  assert.equal(queryClient.getQueryData(key).kind, "distance-update")
  assert.equal(queryClient.getQueryData(key).id, id)
  assert.ok(!view.container.querySelector("[data-calibration-circle]"))
  const first = structuredClone(server.persisted.document.objects[0])
  await openCalibration(view)
  fireEvent.change(await referenceInput(view, kind === "line" ? "Comprimento real" : "Diâmetro real"), { target: { value: "35" } })
  const viewport = distanceRect(view)
  // Move the existing line/diameter instead of keeping the old geometry.
  viewerPointer(viewport, "pointerdown", 500, 350)
  viewerPointer(viewport, "pointermove", 550, 300)
  viewerPointer(viewport, "pointerup", 550, 300)
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.calibration.update, exact: true }))
  await view.findByText(distanceCopy.editingSaved)
  assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).getAttribute("aria-pressed"), "true")
  const plan = server.persisted, line = plan.document.objects[0], reference = plan.document.calibration
  assert.equal(plan.document.objects.length, 1)
  assert.equal(line.id, id)
  assert.notDeepEqual(line.start, first.start)
  closePoint(line.end, kind === "line" ? reference.end : reference.edge)
  closePoint(line.start, kind === "line" ? reference.start : { x: 2 * reference.center.x - reference.edge.x, y: 2 * reference.center.y - reference.edge.y })
  assert.equal(server.calls.filter(call => call.method === "PUT").at(-1).body.distanceId, id)
  assert.equal(view.container.querySelector(`[data-distance-id="${id}"] text`).textContent, "35,00 mm")
  assert.ok(!view.container.querySelector("[data-calibration-circle]"))
  assert.equal(hasImagePlanDraft(queryClient, image.caseId, image.id), false)
  const draft = structuredClone(queryClient.getQueryData(key))
  fireEvent.click(view.getByRole("button", { name: distanceCopy.title, exact: true }))
  viewerPointer(viewport, "pointerdown", 850, 150)
  viewerPointer(viewport, "pointermove", 1000, 250)
  viewerPointer(viewport, "pointerup", 1000, 250)
  assert.deepEqual(queryClient.getQueryData(key), draft)
  fireEvent.click(view.getByRole("button", { name: distanceCopy.cancelEditing }))
  fireEvent.click(view.getByRole("button", { name: distanceCopy.title, exact: true }))
  await view.findByText(distanceCopy.editingSaved)
  assert.equal(queryClient.getQueryData(key).kind, "distance-update")
  assert.equal(queryClient.getQueryData(key).id, id)
  assert.equal(server.persisted.document.objects.length, 1)
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 2)
  assert.equal(server.calls.some(call => call.method === "PATCH"), false)
})

test("line calibration handoff saves one independent distance, opens Tools with official mm and edits without changing scale", async () => {
  const server = backend(), queryClient = client(), notices = distanceNotices()
  const official = distanceResultBackend(server, 37.512345)
  globalThis.fetch = (url, init) => init?.method === "PATCH" ? official(url, init) : server.fetch(url, init)
  const view = render(h(Workspace, { queryClient }))
  await editingWorkspace(view)
  const saveCalibration = view.getByRole("button", { name: messages.cases.workspace.calibration.remote.save, exact: true })
  act(() => { fireEvent.click(saveCalibration); fireEvent.click(saveCalibration) })
  await waitFor(() => assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).getAttribute("aria-pressed"), "true"))
  await view.findByText(distanceCopy.editingSaved)
  const line = server.persisted.document.objects[0], id = line.id
  const calibration = structuredClone(server.persisted.document.calibration)
  const command = server.calls.find(call => call.method === "PUT").body
  assert.equal(command.initialDistance.id, id)
  closePoint(line.start, calibration.start); closePoint(line.end, calibration.end)
  assert.equal(line.measurement.values.length, 25)
  assert.equal(view.container.querySelector(`[data-distance-id="${id}"] text`).textContent, "25,00 mm")
  assert.ok(!view.container.querySelector(`[data-distance-id="${id}"] line`))
  assert.ok(view.container.querySelector("[data-distance-draft] line"))
  assert.equal(view.getByRole("button", { name: distanceCopy.update, exact: true }).disabled, true)
  assert.equal(hasImagePlanDraft(queryClient, image.caseId, image.id), false)
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 1)
  assert.equal(server.calls.filter(call => call.method === "PATCH").length, 0)
  assert.equal(notices.filter(item => item.kind === "success").length, 1)
  const viewport = distanceRect(view)
  await waitFor(() => assert.ok(document.activeElement === viewport))
  viewerPointer(viewport, "pointerdown", 500, 350)
  viewerPointer(viewport, "pointermove", 520, 360)
  assert.equal(view.container.querySelector(`[data-distance-id="${id}"] text`).textContent, "22,53 mm")
  viewerPointer(viewport, "pointercancel", 520, 360)
  assert.equal(view.container.querySelector(`[data-distance-id="${id}"] text`).textContent, "25,00 mm")
  fireEvent.keyDown(view.getByRole("button", { name: distanceCopy.targets.end, exact: true }), { key: "ArrowRight", shiftKey: true })
  assert.equal(view.container.querySelector(`[data-distance-id="${id}"] text`).textContent, "25,63 mm")
  fireEvent.click(view.getByRole("button", { name: distanceCopy.update, exact: true }))
  await waitFor(() => assert.equal(notices.filter(item => item.kind === "success").length, 2))
  assert.equal(view.container.querySelector(`[data-distance-id="${id}"] text`).textContent, "37,51 mm")
  assert.deepEqual(server.persisted.document.calibration, calibration)
  assert.equal(server.persisted.document.objects.length, 1)
  assert.equal(server.persisted.document.objects[0].id, id)
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 1)
  assert.equal(server.calls.filter(call => call.method === "PATCH").length, 1)
})

test("line calibration handoff reuses the captured seed on GET confirmation and only opens Tools after both effects exist", async () => {
  const server = backend(), queryClient = client()
  let written = false, verify = false
  globalThis.fetch = async (url, init) => {
    if (written && !verify && url.endsWith("/plan") && init?.method !== "PUT") {
      server.calls.push({ url, method: "GET" }); return Response.json(initial)
    }
    const response = await server.fetch(url, init)
    if (init?.method === "PUT") { written = true; throw new TypeError("synthetic lost acknowledgement") }
    return response
  }
  const view = render(h(Workspace, { queryClient }))
  await editingWorkspace(view)
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.calibration.remote.save, exact: true }))
  await view.findByText(messages.cases.workspace.calibration.remote.uncertain)
  assert.equal(view.getByRole("button", { name: imageCopy.title, exact: true }).getAttribute("aria-pressed"), "true")
  const id = server.persisted.document.objects[0].id
  verify = true
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.calibration.remote.check, exact: true }))
  await view.findByText(distanceCopy.editingSaved)
  assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).getAttribute("aria-pressed"), "true")
  assert.equal(queryClient.getQueryData(keys.imageDistanceDraft(image.caseId, image.id)).id, id)
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 1)
  assert.equal(server.calls.some(call => call.method === "PATCH"), false)
})

test("calibration handoff preserves ambiguous legacy distances and circle hides its ring in Tools", async () => {
  const server = backend(), queryClient = client()
  server.persisted = savedDistancesPlan(); globalThis.fetch = server.fetch
  const before = structuredClone(server.persisted.document.objects)
  const view = render(h(Workspace, { queryClient }))
  await openCalibration(view)
  fireEvent.change(await referenceInput(view, "Comprimento real"), { target: { value: "35" } })
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.calibration.update, exact: true }))
  await waitFor(() => assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).getAttribute("aria-pressed"), "true"))
  assert.equal("initialDistance" in server.calls.find(call => call.method === "PUT").body, false)
  assert.deepEqual(server.persisted.document.objects, before)
  await openCalibration(view)
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.calibration.circle, exact: true }))
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.calibration.update, exact: true }))
  await waitFor(() => assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).getAttribute("aria-pressed"), "true"))
  assert.ok(!view.container.querySelector("[data-calibration-circle]"))
  assert.equal(server.persisted.document.calibration.kind, "REFERENCE_CIRCLE")
  assert.deepEqual(server.persisted.document.objects, before)
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 2)
  assert.equal(server.calls.some(call => call.method === "PATCH"), false)
})

test("line calibration handoff rejects a full plan without a partial save and explains the limit", async () => {
  const server = backend(), queryClient = client(), notices = distanceNotices()
  const saved = savedDistancesPlan(), angle = saved.document.objects[1]
  saved.document.objects = Array.from({ length: 500 }, (_, i) => ({ ...angle, id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}` }))
  server.persisted = saved; globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await openCalibration(view)
  fireEvent.change(await referenceInput(view, "Comprimento real"), { target: { value: "35" } })
  const key = keys.imageCalibrationDraft(image.caseId, image.id), before = structuredClone(queryClient.getQueryData(key))
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.calibration.update, exact: true }))
  assert.equal(notices.length, 1)
  assert.equal(notices[0].title, messages.cases.workspace.calibration.remote.distanceLimitTitle)
  assert.deepEqual(queryClient.getQueryData(key), before)
  assert.equal(server.calls.some(call => call.method !== "GET"), false)
  assert.equal(server.persisted.document.objects.length, 500)
})

test("line calibration handoff does not choose arbitrarily between matching saved distances", async () => {
  const server = backend(), queryClient = client()
  server.persisted = savedDistancesPlan()
  for (const object of server.persisted.document.objects.filter(object => object.type === "LINE")) {
    object.start = { ...server.persisted.document.calibration.start }; object.end = { ...server.persisted.document.calibration.end }
  }
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await openCalibration(view)
  fireEvent.change(await referenceInput(view, "Comprimento real"), { target: { value: "35" } })
  fireEvent.click(view.getByRole("button", { name: messages.cases.workspace.calibration.update, exact: true }))
  await waitFor(() => assert.equal(view.getByRole("button", { name: toolsCopy.title, exact: true }).getAttribute("aria-pressed"), "true"))
  assert.ok(view.container.querySelector("[data-distance-controls]"))
  assert.ok(!view.queryByRole("group", { name: distanceCopy.adjustTarget, exact: true }))
  assert.equal(queryClient.getQueryData(keys.imageDistanceDraft(image.caseId, image.id)), null)
  assert.equal(view.container.querySelectorAll("[data-distance-row][aria-pressed=true]").length, 0)
  assert.equal(server.persisted.document.objects.length, 3)
})
