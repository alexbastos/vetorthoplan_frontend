import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { registerHooks } from "node:module"
import test, { after, afterEach } from "node:test"
import ts from "typescript"
import { JSDOM } from "jsdom"
import { imagePlanFixture } from "./fixtures/image-plan.mjs"

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:3000" })
for (const name of ["window", "document", "navigator", "HTMLElement", "Element", "HTMLInputElement", "MutationObserver", "getComputedStyle", "Node", "NodeFilter", "CustomEvent"])
  Object.defineProperty(globalThis, name, { configurable: true, value: name === "getComputedStyle" ? dom.window[name].bind(dom.window) : dom.window[name] })
globalThis.IS_REACT_ACT_ENVIRONMENT = true
globalThis.requestAnimationFrame = callback => setTimeout(callback, 0)
globalThis.cancelAnimationFrame = clearTimeout
globalThis.ResizeObserver = class { constructor(callback) { this.callback = callback } observe() { this.callback([{ contentRect: { width: 1000, height: 700 } }]) } disconnect() {} }
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
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query")
const { NextIntlClientProvider } = await import("next-intl")
const { UnsavedChangesGuard } = await import("../src/components/shared/app-shell/unsaved-changes-guard.tsx")
const { CaseImageWorkspace } = await import("../src/features/cases/components/case-image-workspace.tsx")
const { useImageCalibration } = await import("../src/features/cases/hooks/use-image-calibration.ts")
const { casesQueryKeys: keys } = await import("../src/features/cases/hooks/cases-query-keys.ts")
const messages = { cases: JSON.parse(readFileSync(new URL("../src/i18n/messages/pt-BR/cases.json", import.meta.url), "utf8")),
  common: JSON.parse(readFileSync(new URL("../src/i18n/messages/pt-BR/common.json", import.meta.url), "utf8")) }
const h = React.createElement
const f = imagePlanFixture()
const initial = f.publicPlan(f.initial)
const image = { id: f.identity.imageId, caseId: f.caseId, status: "READY", kind: "PNG", widthPx: 2000, heightPx: 1000,
  previewAvailable: true, previewWidthPx: 1600, previewHeightPx: 800, pixelSpacingMm: null, imagerPixelSpacingMm: null,
  originalFilename: "reference.png", displayName: null }
const clients = new Set(), originalFetch = globalThis.fetch
afterEach(() => { cleanup(); for (const client of clients) client.clear(); clients.clear(); globalThis.fetch = originalFetch })
after(() => dom.window.close())
function client() { const value = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } }); clients.add(value); return value }
function wrapper(queryClient) { return ({ children }) => h(QueryClientProvider, { client: queryClient }, children) }
const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes }); return { promise, resolve } }
function backend() {
  let persisted = initial
  const calls = []
  return { calls, get persisted() { return persisted }, set persisted(value) { persisted = value },
    fetch: async (url, init = {}) => {
      calls.push({ url, method: init.method ?? "GET", body: init.body ? JSON.parse(init.body) : undefined })
      if (url.endsWith("/preview")) return Response.json({ url: "https://storage.example/preview.png", mediaType: "image/png", widthPx: 1600, heightPx: 800, expiresAt: new Date(Date.now() + 600000).toISOString() })
      if (init.method !== "PUT") return Response.json(persisted)
      const input = JSON.parse(init.body), calibration = input.calibration
      const length = calibration.kind === "REFERENCE_LINE"
        ? Math.hypot((calibration.end.x - calibration.start.x) * 2000, (calibration.end.y - calibration.start.y) * 1000)
        : 2 * Math.hypot((calibration.edge.x - calibration.center.x) * 2000, (calibration.edge.y - calibration.center.y) * 1000)
      persisted = { ...initial, revision: input.baseRevision + 1, updatedAt: "2026-10-26T15:00:00Z", document: { ...initial.document,
        calibration: { ...calibration, result: { calibration_id: "b".repeat(64), reference_length_px: length, mm_per_pixel: (calibration.known_length_mm ?? calibration.known_diameter_mm) / length } } } }
      return Response.json(persisted)
    } }
}
function Workspace({ queryClient, selected = image }) {
  const [section, setSection] = React.useState("images")
  return h(QueryClientProvider, { client: queryClient }, h(NextIntlClientProvider, { locale: "pt-BR", timeZone: "UTC", messages },
    h(UnsavedChangesGuard, null, h(CaseImageWorkspace, { key: selected.id, image: selected, activeSection: section, onSectionChange: setSection,
      caseContext: "Case details", imageList: "Image list", imageActions: null, caseLocked: false }))))
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

test("the ruler waits for image decoding; creation saves millimetres and keeps its persisted marker visible outside calibration", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  const ruler = view.getByRole("button", { name: "Calibrar imagem" })
  assert.equal(ruler.disabled, true)
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  await waitFor(() => assert.equal(ruler.disabled, false))
  fireEvent.click(ruler)
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
  await waitFor(() => assert.ok(view.queryByText("Escala salva")))
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 1)
  const sent = server.calls.find(call => call.method === "PUT").body
  assert.equal(sent.calibration.known_length_mm, 25)
  assert.equal(sent.calibration.start.x, 0.405)
  assert.equal(sent.calibration.result, undefined)
  fireEvent.click(view.getByRole("button", { name: "Caso", exact: true }))
  assert.ok(viewport.querySelector("svg line"), "saved overlay stays visible")
  assert.equal(view.queryByRole("button", { name: "Marcar referência" }), null)
  view.unmount()
  queryClient.clear()
  const reopened = render(h(Workspace, { queryClient }))
  await waitFor(() => assert.ok(reopened.queryByRole("img")))
  fireEvent.load(reopened.getByRole("img"))
  await waitFor(() => assert.ok(reopened.container.querySelector("[data-calibration-viewport] svg line")))
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 1)
})

