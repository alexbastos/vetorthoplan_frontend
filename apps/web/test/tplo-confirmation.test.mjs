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
globalThis.ResizeObserver = class { constructor(callback) { this.callback = callback } observe() { this.callback([{ contentRect: { width: 1000, height: 700 } }]) } disconnect() {} }
dom.window.PointerEvent = class extends dom.window.MouseEvent { constructor(type, init) { super(type, init); Object.defineProperties(this, {
  pointerId: { value: init.pointerId ?? 1 }, isPrimary: { value: init.isPrimary ?? true }, pointerType: { value: init.pointerType ?? "mouse" },
}) } }
const captures = new WeakMap()
dom.window.HTMLElement.prototype.setPointerCapture = function (id) { captures.set(this, id) }
dom.window.HTMLElement.prototype.hasPointerCapture = function (id) { return captures.get(this) === id }
dom.window.HTMLElement.prototype.releasePointerCapture = function () { captures.delete(this) }
dom.window.HTMLElement.prototype.scrollIntoView = function () {}
const originalFetch = globalThis.fetch
let transport = null
globalThis.fetch = async (url, init) => {
  assert.ok(transport && typeof url === "string" && /^\/api\/cases\//.test(url), "real network is forbidden")
  return transport(url, init)
}
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "next/image") return nextResolve("next/image.js", context)
  if (specifier.endsWith(".module.css")) return nextResolve(specifier, context)
  if (specifier.startsWith("@/")) {
    const url = new URL(`../src/${specifier.slice(2)}`, import.meta.url)
    try { return nextResolve(`${url.href}.tsx`, context) } catch { return nextResolve(`${url.href}.ts`, context) }
  }
  if (!context.parentURL?.includes("/node_modules/") && specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    try { return nextResolve(`${specifier}.ts`, context) } catch { return nextResolve(`${specifier}.tsx`, context) }
  }
  return nextResolve(specifier, context)
}, load(url, context, nextLoad) {
  if (url.endsWith(".module.css")) return { format: "module", shortCircuit: true, source: "export default new Proxy({}, { get: (_, key) => key })" }
  if (url.startsWith("file:") && url.endsWith(".tsx") && !url.includes("/node_modules/")) return { format: "module", shortCircuit: true,
    source: ts.transpileModule(readFileSync(new URL(url), "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText }
  return nextLoad(url, context)
} })
const React = await import("react"), h = React.createElement
const { render, fireEvent, cleanup, act, waitFor, within } = await import("@testing-library/react")
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query")
const { NextIntlClientProvider } = await import("next-intl")
const { UnsavedChangesGuard } = await import("../src/components/shared/app-shell/unsaved-changes-guard.tsx")
const { CaseImageWorkspace } = await import("../src/features/cases/components/case-image-workspace.tsx")
const { casesQueryKeys: keys } = await import("../src/features/cases/hooks/cases-query-keys.ts")
const { applyPlanCommand } = await import("../src/features/cases/schemas/image-plan-command.schema.ts")
const { tploDraftHasChanges } = await import("../src/features/cases/lib/tplo-draft.ts")
const { toast: notifications } = await import("../src/lib/notifications.ts")
const cases = JSON.parse(readFileSync(new URL("../src/i18n/messages/pt-BR/cases.json", import.meta.url), "utf8"))
const common = JSON.parse(readFileSync(new URL("../src/i18n/messages/pt-BR/common.json", import.meta.url), "utf8"))
const copy = cases.workspace.tplo, clients = new Set()
const caseId = "a4302086-7b81-482d-a11a-b9f4b29e11b1", imageId = "a4302086-7b81-482d-a11a-b9f4b29e11b0", objectId = "a4302086-7b81-482d-a11a-b9f4b29e11b2"
const calibrationId = "a".repeat(64), points = [{ x: 0.6, y: 0.5 }, { x: 0.5, y: 0.6 }, { x: 0.4, y: 0.5 }]
afterEach(() => { cleanup(); for (const client of clients) client.clear(); clients.clear(); transport = null })
after(() => { globalThis.fetch = originalFetch; dom.window.close() })

function confirmed(document) {
  return { ...document, objects: document.objects.map(object => {
    if (object.type !== "TPLO") return object
    const radius = Math.hypot((object.edge.x - object.center.x) * 1000, (object.edge.y - object.center.y) * 2000) * 0.1
    const matrix = object.rotation_degrees === 90 ? [[0, -1, 1500], [1, 0, 500]] : [[1, 0, 0], [0, 1, 0]]
    const simulation = object.fragment ? { status: "SIMULATED", calibration_id: calibrationId, affine_matrix: matrix,
      transformed_fragment_points_px: object.fragment.points.map(({ x, y }) => ({ x: matrix[0][0] * x * 1000 + matrix[0][1] * y * 2000 + matrix[0][2], y: matrix[1][0] * x * 1000 + matrix[1][1] * y * 2000 + matrix[1][2] })) }
      : { status: "FRAGMENT_REQUIRED", calibration_id: calibrationId }
    return { ...object, measurement: { status: "CALCULATED", calibration_id: calibrationId, values: { radius, rotation: object.rotation_degrees }, units: { radius: "mm", rotation: "degrees" } }, simulation }
  }) }
}
function environment({ creating = false, fragment = { points }, rotation = 90, selectedImageId = imageId } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity, refetchOnMount: false, refetchOnReconnect: false }, mutations: { retry: false, gcTime: 0 } } }); clients.add(client)
  const image = { id: selectedImageId, caseId, status: "READY", kind: "PNG", widthPx: 1000, heightPx: 2000,
    originalFilename: "local.png", displayName: null, previewAvailable: true, previewWidthPx: 1000, previewHeightPx: 2000 }
  const object = { id: objectId, type: "TPLO", center: { x: 0.5, y: 0.5 }, edge: { x: 0.6, y: 0.5 }, rotation_degrees: rotation, fragment, label: "TPLO fixture", visible: true, locked: false }
  const document = { schema_version: 1, calibration: { kind: "REFERENCE_LINE", start: { x: 0.1, y: 0.1 }, end: { x: 0.2, y: 0.1 }, known_length_mm: 10,
    result: { calibration_id: calibrationId, reference_length_px: 100, mm_per_pixel: 0.1 } }, objects: creating ? [] : [object],
    tplo: { laterality: "LEFT", projection: "MEDIOLATERAL", blade_diameter_mm: 24, image_quality: "LIMITED", eligibility: "PENDING" } }
  const plan = { imageId: selectedImageId, revision: 4, updatedAt: "2026-11-18T12:00:00Z", document: confirmed(document) }
  const draft = { kind: creating ? "tplo-create" : "tplo-update", id: objectId, baseRevision: 4, center: object.center, edge: object.edge,
    rotation_degrees: rotation, fragment, fragmentComplete: true, ...(creating ? { label: "TPLO fixture" } : {}) }
  client.setQueryData(keys.imagePlan(caseId, selectedImageId), plan)
  client.setQueryData(keys.imageTploDraft(caseId, selectedImageId), draft)
  client.setQueryData(keys.imageTploEditorUi(caseId, selectedImageId), { selectedId: objectId, activePoint: null, activeVertex: null, area: "body", detailsExpanded: false, comparison: "original" })
  client.setQueryData(keys.preview(caseId, selectedImageId), { url: "https://example.invalid/local-fixture.png", widthPx: 1000, heightPx: 2000, expiresAt: new Date(Date.now() + 600000).toISOString() })
  return { client, image, plan, draft }
}
function element(env) {
  return h(QueryClientProvider, { client: env.client }, h(NextIntlClientProvider, { locale: "pt-BR", messages: { cases, common }, timeZone: "UTC" },
    h(UnsavedChangesGuard, null, h(CaseImageWorkspace, { image: env.image, activeSection: "tools", onSectionChange() {}, caseContext: null, imageList: null, imageActions: null, caseLocked: env.caseLocked ?? false }))))
}
async function mount(env) {
  const view = render(element(env))
  fireEvent.load(view.getByRole("img"))
  view.getByRole("img").parentElement.getBoundingClientRect = () => ({ left: 100, top: 50, width: 400, height: 800, right: 500, bottom: 850 })
  await waitFor(() => assert.equal(view.getByLabelText(copy.placement.diameter).disabled, false))
  return { ...view, ...env, draftNow: () => env.client.getQueryData(keys.imageTploDraft(caseId, env.image.id)) }
}
function applyRotation(view, degrees) {
  const details = view.getByLabelText(copy.simulation.rotationInput).closest("details")
  if (details && !details.open) fireEvent.click(details.querySelector("summary"))
  fireEvent.change(view.getByLabelText(copy.simulation.rotationInput), { target: { value: String(degrees) } })
  fireEvent.submit(view.getByLabelText(copy.simulation.rotationInput).closest("form"))
}
function server(env, mode = "success") {
  let saved = env.plan
  const calls = []
  transport = async (url, init) => {
    assert.ok(url === `/api/cases/${caseId}/images/${env.image.id}/plan/edits` || url === `/api/cases/${caseId}/images/${env.image.id}/plan`)
    calls.push({ method: init.method, body: init.body ? JSON.parse(init.body) : undefined })
    if (init.method === "GET") return Response.json(saved)
    assert.equal(init.method, "PATCH")
    const command = JSON.parse(init.body)
    if (mode === "conflict") {
      saved = { ...env.plan, revision: 5 }
      return Response.json({ error: { code: "PLAN_REVISION_CONFLICT", currentRevision: 5 } }, { status: 409 })
    }
    if (mode === "review") return Response.json({ error: { code: "CLINICAL_VALIDATION_INVALID" } }, { status: 422 })
    if (mode === "uncertain") throw Error("no observed result yet")
    saved = { ...env.plan, revision: 5, document: confirmed(applyPlanCommand(env.plan.document, command)) }
    if (mode === "lost") throw Error("response lost after commit")
    return Response.json(saved)
  }
  return { calls, setSaved: value => { saved = value } }
}

