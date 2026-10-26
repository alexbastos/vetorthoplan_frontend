import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import { createHash } from "node:crypto"
import test from "node:test"
import { QueryClient } from "@tanstack/react-query"
import { clinicalUpload } from "./fixtures/clinical-upload.mjs"

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })
const { createCaseFileUploadQueue } = await import("../src/features/cases/lib/case-file-upload-queue.ts")
const { observeUploadSelectionFeedback } = await import("../src/features/cases/lib/upload-selection-feedback.ts")
const { ImageUploadSessionError, createImageUploadSession } = await import("../src/features/cases/services/image-upload-session-api.ts")
const { ImageUploadTransportError } = await import("../src/features/cases/services/image-upload-transport.ts")
const { ImageUploadCompleteError } = await import("../src/features/cases/services/image-upload-complete-api.ts")
const { imageUploadPresentation } = await import("../src/features/cases/lib/image-upload-presentation.ts")
const { casesQueryKeys: keys } = await import("../src/features/cases/hooks/cases-query-keys.ts")
const fixture = clinicalUpload()
const file = (index = 0) => new File([index === 0 ? "png" : String(index).padStart(3, "0")], `synthetic-${index}.png`, { type: "image/png" })
const hashContents = async file => createHash("sha256").update(Buffer.from(await file.arrayBuffer())).digest("hex")
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
    hash: hashContents,
    createSession: async () => structuredClone(fixture.session), transport: async () => {},
    complete: async () => fixture.completed, cancel: async () => ({ phase: "cancelled" }), ...overrides,
  })
  return { client, queue, close: () => { queue.dispose(); client.clear() } }
}

test("identical bytes with different names are blocked in the same batch before creating or uploading a second session", async () => {
  let creates = 0, sends = 0
  const s = setup({ createSession: async () => { creates++; return structuredClone(fixture.session) },
    transport: async () => { sends++ } })
  try {
    const original = file()
    const copy = new File([original], "renamed.png", { type: original.type })
    s.queue.addFiles([original, copy, original])
    await until(s.queue, items => items.length === 3 && items[0].completed && items.slice(1).every(item => item.error === "DUPLICATE_FILE"))
    assert.equal(creates, 1); assert.equal(sends, 1)
    const duplicate = s.queue.getSnapshot()[1]
    assert.equal(duplicate.identity, null); assert.equal(duplicate.sessionAttempt, null)
    const presentation = imageUploadPresentation(duplicate)
    assert.equal(presentation.label, "duplicateFile")
    assert.equal(presentation.detail, undefined, "the longer explanation belongs in the toast")
    assert.equal(presentation.canRetry, false); assert.equal(presentation.canRemove, true)
    await s.queue.retry(duplicate.id)
    await s.queue.removeFile(duplicate.id)
    assert.equal(s.queue.getSnapshot().length, 2)
    assert.equal(creates, 1); assert.equal(sends, 1)
  } finally { s.close() }
})

test("selecting the same content later is blocked, while different content with the same filename is accepted", async () => {
  let creates = 0
  const s = setup({ createSession: async () => structuredClone(clinicalUpload(creates++).session),
    complete: async identity => ({ ...fixture.completed, ...identity }) })
  try {
    s.queue.addFiles([file()])
    await until(s.queue, items => items[0]?.completed)
    s.queue.addFiles([new File(["png"], "another-name.png", { type: "image/png" }),
      new File(["different"], file().name, { type: "image/png" })])
    await until(s.queue, items => items[1]?.error === "DUPLICATE_FILE" && items[2]?.completed)
    assert.equal(creates, 2)
  } finally { s.close() }
})

