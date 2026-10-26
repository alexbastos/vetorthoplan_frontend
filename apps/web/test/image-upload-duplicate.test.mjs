import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { registerHooks } from "node:module"
import test from "node:test"
import { QueryClient } from "@tanstack/react-query"
import { clinicalUpload } from "./fixtures/clinical-upload.mjs"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript," }
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })

const { createImageUploadSessionForBff } = await import("../src/lib/server/image-upload-session-bff.ts")
const { ApiHttpClient } = await import("../../../packages/api-client/src/http-client.ts")
const { createImageUploadSession } = await import("../src/features/cases/services/image-upload-session-api.ts")
const { createCaseFileUploadQueue } = await import("../src/features/cases/lib/case-file-upload-queue.ts")
const { imageUploadPresentation } = await import("../src/features/cases/lib/image-upload-presentation.ts")
const { observeUploadSelectionFeedback } = await import("../src/features/cases/lib/upload-selection-feedback.ts")
const { casesQueryKeys: keys } = await import("../src/features/cases/hooks/cases-query-keys.ts")
const fixture = clinicalUpload()
const file = () => new File(["synthetic-content"], "renamed-copy.png", { type: "image/png" })
const hash = async file => createHash("sha256").update(Buffer.from(await file.arrayBuffer())).digest("hex")
const duplicate = { code: "IMAGE_UPLOAD_DUPLICATE", message: "private-provider-message",
  trace_id: "private-trace", details: { existing_image_id: fixture.image.id, storage_key: "private-object" } }

function until(queue, predicate) {
  if (predicate(queue.getSnapshot())) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { off(); reject(new Error("Queue condition timed out")) }, 2_000)
    const off = queue.subscribe(() => { if (predicate(queue.getSnapshot())) { clearTimeout(timer); off(); resolve() } })
  })
}

function connect(responder) {
  const browserCalls = [], clinicalCalls = []
  const client = new ApiHttpClient({ baseUrl: "https://clinical.example", fetch: async (url, init) => {
    clinicalCalls.push({ url: String(url), key: init.headers.get("idempotency-key"), input: JSON.parse(init.body) })
    return responder(clinicalCalls.length)
  } })
  return { browserCalls, clinicalCalls,
    createSession: (caseId, input, key, options) => createImageUploadSession(caseId, input, key, { ...options,
      fetchImpl: async (url, init) => {
        browserCalls.push({ url, key: new Headers(init.headers).get("idempotency-key") })
        assert.equal(url, `/api/cases/${fixture.caseId}/image-uploads`)
        assert.equal(init.credentials, "same-origin")
        const result = await createImageUploadSessionForBff(caseId, JSON.parse(init.body),
          new Headers(init.headers).get("idempotency-key"), (path, body, headers, signal) => client.request({
            method: "post", path: "/api/v1/cases/{case_id}/image-uploads", pathParams: path, body, headers, signal,
          }), init.signal)
        return Response.json(result.body, { status: result.status })
      },
    }),
  }
}

function setup(connection) {
  const client = new QueryClient()
  const queue = createCaseFileUploadQueue(fixture.caseId, client, { hash, createSession: connection.createSession,
    transport: async () => assert.fail("a refused copy must not send bytes"),
    complete: async () => assert.fail("a refused copy must not confirm an upload"),
    cancel: async () => assert.fail("a refused copy must not cancel the existing upload"),
  })
  return { client, queue, close() { queue.dispose(); client.clear() } }
}

test("duplicate conflicts cross the BFF with a safe nonretryable code, with or without an existing image ID", async () => {
  const input = { original_filename: "image.png", media_type: "image/png", size_bytes: 3, sha256: "a".repeat(64) }
  for (const data of [duplicate, { code: duplicate.code }, { ...duplicate, details: { existing_image_id: "malformed" } }]) {
    let calls = 0
    const result = await createImageUploadSessionForBff(fixture.caseId, input, "synthetic-key", async () => {
      calls++; return { status: 409, data }
    })
    assert.deepEqual(result, { status: 409, body: { error: { code: "IMAGE_UPLOAD_DUPLICATE", retryable: false } } })
    assert.equal(calls, 1)
    assert.equal(JSON.stringify(result).includes(fixture.image.id), false, "the browser does not need ownership of the existing image")
  }
})