test("stage 11: creation saves a null fragment once and reopens a clean selected editor with official values", async () => {
  const env = environment({ creating: true, fragment: null, rotation: 0 }), backend = server(env), view = await mount(env)
  const save = view.getByRole("button", { name: copy.geometry.save, exact: true })
  assert.equal(save.disabled, false)
  fireEvent.click(save); fireEvent.click(save)
  await waitFor(() => assert.equal(view.draftNow()?.kind, "tplo-update"))
  assert.equal(view.draftNow().baseRevision, 5)
  assert.equal(tploDraftHasChanges(view.draftNow(), env.client.getQueryData(keys.imagePlan(caseId, imageId))), false)
  assert.equal(view.draftNow().fragment, null)
  assert.deepEqual(backend.calls.map(call => call.method), ["PATCH"])
  assert.equal(backend.calls[0].body.fragment, null)
  assert.ok(!("measurement" in backend.calls[0].body) && !("simulation" in backend.calls[0].body))
  assert.equal(view.container.querySelector("[data-tplo-values]").getAttribute("data-tplo-value-source"), "official")
  assert.equal(view.getByRole("button", { name: copy.simulation.simulated, exact: true }).disabled, true)
  assert.ok(view.queryByRole("button", { name: copy.geometry.update, exact: true }) === null)
  assert.equal(env.client.getQueryData(keys.imageTploEditorUi(caseId, imageId)).selectedId, objectId)
})

test("stage 11: update is explicit, keeps original points and comparison, and adopts a confirmed simulation", async () => {
  const env = environment({ rotation: 0 }), backend = server(env), view = await mount(env)
  applyRotation(view, 90)
  await waitFor(() => assert.equal(view.draftNow().rotation_degrees, 90))
  assert.deepEqual(backend.calls, [])
  assert.equal(view.container.querySelector("[data-tplo-values]").getAttribute("data-tplo-value-source"), "preview")
  fireEvent.click(view.getByRole("button", { name: copy.geometry.update, exact: true }))
  await waitFor(() => assert.equal(view.draftNow()?.baseRevision, 5))
  assert.deepEqual(view.draftNow().fragment.points, points)
  assert.equal(env.client.getQueryData(keys.imageTploEditorUi(caseId, imageId)).comparison, "simulated")
  assert.equal(view.container.querySelector("[data-tplo-simulation-contour]").getAttribute("data-tplo-result-source"), "official")
  assert.deepEqual(backend.calls.map(call => call.method), ["PATCH"])
})