test("duplicate feedback announces once and dismisses only the copy after four seconds, without timer resets or backend deletion", async t => {
  let creates = 0, sends = 0, deletes = 0
  const s = setup({ createSession: async () => structuredClone(clinicalUpload(creates++).session),
    hash: async currentFile => { if (currentFile.name === file(2).name) throw new Error("HASH_FAILED"); return hashContents(currentFile) },
    transport: async () => { sends++ },
    cancel: async () => { deletes++; return { phase: "cancelled" } } })
  let stop = () => {}
  try {
    const [, duplicate, invalid] = s.queue.addFiles([file(), file(), file(2)])
    await until(s.queue, items => items[0]?.completed && items[1]?.error === "DUPLICATE_FILE" && items[2]?.phase === "error")
    t.mock.timers.enable({ apis: ["setTimeout"] })
    const notices = []
    stop = observeUploadSelectionFeedback(s.queue, item => notices.push(item.id))
    assert.deepEqual(notices, [duplicate])
    t.mock.timers.tick(1000)
    s.queue.addFiles([file(1)])
    await until(s.queue, items => items[3]?.completed)
    assert.deepEqual(notices, [duplicate], "other uploads must not repeat the toast")
    t.mock.timers.tick(2999)
    assert.ok(s.queue.getSnapshot().some(item => item.id === duplicate))
    t.mock.timers.tick(1)
    assert.equal(s.queue.getSnapshot().some(item => item.id === duplicate), false)
    assert.ok(s.queue.getSnapshot().some(item => item.id === invalid), "other errors must stay visible")
    assert.equal(s.queue.getSnapshot().filter(item => item.completed).length, 2)
    assert.equal(creates, 2); assert.equal(sends, 2); assert.equal(deletes, 0)
  } finally { stop(); s.close() }
})

test("duplicate feedback clears pending dismissal on cleanup or manual removal", async t => {
  const s = setup()
  let stop = () => {}
  try {
    const [, duplicate] = s.queue.addFiles([file(), file()])
    await until(s.queue, items => items[0]?.completed && items[1]?.error === "DUPLICATE_FILE")
    t.mock.timers.enable({ apis: ["setTimeout"] })
    let notices = 0
    stop = observeUploadSelectionFeedback(s.queue, () => { notices++ })
    stop()
    t.mock.timers.tick(5000)
    assert.ok(s.queue.getSnapshot().some(item => item.id === duplicate))
    stop = observeUploadSelectionFeedback(s.queue, () => { notices++ })
    await s.queue.removeFile(duplicate)
    t.mock.timers.tick(5000)
    assert.equal(s.queue.getSnapshot().length, 1)
    assert.ok(s.queue.getSnapshot()[0].completed)
    assert.equal(notices, 2)
  } finally { stop(); s.close() }
})

test("invalid selections have compact rows, one notice each and local dismissal without hashing or uploading", async t => {
  let hashes = 0, creates = 0, sends = 0, cancels = 0
  const s = setup({
    hash: async () => { hashes++; return fixture.session.sha256 },
    createSession: async () => { creates++; return structuredClone(fixture.session) },
    transport: async () => { sends++ }, cancel: async () => { cancels++; return { phase: "cancelled" } },
  })
  let stop = () => {}
  try {
    const oversized = new File(["png"], "large.png", { type: "image/png" })
    Object.defineProperty(oversized, "size", { value: 100 * 1024 * 1024 + 1 })
    const invalidFiles = [
      new File(["avif"], "scan.avif", { type: "image/avif" }),
      new File([], "empty.png", { type: "image/png" }),
      oversized,
      new File(["png"], "invalid/name.png", { type: "image/png" }),
      new File(["jpeg"], "scan.png", { type: "image/jpeg" }),
    ]
    s.queue.addFiles([file(), ...invalidFiles])
    await until(s.queue, items => items[0]?.completed && items.slice(1).length === 5 && items.slice(1).every(item => item.phase === "error"))
    t.mock.timers.enable({ apis: ["setTimeout"] })
    const notices = []
    stop = observeUploadSelectionFeedback(s.queue, item => notices.push({ id: item.id, error: item.error }))
    assert.deepEqual(notices.map(item => item.error), ["unsupported-type", "empty", "too-large", "invalid-name", "type-mismatch"])
    for (const item of s.queue.getSnapshot().slice(1)) {
      const presentation = imageUploadPresentation(item)
      assert.equal(presentation.label, "uploadFailed")
      assert.equal(presentation.detail, undefined, "the explanation is shown by Sonner")
      assert.equal(presentation.canRetry, false, "an unchanged invalid file cannot succeed on retry")
      assert.equal(presentation.canRemove, true)
    }
    t.mock.timers.tick(3999)
    assert.equal(s.queue.getSnapshot().length, 6)
    t.mock.timers.tick(1)
    assert.equal(s.queue.getSnapshot().length, 1)
    assert.ok(s.queue.getSnapshot()[0].completed)
    assert.equal(notices.length, 5)
    assert.equal(hashes, 1); assert.equal(creates, 1); assert.equal(sends, 1); assert.equal(cancels, 0)
  } finally { stop(); s.close() }
})

