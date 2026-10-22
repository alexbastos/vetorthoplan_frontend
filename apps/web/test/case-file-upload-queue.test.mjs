import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"
import { QueryClient } from "@tanstack/react-query"
import { clinicalUpload } from "./fixtures/clinical-upload.mjs"

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })
const { createCaseFileUploadQueue } = await import("../src/features/cases/lib/case-file-upload-queue.ts")
const { ImageUploadSessionError, createImageUploadSession } = await import("../src/features/cases/services/image-upload-session-api.ts")
const { ImageUploadTransportError } = await import("../src/features/cases/services/image-upload-transport.ts")
const { ImageUploadCompleteError } = await import("../src/features/cases/services/image-upload-complete-api.ts")
const { imageUploadPresentation } = await import("../src/features/cases/lib/image-upload-presentation.ts")
const { casesQueryKeys: keys } = await import("../src/features/cases/hooks/cases-query-keys.ts")
const fixture = clinicalUpload()
const file = (index = 0) => new File(["png"], `synthetic-${index}.png`, { type: "image/png" })
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
function abortable(signal) {
  return new Promise((_, reject) => {
    if (signal.aborted) reject(new DOMException("Aborted", "AbortError"))
    else signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true })
  })
}
function until(queue, predicate) {
  if (predicate(queue.getSnapshot())) return Promise.resolve(queue.getSnapshot())
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { off(); reject(new Error(`Queue condition timed out: ${queue.getSnapshot().map(item => item.phase)}`)) }, 2_000)
    const off = queue.subscribe(() => { const snapshot = queue.getSnapshot(); if (predicate(snapshot)) { clearTimeout(timer); off(); resolve(snapshot) } })
  })
}
function setup(overrides = {}) {
  const client = new QueryClient()
  const queue = createCaseFileUploadQueue(fixture.caseId, client, {
    hash: async () => fixture.session.sha256,
    createSession: async () => structuredClone(fixture.session), transport: async () => {},
    complete: async () => fixture.completed, cancel: async () => ({ phase: "cancelled" }), ...overrides,
  })
  return { client, queue, close: () => { queue.dispose(); client.clear() } }
}

test("persistent deletion receipts remove only the confirmed row, preserving other completed and active files", async () => {
  const second = clinicalUpload(1)
  const transport = deferred()
  let sessionIndex = 0
  const s = setup({ createSession: async () => structuredClone(sessionIndex++ === 0 ? fixture.session : second.session),
    transport: async (_, file) => { if (file.name.endsWith("1.png")) await transport.promise },
  })
  try {
    const [first, next] = s.queue.addFiles([file(), file(1)])
    await until(s.queue, items => items[0]?.completed && items[1]?.phase === "transporting")
    await s.queue.removeFile(first)
    assert.equal(s.queue.getSnapshot().length, 2, "local removal must not delete persisted images")
    s.queue.forgetDeletedImages([fixture.identity.imageId])
    assert.equal(s.queue.getSnapshot().length, 1)
    assert.equal(s.queue.getSnapshot()[0].id, next)
    assert.equal(s.queue.getSnapshot()[0].phase, "transporting")
  } finally { transport.resolve(); s.close() }
})

test("queued and hashing selections are removed locally, with checksum aborted and no session or DELETE", async () => {
  let signal, creates = 0, deletes = 0
  const s = setup({ hash: async (_, passed) => { signal = passed; return abortable(passed) },
    createSession: async () => { creates++; return fixture.session }, cancel: async () => { deletes++; return { phase: "cancelled" } } })
  try {
    const [first, second] = s.queue.addFiles([file(), file(1)])
    await until(s.queue, items => items[0]?.phase === "hashing")
    await s.queue.removeFile(second)
    assert.equal(s.queue.getSnapshot().length, 1)
    await s.queue.removeFile(first)
    assert.equal(signal.aborted, true)
    assert.deepEqual(s.queue.getSnapshot(), [])
    assert.equal(creates, 0); assert.equal(deletes, 0)
  } finally { s.close() }
})