test("stage 11: partial contours cannot save, explicit removal can save null, and cancel restores the saved geometry", async () => {
  const env = environment(), backend = server(env), view = await mount(env)
  applyRotation(view, 0)
  fireEvent.click(view.getByRole("button", { name: copy.geometry.cancel, exact: true }))
  await waitFor(() => assert.equal(view.draftNow()?.rotation_degrees, 90))
  assert.equal(view.draftNow().baseRevision, 4)
  assert.deepEqual(backend.calls, [])
  fireEvent.click(view.container.querySelector("[data-tplo-fragment-controls] summary"))
  fireEvent.click(view.getByRole("button", { name: copy.fragment.redraw, exact: true }))
  await waitFor(() => assert.equal(view.draftNow().fragmentComplete, false))
  assert.equal(view.queryByRole("button", { name: copy.geometry.update, exact: true }), null)
  assert.equal(view.getByRole("button", { name: copy.fragment.finish, exact: true }).disabled, true)
  fireEvent.click(view.getByRole("button", { name: copy.fragment.cancel, exact: true }))
  await waitFor(() => assert.equal(view.draftNow().fragmentComplete, true))
  fireEvent.click(view.container.querySelector("[data-tplo-fragment-controls] summary"))
  fireEvent.click(view.getByRole("button", { name: copy.fragment.clear, exact: true }))
  await waitFor(() => assert.equal(view.draftNow().fragment, null))
  fireEvent.click(view.getByRole("button", { name: copy.geometry.update, exact: true }))
  await waitFor(() => assert.equal(view.draftNow()?.baseRevision, 5))
  assert.equal(backend.calls[0].body.fragment, null)
})

test("stage 11: lost responses use GET and reopen only the confirmed geometry", async () => {
  const env = environment({ rotation: 0 }), backend = server(env, "lost"), view = await mount(env)
  applyRotation(view, 90)
  fireEvent.click(view.getByRole("button", { name: copy.geometry.update, exact: true }))
  await waitFor(() => assert.equal(view.draftNow()?.baseRevision, 5))
  assert.deepEqual(backend.calls.map(call => call.method), ["PATCH", "GET"])
})

test("stage 11: pending uncertainty offers GET-only verification and preserves the partial intention", async () => {
  const env = environment({ rotation: 0 }), backend = server(env, "uncertain"), view = await mount(env)
  applyRotation(view, 90)
  fireEvent.click(view.getByRole("button", { name: copy.geometry.update, exact: true }))
  await waitFor(() => assert.equal(env.client.getQueryData(keys.imagePlanSave(caseId, imageId)).phase, "uncertain"))
  assert.equal(view.draftNow().rotation_degrees, 90)
  backend.setSaved({ ...env.plan, revision: 5, document: confirmed(applyPlanCommand(env.plan.document, backend.calls[0].body)) })
  fireEvent.click(view.getByRole("button", { name: copy.recovery.check, exact: true }))
  await waitFor(() => assert.equal(view.draftNow()?.baseRevision, 5))
  assert.deepEqual(backend.calls.map(call => call.method), ["PATCH", "GET", "GET"])
})

test("stage 11: conflicts and clinical refusals keep intent until explicit discard, without rewriting server state", async () => {
  for (const mode of ["conflict", "review"]) {
    const env = environment({ rotation: 0 }), backend = server(env, mode), view = await mount(env)
    applyRotation(view, 90)
    fireEvent.click(view.getByRole("button", { name: copy.geometry.update, exact: true }))
    await waitFor(() => assert.ok(view.container.querySelector("[data-tplo-recovery]")))
    await waitFor(() => assert.equal(view.getByRole("button", { name: copy.recovery.discard, exact: true }).disabled, false))
    assert.equal(view.draftNow().rotation_degrees, 90)
    assert.deepEqual(env.client.getQueryData(keys.imagePlan(caseId, imageId)).document.tplo, env.plan.document.tplo)
    fireEvent.click(view.getByRole("button", { name: copy.recovery.discard, exact: true }))
    await waitFor(() => assert.equal(view.draftNow()?.rotation_degrees, 0))
    assert.equal(view.draftNow().baseRevision, mode === "conflict" ? 5 : 4)
    assert.ok(view.queryByRole("button", { name: copy.geometry.update, exact: true }) === null)
    assert.equal(backend.calls.filter(call => call.method === "PATCH").length, 1)
    assert.ok(backend.calls.every(call => ["PATCH", "GET"].includes(call.method)))
    view.unmount()
  }
})

function deferPatch() {
  const handler = transport
  let release, started = false
  const pending = new Promise(resolve => { release = resolve })
  transport = async (url, init) => {
    if (init.method === "PATCH") { started = true; await pending }
    return handler(url, init)
  }
  return { release: () => release(), started: () => started }
}

test("TPLO menu: saving keeps the locked editor and local values visible, then confirms once through Sonner", async () => {
  const env = environment({ rotation: 0 }), backend = server(env), pending = deferPatch(), view = await mount(env)
  const successes = [], previousSuccess = notifications.success, previousLoading = notifications.loading, loading = []
  notifications.success = (...args) => { successes.push(args); return 1 }
  notifications.loading = (...args) => { loading.push(args); return 1 }
  try {
    applyRotation(view, 90)
    fireEvent.click(view.getByRole("button", { name: copy.geometry.update, exact: true }))
    await waitFor(() => assert.equal(pending.started(), true))
    assert.ok(view.container.querySelector("[data-tplo-cut-controls]"))
    assert.equal(view.container.querySelector("[data-tplo-recovery]"), null)
    assert.equal(view.getByLabelText(copy.placement.diameter).disabled, true)
    assert.equal(view.getByLabelText(copy.simulation.rotationInput).disabled, true)
    assert.equal(view.container.querySelector("[data-tplo-values]").getAttribute("data-tplo-value-source"), "preview")
    assert.equal(view.container.textContent.includes(copy.recovery.saving), false)
    assert.deepEqual(successes, [])
    assert.deepEqual(loading, [])
    await act(async () => { pending.release() })
    await waitFor(() => assert.equal(view.draftNow()?.baseRevision, 5))
    await waitFor(() => assert.equal(successes.length, 1))
    assert.equal(successes[0][0], copy.recovery.saved)
    assert.equal(view.container.querySelector("[data-tplo-values]").getAttribute("data-tplo-value-source"), "official")
    assert.equal(view.getByLabelText(copy.placement.diameter).disabled, false)
    assert.equal(view.container.querySelector("[data-tplo-recovery]"), null)
    assert.deepEqual(loading, [])
    assert.deepEqual(backend.calls.map(call => call.method), ["PATCH"])
  } finally {
    pending.release()
    notifications.success = previousSuccess
    notifications.loading = previousLoading
  }
})