test("a confirmed deletion releases the checksum for a new selection without blocked copies reserving it", async () => {
  let creates = 0
  const s = setup({ createSession: async () => { creates++; return structuredClone(fixture.session) } })
  try {
    s.queue.addFiles([file(), file()])
    await until(s.queue, items => items[0]?.completed && items[1]?.error === "DUPLICATE_FILE")
    s.queue.forgetDeletedImages([fixture.identity.imageId])
    s.queue.addFiles([file()])
    await until(s.queue, items => items.length === 2 && items[1]?.completed)
    assert.equal(creates, 2)
  } finally { s.close() }
})

test("an uncertain creation reserves its checksum but retrying that original uses its own idempotent request", async () => {
  let creates = 0
  const attempts = []
  const s = setup({ createSession: async (_, input, key) => {
    attempts.push({ input, key })
    if (++creates === 1) throw new ImageUploadSessionError("NETWORK_ERROR", true)
    return structuredClone(fixture.session)
  } })
  try {
    const [original] = s.queue.addFiles([file(), file()])
    await until(s.queue, items => items[0]?.error === "NETWORK_ERROR" && items[1]?.error === "DUPLICATE_FILE")
    assert.equal(creates, 1)
    await s.queue.retry(original)
    await until(s.queue, items => items[0]?.completed)
    assert.deepEqual(attempts[0], attempts[1])
    assert.equal(creates, 2)
  } finally { s.close() }
})

test("a definitive creation refusal does not reserve content that was never accepted", async () => {
  let creates = 0
  const s = setup({ createSession: async () => {
    if (++creates === 1) throw new ImageUploadSessionError("IMAGE_UPLOAD_LIMIT_EXCEEDED", false)
    return structuredClone(fixture.session)
  } })
  try {
    s.queue.addFiles([file(), file()])
    await until(s.queue, items => items[0]?.error === "IMAGE_UPLOAD_LIMIT_EXCEEDED" && items[1]?.completed)
    assert.equal(creates, 2)
  } finally { s.close() }
})

test("the same content is allowed in independent case queues", async () => {
  const client = new QueryClient()
  let creates = 0
  const dependencies = { hash: hashContents,
    createSession: async caseId => { creates++; return { ...structuredClone(fixture.session), caseId } },
    transport: async () => {}, complete: async identity => ({ ...fixture.completed, ...identity }),
    cancel: async () => ({ phase: "cancelled" }) }
  const first = createCaseFileUploadQueue(fixture.caseId, client, dependencies)
  const second = createCaseFileUploadQueue("00000000-0000-4000-8000-000000000065", client, dependencies)
  try {
    first.addFiles([file()]); second.addFiles([file()])
    await Promise.all([until(first, items => items[0]?.completed), until(second, items => items[0]?.completed)])
    assert.equal(creates, 2)
  } finally { first.dispose(); second.dispose(); client.clear() }
})

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
  const s = setup({ hash: async () => fixture.session.sha256,
    createSession: (caseId, input, key, options) => createImageUploadSession(caseId, input, key, { ...options,
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