test("cancelling an in-flight create waits for its ID, does not abort or send binary, and cancels exactly once", async () => {
  const creating = deferred()
  let signal, sends = 0, confirms = 0, deletes = 0
  const s = setup({ createSession: async (_, __, ___, options) => { signal = options.signal; return creating.promise },
    transport: async () => { sends++ }, complete: async () => { confirms++; return fixture.completed },
    cancel: async identity => { deletes++; assert.deepEqual(identity, fixture.identity); return { phase: "cancelled" } } })
  try {
    const [id] = s.queue.addFiles([file()])
    await until(s.queue, items => items[0]?.phase === "creating")
    const first = s.queue.removeFile(id), second = s.queue.removeFile(id)
    assert.equal(first, second)
    assert.equal(signal.aborted, false)
    assert.equal(s.queue.getSnapshot()[0].phase, "cancelling")
    creating.resolve(structuredClone(fixture.session)); await first
    assert.deepEqual(s.queue.getSnapshot(), [])
    assert.equal(sends, 0); assert.equal(confirms, 0); assert.equal(deletes, 1)
  } finally { creating.resolve(fixture.session); s.close() }
})

test("a lost create response is recovered with the same key/metadata for cancellation, without recalculating or sending bytes", async () => {
  const calls = [], creating = deferred()
  let hashes = 0, sends = 0, cancels = 0
  const s = setup({ hash: async () => { hashes++; return fixture.session.sha256 },
    createSession: async (caseId, input, key, options) => { calls.push({ caseId, input, key, options }); return calls.length === 1 ? creating.promise : structuredClone(fixture.session) },
    transport: async () => { sends++ }, cancel: async () => { cancels++; return { phase: "cancelled" } } })
  try {
    const [id] = s.queue.addFiles([file()])
    await until(s.queue, items => items[0]?.phase === "creating")
    const cancellation = s.queue.removeFile(id)
    creating.reject(new ImageUploadSessionError("NETWORK_ERROR", true))
    await cancellation
    assert.equal(calls.length, 2)
    assert.equal(calls[0].key, calls[1].key)
    assert.deepEqual(calls[0].input, calls[1].input)
    assert.equal(calls[1].options.allowExpiredForCancellation, true)
    assert.equal(hashes, 1); assert.equal(sends, 0); assert.equal(cancels, 1)
    assert.deepEqual(s.queue.getSnapshot(), [])
  } finally { s.close() }
})

test("a definitive creation refusal during cancellation does not replay the creation or cancel someone else's session", async () => {
  const creating = deferred()
  let creates = 0, deletes = 0
  const s = setup({ createSession: async () => { creates++; return creating.promise }, cancel: async () => { deletes++; return { phase: "cancelled" } } })
  try {
    const [id] = s.queue.addFiles([file()])
    await until(s.queue, items => items[0]?.phase === "creating")
    const pending = s.queue.removeFile(id)
    creating.reject(new ImageUploadSessionError("IMAGE_UPLOAD_SESSION_CONFLICT", false))
    await pending
    assert.equal(creates, 1); assert.equal(deletes, 0)
    assert.deepEqual(s.queue.getSnapshot(), [])
  } finally { s.close() }
})