test("stage 11: discarding creation leaves the TPLO context open and does not create an object", async () => {
  const env = environment({ creating: true }), backend = server(env), view = await mount(env)
  fireEvent.click(view.getByRole("button", { name: copy.geometry.discard, exact: true }))
  await waitFor(() => assert.equal(view.draftNow(), null))
  await waitFor(() => assert.ok(view.container.querySelector("[data-tplo-saved]")))
  assert.deepEqual(env.client.getQueryData(keys.imagePlan(caseId, imageId)).document.objects, [])
  assert.deepEqual(backend.calls, [])
})

test("stage 11: a late confirmation cannot replace another image or another query client's draft", async () => {
  for (const nextImageId of ["a4302086-7b81-482d-a11a-b9f4b29e11c0", imageId]) {
    const env = environment({ rotation: 0 }), backend = server(env), pending = deferPatch(), view = await mount(env)
    applyRotation(view, 90)
    fireEvent.click(view.getByRole("button", { name: copy.geometry.update, exact: true }))
    await waitFor(() => assert.equal(pending.started(), true))
    const next = environment({ selectedImageId: nextImageId, rotation: 0 })
    const nextDraft = next.client.getQueryData(keys.imageTploDraft(caseId, nextImageId))
    view.rerender(element(next))
    await act(async () => { pending.release(); await new Promise(resolve => setTimeout(resolve, 30)) })
    await waitFor(() => assert.equal(env.client.getQueryData(keys.imagePlanSave(caseId, imageId)).phase, "saved"))
    assert.equal(next.client.getQueryData(keys.imageTploDraft(caseId, nextImageId)), nextDraft)
    assert.equal(next.client.getQueryData(keys.imagePlan(caseId, nextImageId)).revision, 4)
    assert.equal(next.client.getQueryData(keys.imageTploEditorUi(caseId, nextImageId)).comparison, "original")
    assert.equal(backend.calls.filter(call => call.method === "PATCH").length, 1)
    view.unmount()
  }
})

test("stage 11: confirmation never reopens over a newer intention on the same image", async () => {
  const env = environment({ rotation: 0 }), backend = server(env), pending = deferPatch(), view = await mount(env)
  applyRotation(view, 90)
  fireEvent.click(view.getByRole("button", { name: copy.geometry.update, exact: true }))
  await waitFor(() => assert.equal(pending.started(), true))
  let newer
  await act(async () => {
    env.client.setQueryData(keys.imageTploDraft(caseId, imageId), { ...view.draftNow(), rotation_degrees: 45 })
    newer = view.draftNow()
    pending.release()
  })
  await waitFor(() => assert.equal(env.client.getQueryData(keys.imagePlanSave(caseId, imageId)).phase, "saved"))
  await waitFor(() => assert.equal(view.getByRole("button", { name: copy.geometry.update, exact: true }).disabled, true))
  assert.equal(view.draftNow(), newer)
  assert.equal(view.draftNow().rotation_degrees, 45)
  assert.equal(view.draftNow().baseRevision, 4)
  assert.equal(backend.calls.filter(call => call.method === "PATCH").length, 1)
})

test("stage 11: a confirmed locked object is selected read-only without forcing it back into edit mode", async () => {
  const env = environment({ rotation: 0 }), backend = server(env), handler = transport, view = await mount(env)
  transport = async (url, init) => {
    const response = await handler(url, init), plan = await response.json()
    return Response.json({ ...plan, document: { ...plan.document, objects: plan.document.objects.map(object => ({ ...object, locked: true })) } })
  }
  applyRotation(view, 90)
  fireEvent.click(view.getByRole("button", { name: copy.geometry.update, exact: true }))
  await waitFor(() => assert.equal(env.client.getQueryData(keys.imagePlanSave(caseId, imageId)).phase, "saved"))
  await waitFor(() => assert.ok(view.container.querySelector("[data-tplo-saved]")))
  assert.equal(view.draftNow(), null)
  assert.ok(view.container.querySelector("[data-tplo-cut-controls]") === null)
  assert.equal(env.client.getQueryData(keys.imagePlan(caseId, imageId)).document.objects[0].locked, true)
  assert.equal(env.client.getQueryData(keys.imageTploEditorUi(caseId, imageId)).selectedId, objectId)
  assert.equal(backend.calls.filter(call => call.method === "PATCH").length, 1)
})

test("stage 11: case finalization while saving does not reopen editable geometry", async () => {
  const env = environment({ rotation: 0 }), backend = server(env), pending = deferPatch(), view = await mount(env)
  applyRotation(view, 90)
  fireEvent.click(view.getByRole("button", { name: copy.geometry.update, exact: true }))
  await waitFor(() => assert.equal(pending.started(), true))
  view.rerender(element({ ...env, caseLocked: true }))
  await act(async () => { pending.release(); await new Promise(resolve => setTimeout(resolve, 30)) })
  await waitFor(() => assert.equal(env.client.getQueryData(keys.imagePlanSave(caseId, imageId)).phase, "saved"))
  assert.equal(view.draftNow(), null)
  assert.ok(view.container.querySelector("[data-tplo-actions]") === null)
  assert.equal(backend.calls.filter(call => call.method === "PATCH").length, 1)
})