test("the ruler is the default control and saves centimetres as millimetres without requiring typing", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  fireEvent.click(view.getByRole("button", { name: "Calibrar imagem" }))
  const ruler = await view.findByRole("slider", { name: "Comprimento real" })
  assert.equal(view.queryByRole("textbox"), null)
  assert.equal(view.queryByText(messages.cases.workspace.calibration.description), null)
  assert.equal(view.container.querySelector("details"), null)
  assert.equal(view.queryByRole("tooltip"), null)
  fireEvent.click(view.getByRole("button", { name: "Posicionar referência" }))
  assert.equal(view.queryByRole("alert"), null, "placing a marker before choosing a size is an incomplete draft, not an error")
  fireEvent.change(ruler, { target: { value: "2.5" } })
  fireEvent.click(view.getByRole("button", { name: "Salvar calibração" }))
  await waitFor(() => assert.ok(view.queryByText("Escala salva")))
  assert.equal(server.persisted.document.calibration.known_length_mm, 25)
  fireEvent.click(view.getByRole("button", { name: "Outro valor" }))
  assert.equal(view.getByRole("textbox", { name: "Comprimento real" }).value, "25")
  await chooseUnit(view, "cm")
  fireEvent.click(view.getByRole("button", { name: "Outro valor" }))
  assert.equal(view.getByRole("button", { name: "Atualizar calibração" }).disabled, true, "opening or closing typing does not dirty a saved calibration")
  fireEvent.change(ruler, { target: { value: "3" } })
  fireEvent.click(view.getByRole("button", { name: "Atualizar calibração" }))
  await waitFor(() => assert.equal(server.persisted.document.calibration.known_length_mm, 30))
})

test("a typed size beyond the ruler range reopens exactly and collapsing the input preserves it", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  fireEvent.click(view.getByRole("button", { name: "Calibrar imagem" }))
  fireEvent.change(await referenceInput(view, "Comprimento real"), { target: { value: "123,456" } })
  fireEvent.click(view.getByRole("button", { name: "Posicionar referência" }))
  fireEvent.click(view.getByRole("button", { name: "Outro valor" }))
  fireEvent.click(view.getByRole("button", { name: "Salvar calibração" }))
  await waitFor(() => assert.ok(view.queryByText("Escala salva")))
  assert.equal(server.persisted.document.calibration.known_length_mm, 123.456)
  view.unmount(); queryClient.clear()
  const reopened = render(h(Workspace, { queryClient }))
  await waitFor(() => assert.ok(reopened.queryByRole("img")))
  fireEvent.load(reopened.getByRole("img"))
  fireEvent.click(reopened.getByRole("button", { name: "Calibrar imagem" }))
  assert.equal((await reopened.findByRole("textbox", { name: "Comprimento real" })).value, "123.456")
  assert.equal(reopened.getByRole("button", { name: "Atualizar calibração" }).disabled, true)
})

test("calibration explanations open as tooltips by keyboard or tap without changing the draft", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  fireEvent.click(view.getByRole("button", { name: "Calibrar imagem" }))
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
  assert.equal(view.getByRole("button", { name: "Descartar ajustes" }).disabled, true)
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 0)
})