test("a fresh queue handles a backend duplicate with compact feedback and local dismissal, preserving persisted data", async t => {
  const connection = connect(() => Response.json(duplicate, { status: 409 }))
  const s = setup(connection)
  let stop = () => {}
  try {
    const existing = [{ ...fixture.image, status: "READY" }]
    s.client.setQueryData(keys.images(fixture.caseId), existing)
    s.client.setQueryData(keys.activeIngestions(fixture.caseId), [{ ...fixture.identity, jobId: fixture.jobId }])
    const [id] = s.queue.addFiles([file()])
    await until(s.queue, items => items[0]?.error === "DUPLICATE_FILE")
    const item = s.queue.getSnapshot()[0]
    assert.equal(item.id, id)
    for (const field of ["identity", "persisted", "completed", "sessionAttempt"]) assert.equal(item[field], null)
    assert.deepEqual(imageUploadPresentation(item), { state: "error", label: "duplicateFile", canRemove: true, canRetry: false })
    await s.queue.retry(id)
    assert.equal(connection.browserCalls.length, 1)
    assert.equal(connection.clinicalCalls.length, 1)
    assert.equal(connection.clinicalCalls[0].url, `https://clinical.example/api/v1/cases/${fixture.caseId}/image-uploads`)
    assert.equal(connection.clinicalCalls[0].input.sha256, await hash(file()))

    t.mock.timers.enable({ apis: ["setTimeout"] })
    const notices = []
    stop = observeUploadSelectionFeedback(s.queue, item => notices.push(item.error))
    assert.deepEqual(notices, ["DUPLICATE_FILE"])
    t.mock.timers.tick(3999)
    assert.equal(s.queue.getSnapshot().length, 1)
    t.mock.timers.tick(1)
    assert.equal(s.queue.getSnapshot().length, 0)
    assert.deepEqual(s.client.getQueryData(keys.images(fixture.caseId)), existing)
    assert.equal(s.client.getQueryData(keys.activeIngestions(fixture.caseId)).length, 1)
    assert.equal(connection.clinicalCalls.length, 1, "dismissal does not mutate persisted images or sessions")
  } finally { stop(); s.close() }
})

test("cancelling while creation returns duplicate drops only the local row without replaying or deleting", async () => {
  let release
  const response = new Promise(resolve => { release = resolve })
  const connection = connect(() => response)
  const s = setup(connection)
  try {
    const [id] = s.queue.addFiles([file()])
    await until(s.queue, items => items[0]?.phase === "creating")
    const cancellation = s.queue.removeFile(id)
    release(Response.json(duplicate, { status: 409 }))
    await cancellation
    assert.equal(s.queue.getSnapshot().length, 0)
    assert.equal(connection.browserCalls.length, 1)
    assert.equal(connection.clinicalCalls.length, 1)
  } finally { s.close() }
})

test("a lost creation retries only the original key; a subsequent duplicate refusal releases the attempt and cannot retry again", async () => {
  const connection = connect(count => {
    if (count === 1) throw new TypeError("response lost")
    return Response.json(duplicate, { status: 409 })
  })
  const s = setup(connection)
  try {
    const [id] = s.queue.addFiles([file()])
    await until(s.queue, items => items[0]?.error === "SERVICE_UNAVAILABLE")
    assert.ok(s.queue.getSnapshot()[0].sessionAttempt)
    await s.queue.retry(id)
    await until(s.queue, items => items[0]?.error === "DUPLICATE_FILE")
    assert.equal(s.queue.getSnapshot()[0].sessionAttempt, null)
    assert.equal(connection.clinicalCalls.length, 2)
    assert.deepEqual(connection.clinicalCalls[0], connection.clinicalCalls[1])
    await s.queue.retry(id)
    await s.queue.removeFile(id)
    assert.equal(s.queue.getSnapshot().length, 0)
    assert.equal(connection.clinicalCalls.length, 2)
  } finally { s.close() }
})