async function catalog(env) {
  env.client.setQueryData(keys.imageTploDraft(caseId, env.image.id), null)
  env.client.setQueryData(keys.imageTploEditorUi(caseId, env.image.id), { selectedId: null, activePoint: null, activeVertex: null, area: "body", detailsExpanded: false, comparison: "original" })
  const view = render(element(env))
  fireEvent.load(view.getByRole("img"))
  view.getByRole("img").parentElement.getBoundingClientRect = () => ({ left: 100, top: 50, width: 400, height: 800, right: 500, bottom: 850 })
  await waitFor(() => assert.equal(view.container.querySelector("[data-tplo-tool]").disabled, false))
  fireEvent.click(view.container.querySelector("[data-tplo-tool]"))
  return { ...view, ...env, draftNow: () => env.client.getQueryData(keys.imageTploDraft(caseId, env.image.id)) }
}
async function requestDeletion(view) {
  await waitFor(() => assert.equal(view.getByRole("button", { name: copy.deletion.action, exact: true }).disabled, false))
  fireEvent.click(view.getByRole("button", { name: copy.deletion.action, exact: true }))
  await waitFor(() => assert.ok(view.queryByRole("alertdialog")))
  return within(view.getByRole("alertdialog"))
}
function addSecond(env) {
  const second = { ...env.plan.document.objects[0], id: "a4302086-7b81-482d-a11a-b9f4b29e11b3", label: "Other osteotomy" }
  env.plan = { ...env.plan, document: { ...env.plan.document, objects: [...env.plan.document.objects, second] } }
  env.client.setQueryData(keys.imagePlan(caseId, imageId), env.plan)
  return second
}

test("stage 12: public entry creates, places and saves one osteotomy, then permits a separate new one", async () => {
  const env = environment({ creating: true }), backend = server(env), view = await catalog(env)
  await waitFor(() => assert.equal(view.draftNow()?.kind, "tplo-create"))
  const id = view.draftNow().id
  assert.equal(view.container.querySelector("[data-tplo-tool]").getAttribute("aria-pressed"), "true")
  const viewport = view.container.querySelector("[data-calibration-viewport]")
  for (const [x, y] of [[300, 450], [340, 450]]) {
    fireEvent.pointerDown(viewport, { pointerId: 1, clientX: x, clientY: y, button: 0 })
    fireEvent.pointerUp(viewport, { pointerId: 1, clientX: x, clientY: y, button: 0 })
    await act(async () => {})
  }
  await waitFor(() => assert.ok(view.draftNow()?.edge))
  assert.deepEqual(backend.calls, [])
  fireEvent.click(view.getByRole("button", { name: copy.geometry.save, exact: true }))
  await waitFor(() => assert.equal(view.draftNow()?.baseRevision, 5))
  assert.equal(view.draftNow().id, id)
  assert.deepEqual(backend.calls.map(call => call.method), ["PATCH"])
  fireEvent.click(view.getByRole("button", { name: copy.entry.new, exact: true }))
  await waitFor(() => assert.equal(view.draftNow()?.kind, "tplo-create"))
  assert.notEqual(view.draftNow().id, id)
  assert.equal(env.client.getQueryData(keys.imagePlan(caseId, imageId)).document.objects.length, 1)
})

test("stage 12: public entry reopens a saved osteotomy without a write", async () => {
  const env = environment(), backend = server(env), view = await catalog(env)
  await waitFor(() => assert.equal(view.draftNow()?.kind, "tplo-update"))
  assert.equal(view.draftNow().id, objectId)
  assert.ok(view.queryByRole("button", { name: copy.geometry.update, exact: true }) === null)
  assert.deepEqual(backend.calls, [])
})

test("stage 12: cancelling deletion preserves the exact dirty editor and restores focus", async () => {
  const env = environment({ rotation: 0 }), backend = server(env), view = await mount(env)
  applyRotation(view, 90)
  const draft = view.draftNow(), dialog = await requestDeletion(view)
  assert.ok(dialog.getByText(copy.deletion.dirty))
  fireEvent.click(dialog.getByRole("button", { name: common.actions.cancel, exact: true }))
  await waitFor(() => assert.ok(!view.queryByRole("alertdialog")))
  assert.equal(view.draftNow(), draft)
  assert.deepEqual(backend.calls, [])
  await waitFor(() => assert.equal(document.activeElement?.getAttribute("data-tplo-delete"), objectId))
})

test("stage 12: deleting the selected UUID preserves other geometry and global metadata and reopens the remainder", async () => {
  const env = environment()
  env.plan.document.tplo_landmarks = { method: "MEDIAL_CONDYLE_CRANIAL_CRUCIATE_FULL_AXIS_V1", plateau_cranial: points[0], plateau_caudal: points[1], intercondylar_midpoint: points[2], talus_center: { x: 0.4, y: 0.8 } }
  const second = addSecond(env), backend = server(env), view = await mount(env)
  const dialog = await requestDeletion(view), button = dialog.getByRole("button", { name: copy.deletion.confirm, exact: true })
  fireEvent.click(button); fireEvent.click(button)
  await waitFor(() => assert.equal(view.draftNow()?.id, second.id))
  assert.equal(view.draftNow().baseRevision, 5)
  assert.ok(!view.queryByRole("alertdialog"))
  const plan = env.client.getQueryData(keys.imagePlan(caseId, imageId))
  assert.deepEqual(plan.document.objects, [second])
  const { objects: beforeObjects, ...before } = env.plan.document, { objects: afterObjects, ...after } = plan.document
  assert.equal(beforeObjects.length, 2); assert.equal(afterObjects.length, 1)
  assert.deepEqual(after, before)
  assert.deepEqual(backend.calls.map(call => call.method), ["PATCH"])
  assert.deepEqual(backend.calls[0].body, { kind: "tplo-delete", id: objectId, baseRevision: 4 })
  assert.equal(view.container.querySelector("[data-tplo-tool]").getAttribute("aria-pressed"), "true")
})