test("circle editing, invalid input, discard and preview renewal preserve the correct image draft", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  fireEvent.click(view.getByRole("button", { name: "Calibrar imagem" }))
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
  assert.equal(view.getByRole("textbox", { name: "Comprimento real" }).value, "")
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
  fireEvent.click(view.getByRole("button", { name: "Calibrar imagem" }))
  const input = await referenceInput(view, "Comprimento real")
  fireEvent.change(input, { target: { value: "50" } })
  const viewport = view.container.querySelector("[data-calibration-viewport]")
  view.getByRole("img").parentElement.getBoundingClientRect = () => ({ left: 100, top: 50, width: 1000, height: 500, right: 1100, bottom: 550 })
  fireEvent.pointerDown(viewport, { button: 0, clientX: 200, clientY: 150 })
  fireEvent.pointerMove(viewport, { clientX: 600, clientY: 350 })
  fireEvent.pointerUp(viewport, { clientX: 600, clientY: 350 })
  fireEvent.click(view.getByRole("button", { name: "Salvar calibração" }))
  await waitFor(() => assert.ok(view.queryByText("Escala salva")))
  const sent = server.calls.find(call => call.method === "PUT").body.calibration
  assert.deepEqual(sent.start, { x: 0.1, y: 0.2 })
  assert.deepEqual(sent.end, { x: 0.5, y: 0.6 })
  fireEvent.click(view.getByRole("button", { name: "Imagens", exact: true }))
  const line = viewport.querySelector("svg line").outerHTML
  fireEvent.pointerDown(viewport, { button: 0, clientX: 200, clientY: 150 })
  fireEvent.pointerUp(viewport, { clientX: 800, clientY: 400 })
  assert.equal(viewport.querySelector("svg line").outerHTML, line)
  assert.equal(server.calls.filter(call => call.method === "PUT").length, 1)
})

test("a circle saves its center and edge using the actual diameter and reopens as a circle", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  fireEvent.click(view.getByRole("button", { name: "Calibrar imagem" }))
  fireEvent.click(await view.findByRole("button", { name: "Círculo", exact: true }))
  fireEvent.change(await referenceInput(view, "Diâmetro real"), { target: { value: "20" } })
  fireEvent.click(view.getByRole("button", { name: "Posicionar referência" }))
  fireEvent.click(view.getByRole("button", { name: "Salvar calibração" }))
  await waitFor(() => assert.ok(view.queryByText("Escala salva")))
  assert.ok(Math.abs(server.persisted.document.calibration.result.reference_length_px - 200) < 1e-9)
  assert.ok(Math.abs(server.persisted.document.calibration.result.mm_per_pixel - 0.1) < 1e-12)
  assert.equal(server.persisted.document.calibration.known_diameter_mm, 20)
  view.unmount(); queryClient.clear()
  const reopened = render(h(Workspace, { queryClient }))
  await waitFor(() => assert.ok(reopened.queryByRole("img")))
  fireEvent.load(reopened.getByRole("img"))
  fireEvent.click(reopened.getByRole("button", { name: "Calibrar imagem" }))
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
  fireEvent.click(view.getByRole("button", { name: "Calibrar imagem" }))
  fireEvent.change(await referenceInput(view, "Comprimento real"), { target: { value: "25" } })
  fireEvent.click(view.getByRole("button", { name: "Posicionar referência" }))
  view.rerender(h(Workspace, { queryClient, selected: other }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
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
  fireEvent.click(view.getByRole("button", { name: "Calibrar imagem" }))
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
  const ruler = view.getByRole("button", { name: "Calibrar imagem" })
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
  fireEvent.click(view.getByRole("button", { name: "Calibrar imagem" }))
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
  await waitFor(() => assert.ok(view.queryByText("Escala salva")))
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
  fireEvent.click(view.getByRole("button", { name: "Calibrar imagem" }))
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
  await waitFor(() => assert.ok(view.queryByText("Escala salva")))
})

test("losing pointer capture cancels an unfinished reference instead of committing it on a late release", async () => {
  const server = backend(), queryClient = client()
  globalThis.fetch = server.fetch
  const view = render(h(Workspace, { queryClient }))
  await waitFor(() => assert.ok(view.queryByRole("img")))
  fireEvent.load(view.getByRole("img"))
  fireEvent.click(view.getByRole("button", { name: "Calibrar imagem" }))
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