test("transport cancellation aborts only that file and later uploads complete while its backend cancellation is pending", async () => {
  const cancellation = deferred(), signals = new Map()
  let completed = 0
  const s = setup({ createSession: async (_, input) => structuredClone(clinicalUpload(input.original_filename.includes("-1") ? 1 : 0).session),
    transport: async (_, currentFile, options) => { signals.set(currentFile.name, options.signal); if (currentFile.name === file().name) return abortable(options.signal) },
    complete: async () => { completed++; return clinicalUpload(1).completed }, cancel: async () => cancellation.promise })
  try {
    const [first, second] = s.queue.addFiles([file(), file(1)])
    await until(s.queue, items => items[0]?.phase === "transporting")
    const cancelling = s.queue.removeFile(first)
    await until(s.queue, items => items.find(item => item.id === second)?.phase === "quarantined")
    assert.equal(signals.get(file().name).aborted, true)
    assert.equal(signals.get(file(1).name).aborted, false)
    assert.equal(completed, 1)
    assert.equal(s.queue.getSnapshot().find(item => item.id === first).phase, "cancelling")
    cancellation.resolve({ phase: "cancelled" }); await cancelling
    assert.equal(s.queue.getSnapshot().length, 1)
    assert.equal(s.client.getQueryData(keys.activeIngestions(fixture.caseId))[0].imageId, clinicalUpload(1).identity.imageId)
  } finally { cancellation.resolve({ phase: "cancelled" }); s.close() }
})

test("cancellation racing with confirmation preserves the received file for monitoring instead of removing or deleting it", async () => {
  let completeSignal, confirms = 0, cancels = 0
  const s = setup({ complete: async (_, options) => { confirms++; completeSignal = options.signal; return abortable(options.signal) },
    cancel: async () => { cancels++; return { phase: "confirmed", message: "confirmed" } } })
  try {
    const [id] = s.queue.addFiles([file()])
    await until(s.queue, items => items[0]?.phase === "confirming")
    await s.queue.removeFile(id)
    const row = s.queue.getSnapshot()[0]
    assert.equal(completeSignal.aborted, true)
    assert.equal(row.phase, "stored")
    assert.deepEqual(row.persisted, fixture.identity)
    assert.equal(row.completed, null)
    assert.equal(row.identity, null)
    await s.queue.removeFile(id); await s.queue.retry(id)
    assert.equal(confirms, 1); assert.equal(cancels, 1)
    assert.equal(imageUploadPresentation(row, "QUARANTINED", "QUEUED").state, "processing")
  } finally { s.close() }
})

test("failed cancellation keeps a truthful row and retries cancellation only; an unavailable session may be dismissed locally", async () => {
  let cancels = 0, creates = 0
  const s = setup({ createSession: async () => { creates++; return structuredClone(fixture.session) },
    transport: async (_, __, { signal }) => abortable(signal), cancel: async () => ++cancels === 1 ? { phase: "uncertain", message: "unconfirmed" } : { phase: "unavailable", message: "notFound" } })
  try {
    const [id] = s.queue.addFiles([file()])
    await until(s.queue, items => items[0]?.phase === "transporting")
    await s.queue.removeFile(id)
    assert.equal(s.queue.getSnapshot()[0].phase, "cancel-error")
    assert.equal(imageUploadPresentation(s.queue.getSnapshot()[0]).canRemove, false)
    await s.queue.retry(id)
    const row = s.queue.getSnapshot()[0]
    assert.equal(row.cancellation.phase, "unavailable")
    assert.equal(imageUploadPresentation(row).label, "cancelUnavailable")
    assert.equal(imageUploadPresentation(row).canRemove, true)
    await s.queue.removeFile(id)
    assert.deepEqual(s.queue.getSnapshot(), [])
    assert.equal(creates, 1); assert.equal(cancels, 2)
  } finally { s.close() }
})

test("restarting a failed transport cancels its old session first and preserves restart intent across a cancellation failure", async () => {
  const order = [], keysIssued = []
  let sends = 0, creates = 0, cancels = 0
  const s = setup({ createSession: async (_, __, key) => { order.push("create"); keysIssued.push(key); return structuredClone(clinicalUpload(creates++).session) },
    transport: async () => { order.push("transport"); if (++sends === 1) throw new ImageUploadTransportError("STORAGE_REJECTED") },
    cancel: async () => { order.push("cancel"); return ++cancels === 1 ? { phase: "error", message: "unavailable" } : { phase: "cancelled" } },
    complete: async () => { order.push("complete"); return clinicalUpload(1).completed } })
  try {
    const [id] = s.queue.addFiles([file()])
    await until(s.queue, items => items[0]?.phase === "error")
    assert.equal(s.queue.getSnapshot()[0].identity.uploadId, fixture.identity.uploadId)
    await s.queue.retry(id)
    assert.equal(s.queue.getSnapshot()[0].phase, "cancel-error")
    assert.equal(creates, 1)
    await s.queue.retry(id)
    await until(s.queue, items => items[0]?.phase === "quarantined")
    assert.deepEqual(order, ["create", "transport", "cancel", "cancel", "create", "transport", "complete"])
    assert.notEqual(keysIssued[0], keysIssued[1])
  } finally { s.close() }
})