test("stage 12: deleting the last osteotomy keeps an empty TPLO card with creation enabled", async () => {
  const env = environment(), backend = server(env), view = await mount(env), dialog = await requestDeletion(view)
  fireEvent.click(dialog.getByRole("button", { name: copy.deletion.confirm, exact: true }))
  await waitFor(() => assert.ok(view.container.querySelector("[data-tplo-saved]")))
  await waitFor(() => assert.equal(env.client.getQueryData(keys.imageTploEditorUi(caseId, imageId)).selectedId, null))
  assert.equal(view.draftNow(), null)
  assert.equal(view.getByRole("button", { name: copy.entry.new, exact: true }).disabled, false)
  assert.equal(env.client.getQueryData(keys.imagePlan(caseId, imageId)).document.objects.length, 0)
  assert.deepEqual(backend.calls.map(call => call.method), ["PATCH"])
})

test("stage 12: a lost delete response is confirmed by GET without replay", async () => {
  const env = environment(), backend = server(env, "lost"), view = await mount(env), dialog = await requestDeletion(view)
  fireEvent.click(dialog.getByRole("button", { name: copy.deletion.confirm, exact: true }))
  await waitFor(() => assert.equal(env.client.getQueryData(keys.imagePlanSave(caseId, imageId)).phase, "saved"))
  await waitFor(() => assert.ok(!view.queryByRole("alertdialog")))
  assert.deepEqual(backend.calls.map(call => call.method), ["PATCH", "GET"])
  assert.equal(view.draftNow(), null)
})

test("stage 12: uncertainty keeps the delete intent and requires GET verification, not another write", async () => {
  const env = environment(), backend = server(env, "uncertain"), view = await mount(env), dialog = await requestDeletion(view)
  fireEvent.click(dialog.getByRole("button", { name: copy.deletion.confirm, exact: true }))
  await waitFor(() => assert.equal(env.client.getQueryData(keys.imagePlanSave(caseId, imageId)).phase, "uncertain"))
  assert.equal(view.draftNow().kind, "tplo-delete")
  await waitFor(() => assert.equal(within(view.getByRole("alertdialog")).getByRole("button", { name: copy.recovery.check, exact: true }).disabled, false))
  assert.equal(within(view.getByRole("alertdialog")).getByRole("button", { name: common.actions.cancel, exact: true }).disabled, true)
  backend.setSaved({ ...env.plan, revision: 5, document: applyPlanCommand(env.plan.document, backend.calls[0].body) })
  fireEvent.click(within(view.getByRole("alertdialog")).getByRole("button", { name: copy.recovery.check, exact: true }))
  await waitFor(() => assert.ok(!view.queryByRole("alertdialog")))
  assert.equal(view.draftNow(), null)
  assert.deepEqual(backend.calls.map(call => call.method), ["PATCH", "GET", "GET"])
})

test("stage 12: conflicts and clinical refusals preserve deletion until explicit load-saved", async () => {
  for (const mode of ["conflict", "review"]) {
    const env = environment(), backend = server(env, mode), view = await mount(env), dialog = await requestDeletion(view)
    fireEvent.click(dialog.getByRole("button", { name: copy.deletion.confirm, exact: true }))
    await waitFor(() => assert.equal(env.client.getQueryData(keys.imagePlanSave(caseId, imageId)).phase, mode === "conflict" ? "conflict" : "error"))
    assert.equal(view.draftNow().kind, "tplo-delete")
    const load = within(view.getByRole("alertdialog")).getByRole("button", { name: copy.geometry.loadSaved, exact: true })
    await waitFor(() => assert.equal(load.disabled, false))
    fireEvent.click(load)
    await waitFor(() => assert.equal(view.draftNow()?.kind, "tplo-update"))
    assert.equal(view.draftNow().baseRevision, mode === "conflict" ? 5 : 4)
    assert.equal(env.client.getQueryData(keys.imagePlan(caseId, imageId)).document.objects.length, 1)
    assert.equal(backend.calls.filter(call => call.method === "PATCH").length, 1)
    view.unmount()
  }
})

test("stage 12: scale and original dimensions are not required to remove a saved object", async () => {
  const env = environment()
  env.image = { ...env.image, widthPx: null, heightPx: null }
  env.plan = { ...env.plan, document: { ...env.plan.document, calibration: null } }
  env.client.setQueryData(keys.imagePlan(caseId, imageId), env.plan)
  const backend = server(env), view = await catalog(env)
  await waitFor(() => assert.ok(view.container.querySelector("[data-tplo-saved]")))
  assert.equal(view.getByRole("button", { name: copy.entry.new, exact: true }).disabled, true)
  const dialog = await requestDeletion(view)
  fireEvent.click(dialog.getByRole("button", { name: copy.deletion.confirm, exact: true }))
  await waitFor(() => assert.equal(env.client.getQueryData(keys.imagePlanSave(caseId, imageId)).phase, "saved"))
  assert.deepEqual(backend.calls.map(call => call.method), ["PATCH"])
})

test("stage 12: a revision change before confirmation is shown and never rebased into a delete", async () => {
  const env = environment(), backend = server(env), view = await mount(env)
  await requestDeletion(view)
  await act(async () => { env.client.setQueryData(keys.imagePlan(caseId, imageId), { ...env.plan, revision: 6 }) })
  const dialog = within(view.getByRole("alertdialog"))
  const load = dialog.getByRole("button", { name: copy.geometry.loadSaved, exact: true })
  fireEvent.click(load)
  await waitFor(() => assert.equal(view.draftNow()?.baseRevision, 6))
  assert.equal(view.draftNow().kind, "tplo-update")
  assert.deepEqual(backend.calls, [])
})

test("stage 12: late deletion cannot open a modal or editor in another client/image", async () => {
  const env = environment(), backend = server(env), pending = deferPatch(), view = await mount(env), dialog = await requestDeletion(view)
  fireEvent.click(dialog.getByRole("button", { name: copy.deletion.confirm, exact: true }))
  await waitFor(() => assert.equal(pending.started(), true))
  const next = environment({ selectedImageId: "a4302086-7b81-482d-a11a-b9f4b29e11d0" })
  const nextDraft = next.client.getQueryData(keys.imageTploDraft(caseId, next.image.id))
  view.rerender(element(next))
  await act(async () => { pending.release(); await new Promise(resolve => setTimeout(resolve, 30)) })
  await waitFor(() => assert.equal(env.client.getQueryData(keys.imagePlanSave(caseId, imageId)).phase, "saved"))
  assert.ok(!view.queryByRole("alertdialog"))
  assert.equal(next.client.getQueryData(keys.imageTploDraft(caseId, next.image.id)), nextDraft)
  assert.equal(backend.calls.filter(call => call.method === "PATCH").length, 1)
})

test("stage 12: a locked saved object can be viewed but cannot be deleted", async () => {
  const env = environment()
  env.plan = { ...env.plan, document: { ...env.plan.document, objects: env.plan.document.objects.map(object => ({ ...object, locked: true })) } }
  env.client.setQueryData(keys.imagePlan(caseId, imageId), env.plan)
  const backend = server(env), view = await catalog(env)
  await waitFor(() => assert.ok(view.container.querySelector("[data-tplo-saved]")))
  assert.equal(view.getByRole("button", { name: copy.deletion.action, exact: true }).disabled, true)
  assert.deepEqual(backend.calls, [])
})

test("stage 12: foreground read failure requires a read before deletion and preserves the request", async () => {
  const env = environment(), backend = server(env), view = await mount(env)
  await requestDeletion(view)
  await act(async () => { env.client.getQueryCache().find({ queryKey: keys.imagePlan(caseId, imageId), exact: true }).setState({ status: "error", error: Error("local read failed"), fetchStatus: "idle" }) })
  await waitFor(() => assert.equal(within(view.getByRole("alertdialog")).getByRole("button", { name: copy.read.retry, exact: true }).disabled, false))
  fireEvent.click(within(view.getByRole("alertdialog")).getByRole("button", { name: copy.read.retry, exact: true }))
  await waitFor(() => assert.equal(within(view.getByRole("alertdialog")).getByRole("button", { name: copy.deletion.confirm, exact: true }).disabled, false))
  assert.deepEqual(backend.calls.map(call => call.method), ["GET"])
  fireEvent.click(within(view.getByRole("alertdialog")).getByRole("button", { name: copy.deletion.confirm, exact: true }))
  await waitFor(() => assert.ok(!view.queryByRole("alertdialog")))
  assert.deepEqual(backend.calls.map(call => call.method), ["GET", "PATCH"])
})

test("stage 12: a newer draft while the dialog is open cannot be discarded or deleted by the old confirmation", async () => {
  const env = environment(), backend = server(env), view = await mount(env)
  await requestDeletion(view)
  let newer
  await act(async () => { env.client.setQueryData(keys.imageTploDraft(caseId, imageId), { ...view.draftNow(), rotation_degrees: 45 }); newer = view.draftNow() })
  const dialog = within(view.getByRole("alertdialog"))
  assert.equal(dialog.getByRole("button", { name: copy.deletion.confirm, exact: true }).disabled, true)
  fireEvent.click(dialog.getByRole("button", { name: common.actions.cancel, exact: true }))
  await waitFor(() => assert.ok(!view.queryByRole("alertdialog")))
  assert.equal(view.draftNow(), newer)
  assert.deepEqual(backend.calls, [])
})

test("stage 12: observing the selected UUID already absent in a newer revision does not send deletion again", async () => {
  const env = environment(), backend = server(env), view = await mount(env)
  await requestDeletion(view)
  await act(async () => { env.client.setQueryData(keys.imagePlan(caseId, imageId), { ...env.plan, revision: 6, document: { ...env.plan.document, objects: [] } }) })
  fireEvent.click(within(view.getByRole("alertdialog")).getByRole("button", { name: copy.geometry.loadSaved, exact: true }))
  await waitFor(() => assert.ok(!view.queryByRole("alertdialog")))
  await waitFor(() => assert.equal(env.client.getQueryData(keys.imageTploEditorUi(caseId, imageId)).selectedId, null))
  assert.equal(view.draftNow(), null)
  assert.equal(view.getByRole("button", { name: copy.entry.new, exact: true }).disabled, false)
  assert.deepEqual(backend.calls, [])
})

test("stage 12: switching between clean TPLO and Distance preserves the calibration and its saved line without writes", async () => {
  const env = environment()
  const line = { id: "a4302086-7b81-482d-a11a-b9f4b29e11e0", type: "LINE", start: { x: 0.1, y: 0.1 }, end: { x: 0.2, y: 0.1 }, label: "Saved line", visible: true, locked: false }
  env.plan = { ...env.plan, document: { ...env.plan.document, objects: [...env.plan.document.objects, line] } }
  env.client.setQueryData(keys.imagePlan(caseId, imageId), env.plan)
  const backend = server(env), view = await catalog(env)
  await waitFor(() => assert.equal(view.draftNow()?.kind, "tplo-update"))
  fireEvent.click(view.container.querySelector("[data-distance-tool]"))
  await waitFor(() => assert.equal(view.draftNow(), null))
  await waitFor(() => assert.equal(env.client.getQueryData(keys.imageDistanceDraft(caseId, imageId))?.id, line.id))
  assert.equal(view.container.querySelector("[data-tplo-tool]").getAttribute("aria-pressed"), "false")
  fireEvent.click(view.container.querySelector("[data-tplo-tool]"))
  await waitFor(() => assert.equal(view.draftNow()?.id, objectId))
  assert.deepEqual(env.client.getQueryData(keys.imagePlan(caseId, imageId)), env.plan)
  assert.deepEqual(backend.calls, [])
})