test("expired replay can recover IDs for cancellation only; the signed form never enters queue state or transport", async () => {
  const requests = []
  let sends = 0, cancels = 0
  const expired = { ...fixture.session, upload: { ...fixture.session.upload, expiresAt: "2020-01-01T00:00:00Z" } }
  const s = setup({ createSession: (caseId, input, key, options) => createImageUploadSession(caseId, input, key, { ...options,
    fetchImpl: async (_, init) => { requests.push(init); return Response.json(expired, { status: 201 }) } }),
    transport: async () => { sends++ }, cancel: async () => { cancels++; return { phase: "cancelled" } } })
  try {
    const [id] = s.queue.addFiles([file()])
    await until(s.queue, items => items[0]?.phase === "error")
    assert.equal(s.queue.getSnapshot()[0].error, "EXPIRED")
    assert.equal(JSON.stringify(s.queue.getSnapshot()).includes("signed-policy"), false)
    assert.equal(JSON.stringify(s.queue.getSnapshot()).includes("https://storage.example"), false)
    await s.queue.removeFile(id)
    assert.equal(requests.length, 2)
    assert.equal(requests[0].headers["Idempotency-Key"], requests[1].headers["Idempotency-Key"])
    assert.equal(requests[0].body, requests[1].body)
    assert.equal(sends, 0); assert.equal(cancels, 1)
  } finally { s.close() }
})

test("leaving during creation still cancels the late session response without uploading; mount cleanup is reversible before interaction", async () => {
  const creating = deferred()
  let sends = 0, deletes = 0
  const cancelled = deferred()
  const s = setup({ createSession: async () => creating.promise, transport: async () => { sends++ },
    cancel: async () => { deletes++; cancelled.resolve(); return { phase: "cancelled" } } })
  try {
    s.queue.dispose(); s.queue.activate()
    s.queue.addFiles([file()])
    await until(s.queue, items => items[0]?.phase === "creating")
    s.queue.dispose()
    creating.resolve(structuredClone(fixture.session))
    await cancelled.promise
    assert.equal(sends, 0); assert.equal(deletes, 1)
  } finally { s.close() }
})

test("normal queue keeps appended files, and ambiguous confirmation retries reuse the existing session without retransmitting", async () => {
  let creates = 0, transports = 0, confirms = 0
  const s = setup({ createSession: async () => structuredClone(clinicalUpload(creates++).session),
    transport: async () => { transports++ }, complete: async identity => {
      if (++confirms === 1) throw new ImageUploadCompleteError("NETWORK_ERROR", true)
      const index = (Number(identity.uploadId.slice(-12)) - 124) / 10
      return { ...clinicalUpload(index).completed, ...identity }
    } })
  try {
    const [first] = s.queue.addFiles([file()])
    await until(s.queue, items => items[0]?.phase === "error")
    await s.queue.retry(first)
    await until(s.queue, items => items[0]?.phase === "quarantined")
    assert.equal(creates, 1); assert.equal(transports, 1); assert.equal(confirms, 2)
    s.queue.addFiles([file(1), file(2)])
    await until(s.queue, items => items.length === 3 && items.every(item => item.phase === "quarantined"))
    assert.equal(creates, 3)
    assert.equal(s.client.getQueryData(keys.activeIngestions(fixture.caseId)).length, 3)
  } finally { s.close() }
})