test("review 12: a pending read is identified as verification and never as deletion", async () => {
  const env = environment(), backend = server(env), view = await mount(env)
  await requestDeletion(view)
  await act(async () => { env.client.getQueryCache().find({ queryKey: keys.imagePlan(caseId, imageId), exact: true }).setState({ status: "error", error: Error("read failed"), fetchStatus: "idle" }) })
  await waitFor(() => assert.equal(within(view.getByRole("alertdialog")).getByRole("button", { name: copy.read.retry, exact: true }).disabled, false))
  const handler = transport
  let release, started = false
  const gate = new Promise(resolve => { release = resolve })
  transport = async (url, init) => { if (init.method === "GET") { started = true; await gate }; return handler(url, init) }
  fireEvent.click(within(view.getByRole("alertdialog")).getByRole("button", { name: copy.read.retry, exact: true }))
  await waitFor(() => assert.equal(started, true))
  assert.equal(within(view.getByRole("alertdialog")).getByRole("button", { name: copy.recovery.checking, exact: true }).disabled, true)
  assert.deepEqual(backend.calls, [])
  await act(async () => { release() })
  await waitFor(() => assert.equal(within(view.getByRole("alertdialog")).getByRole("button", { name: copy.deletion.confirm, exact: true }).disabled, false))
  assert.deepEqual(backend.calls.map(call => call.method), ["GET"])
})

test("review 12: the old confirmation cannot delete an object locked in cache before the next render", async () => {
  const env = environment(), backend = server(env), view = await mount(env), dialog = await requestDeletion(view)
  const confirm = dialog.getByRole("button", { name: copy.deletion.confirm, exact: true })
  await act(async () => {
    env.client.setQueryData(keys.imagePlan(caseId, imageId), { ...env.plan, document: { ...env.plan.document, objects: env.plan.document.objects.map(object => ({ ...object, locked: true })) } })
    fireEvent.click(confirm)
  })
  assert.deepEqual(backend.calls, [])
  await waitFor(() => assert.equal(within(view.getByRole("alertdialog")).getByRole("button", { name: copy.geometry.loadSaved, exact: true }).disabled, false))
  fireEvent.click(within(view.getByRole("alertdialog")).getByRole("button", { name: copy.geometry.loadSaved, exact: true }))
  await waitFor(() => assert.ok(!view.queryByRole("alertdialog")))
  assert.equal(env.client.getQueryData(keys.imagePlan(caseId, imageId)).document.objects[0].locked, true)
  assert.deepEqual(backend.calls, [])
})

test("review 12: finalization before confirmation closes the request without discarding or writing geometry", async () => {
  const env = environment(), backend = server(env), view = await mount(env)
  await requestDeletion(view)
  const before = view.draftNow()
  view.rerender(element({ ...env, caseLocked: true }))
  await waitFor(() => assert.ok(!view.queryByRole("alertdialog")))
  assert.equal(view.draftNow(), before)
  assert.ok(view.queryByRole("button", { name: copy.geometry.update, exact: true }) === null)
  assert.deepEqual(backend.calls, [])
})

test("review 12: Escape cancels an uncommitted confirmation and restores its trigger", async () => {
  const env = environment(), backend = server(env), view = await mount(env)
  await requestDeletion(view)
  const before = view.draftNow()
  fireEvent.keyDown(view.getByRole("alertdialog"), { key: "Escape" })
  await waitFor(() => assert.ok(!view.queryByRole("alertdialog")))
  assert.equal(view.draftNow(), before)
  await waitFor(() => assert.equal(document.activeElement?.getAttribute("data-tplo-delete"), objectId))
  assert.deepEqual(backend.calls, [])
})

test("TPLO menu: initial placement reveals cut controls without clinical references or extra measure details", async () => {
  const env = environment({ creating: true }), backend = server(env), view = await catalog(env)
  await waitFor(() => assert.equal(view.draftNow()?.kind, "tplo-create"))
  assert.ok(view.container.querySelector("[data-tplo-reference]") === null)
  assert.ok(view.container.querySelector("[data-tplo-rotation-controls]") === null)
  assert.ok(view.queryByRole("button", { name: copy.entry.new, exact: true }) === null)
  assert.ok(view.queryByRole("button", { name: copy.geometry.save, exact: true }) === null)
  const viewport = view.container.querySelector("[data-calibration-viewport]")
  for (const [x, y] of [[300, 450], [340, 450]]) {
    fireEvent.pointerDown(viewport, { pointerId: 1, clientX: x, clientY: y, button: 0 })
    fireEvent.pointerUp(viewport, { pointerId: 1, clientX: x, clientY: y, button: 0 })
    await act(async () => {})
  }
  await waitFor(() => assert.ok(view.draftNow().edge))
  assert.equal(view.container.querySelector("[data-tplo-reference]"), null)
  assert.equal(view.queryByText(copy.geometry.details), null)
  assert.equal(view.container.querySelector("[data-tplo-rotation-controls] details").open, false)
  assert.equal(view.getByRole("button", { name: copy.geometry.save, exact: true }).disabled, false)
  assert.ok(!view.container.querySelector("[data-tplo-cut-controls]").contains(view.getByRole("button", { name: copy.geometry.save, exact: true })))
  applyRotation(view, 15)
  await waitFor(() => assert.equal(view.draftNow().rotation_degrees, 15))
  assert.deepEqual(backend.calls, [])
})

test("TPLO menu: a rounded diameter display never rounds the stored geometry when another adjustment is saved", async () => {
  const env = environment({ rotation: 0 }), exactEdge = { x: 0.6641365540652268, y: 0.5 }
  env.plan = { ...env.plan, document: confirmed({ ...env.plan.document, objects: env.plan.document.objects.map(object => ({ ...object, edge: exactEdge })) }) }
  env.client.setQueryData(keys.imagePlan(caseId, imageId), env.plan)
  env.client.setQueryData(keys.imageTploDraft(caseId, imageId), { ...env.draft, edge: exactEdge })
  const backend = server(env), view = await mount(env), before = view.draftNow()
  assert.equal(view.getByLabelText(copy.placement.diameter).value, "32,83")
  assert.equal(view.getByRole("button", { name: copy.placement.applyDiameter, exact: true }).disabled, true)
  fireEvent.submit(view.getByLabelText(copy.placement.diameter).closest("form"))
  assert.equal(view.draftNow(), before)
  applyRotation(view, 90)
  fireEvent.click(view.getByRole("button", { name: copy.geometry.update, exact: true }))
  await waitFor(() => assert.equal(view.draftNow()?.baseRevision, 5))
  assert.deepEqual(backend.calls[0].body.edge, exactEdge)
  assert.deepEqual(view.draftNow().edge, exactEdge)
})
