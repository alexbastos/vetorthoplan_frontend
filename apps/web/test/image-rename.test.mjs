import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"
import { QueryClient } from "@tanstack/react-query"
import { clinicalUpload } from "./fixtures/clinical-upload.mjs"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript," }
  if (specifier === "next/server") return nextResolve("next/server.js", context)
  if (context.parentURL?.includes("/node_modules/")) return nextResolve(specifier, context)
  if (context.parentURL?.endsWith("/cases-bff-route.ts")) {
    if (specifier === "./session") return { shortCircuit: true, url: "data:text/javascript,export const resolveServerSession = options => globalThis.imageRenameTestSession(options)" }
    if (specifier === "./authentication-api") return { shortCircuit: true, url: "data:text/javascript,export const createAuthenticationApiClient = () => ({})" }
    if (specifier === "./auth-bff-route") return { shortCircuit: true, url: "data:text/javascript,export const getForwardedClientMetadata = () => ({}); export const createUnauthenticatedResponse = () => globalThis.imageRenameTestAnonymous()" }
  }
  if (specifier.startsWith("@/")) return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context)
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })

const { NextRequest, NextResponse } = await import("next/server.js")
const { renameImageForBff } = await import("../src/lib/server/image-rename-bff.ts")
const { renameCaseImage, ImageRenameError } = await import("../src/features/cases/services/image-rename-api.ts")
const { requestImageRename, isImageRenameLocked } = await import("../src/features/cases/lib/image-renaming.ts")
const { casesQueryKeys: keys } = await import("../src/features/cases/hooks/cases-query-keys.ts")
const imageRoute = await import("../src/app/api/cases/[caseId]/images/[imageId]/route.ts")
const { caseId, identity, image, rawImage } = clinicalUpload()
const app = "http://localhost:3000"
const renamedName = "renamed.png"
const read = data => async () => ({ status: 200, data })
const unexpected = () => assert.fail("must not mutate")

test("PATCH BFF verifies case membership, preserves extension, maps the typed payload, and projects only safe fields", async () => {
  const calls = []
  const signal = new AbortController().signal
  const renamed = { ...rawImage, display_name: renamedName, sha256: "b".repeat(64), metadata: { private: "provider-data" } }
  const result = await renameImageForBff(caseId, identity.imageId, { display_name: renamedName },
    async (path, passed) => { calls.push({ method: "GET", path }); assert.equal(passed, signal); return { status: 200, data: rawImage } },
    async (path, body, passed) => { calls.push({ method: "PATCH", path, body }); assert.equal(passed, signal); return { status: 200, data: renamed } }, signal)

  assert.equal(result.status, 200)
  assert.equal(result.body.id, identity.imageId)
  assert.equal(result.body.caseId, caseId)
  assert.equal(result.body.displayName, renamedName)
  assert.deepEqual(calls, [
    { method: "GET", path: { image_id: identity.imageId } },
    { method: "PATCH", path: { image_id: identity.imageId }, body: { display_name: renamedName } },
  ])
  assert.equal(JSON.stringify(result).includes("private-checksum"), false)
  assert.equal(JSON.stringify(result).includes("b".repeat(64)), false)
  assert.equal(JSON.stringify(result).includes("provider-data"), false)

  const badName = await renameImageForBff(caseId, identity.imageId, { display_name: "renamed.jpg" }, read(rawImage), unexpected)
  assert.equal(badName.status, 422)
  assert.equal((await renameImageForBff(caseId, identity.imageId, { display_name: "  .png" }, read(rawImage), unexpected)).status, 422)
  assert.equal((await renameImageForBff(caseId, identity.imageId, { display_name: "x".repeat(256) }, read(rawImage), unexpected)).status, 400)
})

test("invalid IDs, cross-case images, and mismatched PATCH responses never produce a successful rename", async () => {
  assert.equal((await renameImageForBff("../case", identity.imageId, { display_name: renamedName }, unexpected, unexpected)).status, 400)
  assert.equal((await renameImageForBff(caseId, "../image", { display_name: renamedName }, unexpected, unexpected)).status, 400)
  const other = clinicalUpload(1)
  assert.equal((await renameImageForBff(caseId, identity.imageId, { display_name: renamedName }, read(other.rawImage), unexpected)).status, 404)
  assert.equal((await renameImageForBff(caseId, identity.imageId, { display_name: renamedName }, read(rawImage), async () => ({ status: 200, data: { ...rawImage, id: other.identity.imageId, display_name: renamedName } }))).status, 502)
  assert.equal((await renameImageForBff(caseId, identity.imageId, { display_name: renamedName }, read(rawImage), async () => ({ status: 200, data: { ...rawImage, display_name: "different.png" } }))).status, 502)
})

test("upstream errors are sanitized and retain only the public status category", async () => {
  for (const [status, expected] of [[404, 404], [403, 403], [422, 422], [401, 503], [503, 503]]) {
    const result = await renameImageForBff(caseId, identity.imageId, { display_name: renamedName }, read(rawImage), async () => ({
      status, data: { detail: "private provider response", signed_url: "https://storage.example/private", trace_id: "private-trace" },
    }))
    assert.equal(result.status, expected)
    assert.equal(JSON.stringify(result).includes("private"), false)
    assert.equal(JSON.stringify(result).includes("storage.example"), false)
  }
  assert.equal((await renameImageForBff(caseId, identity.imageId, { display_name: renamedName }, read(rawImage), async () => { throw new Error("private transport detail") })).status, 503)
})

test("browser PATCH is same-origin JSON and rejects a response for another image or case", async () => {
  const signal = new AbortController().signal
  const projection = { ...image, displayName: renamedName }
  const result = await renameCaseImage(caseId, identity.imageId, renamedName, { signal, fetchImpl: async (url, init) => {
    assert.equal(url, `/api/cases/${caseId}/images/${identity.imageId}`)
    assert.equal(init.method, "PATCH")
    assert.equal(init.credentials, "same-origin")
    assert.equal(init.cache, "no-store")
    assert.equal(init.signal, signal)
    assert.equal(new Headers(init.headers).get("content-type"), "application/json")
    assert.deepEqual(JSON.parse(init.body), { display_name: renamedName })
    return Response.json(projection, { status: 200 })
  } })
  assert.deepEqual(result, { id: identity.imageId, caseId, displayName: renamedName })

  await assert.rejects(renameCaseImage(caseId, identity.imageId, renamedName, { fetchImpl: async () => Response.json({
    ...projection, id: clinicalUpload(1).identity.imageId,
  }, { status: 200 }) }), error => error instanceof ImageRenameError && error.code === "INVALID_RESPONSE")
})

test("authenticated PATCH enforces same-origin security, validates ownership, and keeps backend details private", async () => {
  const previousFetch = globalThis.fetch
  const previousEnv = { ...process.env }
  const calls = []
  const secret = Buffer.alloc(32, 7).toString("base64url")
  Object.assign(process.env, {
    NODE_ENV: "test", APP_ORIGIN: app, AUTHENTICATION_API_BASE_URL: "https://auth.example",
    CLINICAL_API_BASE_URL: "http://127.0.0.1:8000", CLINICAL_API_IDENTITY_MODE: "local",
    SESSION_COOKIE_SECRET: secret, OAUTH_TRANSACTION_SECRET: Buffer.alloc(32, 8).toString("base64url"),
  })
  delete process.env.SESSION_COOKIE_PREVIOUS_SECRET
  globalThis.imageRenameTestSession = async () => ({ state: "authenticated", accessToken: "general-token", user: { id: "user-one" } })
  globalThis.imageRenameTestAnonymous = () => NextResponse.json({ error: { code: "SESSION_UNAVAILABLE", retryable: false } }, { status: 401 })
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })
    if (init.method === "GET") return Response.json(rawImage)
    return Response.json({ ...rawImage, display_name: renamedName, sha256: "b".repeat(64), metadata: { private: "provider-data" } })
  }
  const request = (headers = { origin: app, "content-type": "application/json" }, body = { display_name: renamedName }) => new NextRequest(
    `${app}/api/cases/${caseId}/images/${identity.imageId}`,
    { method: "PATCH", headers, body: JSON.stringify(body) },
  )
  try {
    const response = await imageRoute.PATCH(request(), { params: Promise.resolve({ caseId, imageId: identity.imageId }) })
    assert.equal(response.status, 200)
    const projected = await response.json()
    assert.equal(projected.displayName, renamedName)
    assert.equal(JSON.stringify(projected).includes("b".repeat(64)), false)
    assert.equal(JSON.stringify(projected).includes("provider-data"), false)
    assert.equal(calls.length, 2)
    assert.deepEqual(calls.map(call => call.init.method), ["GET", "PATCH"])
    assert.deepEqual(calls.map(call => call.url), [
      `http://127.0.0.1:8000/api/v1/images/${identity.imageId}`,
      `http://127.0.0.1:8000/api/v1/images/${identity.imageId}`,
    ])
    assert.deepEqual(JSON.parse(calls[1].init.body), { display_name: renamedName })
    assert.equal(JSON.stringify(calls).includes("general-token"), false)

    const before = calls.length
    const rejected = await imageRoute.PATCH(request({ origin: "https://untrusted.example", "content-type": "application/json" }), { params: Promise.resolve({ caseId, imageId: identity.imageId }) })
    assert.equal(rejected.status, 403)
    assert.equal(calls.length, before)

    globalThis.imageRenameTestSession = async () => ({ state: "anonymous", reason: "missing" })
    const anonymous = await imageRoute.PATCH(request(), { params: Promise.resolve({ caseId, imageId: identity.imageId }) })
    assert.equal(anonymous.status, 401)
    assert.equal(calls.length, before)
  } finally {
    globalThis.fetch = previousFetch
    delete globalThis.imageRenameTestSession
    delete globalThis.imageRenameTestAnonymous
    for (const key of Object.keys(process.env)) if (!Object.hasOwn(previousEnv, key)) delete process.env[key]
    Object.assign(process.env, previousEnv)
  }
})

test("rename publishes a lock, deduplicates clicks, updates image cache, and invalidates the image query", async () => {
  const client = new QueryClient()
  const other = clinicalUpload(1)
  client.setQueryData(keys.images(caseId), [image, other.image])
  let started, release
  const began = new Promise(resolve => { started = resolve })
  const barrier = new Promise(resolve => { release = resolve })
  let calls = 0
  const fetchImpl = async (url, init) => {
    calls++
    assert.equal(init.method, "PATCH")
    started()
    await barrier
    return Response.json({ ...image, displayName: renamedName }, { status: 200 })
  }
  try {
    const first = requestImageRename(client, image, renamedName, { fetchImpl })
    assert.equal(first, requestImageRename(client, image, renamedName, { fetchImpl }))
    await began
    assert.equal(isImageRenameLocked(client, caseId, identity.imageId), true)
    assert.equal(client.getQueryData(keys.imageRename(caseId, identity.imageId)).phase, "renaming")
    release()
    assert.deepEqual(await first, { id: identity.imageId, caseId, displayName: renamedName })
    assert.equal(calls, 1)
    assert.equal(client.getQueryData(keys.images(caseId))[0].displayName, renamedName)
    assert.equal(client.getQueryData(keys.images(caseId))[1], other.image)
    assert.equal(client.getQueryState(keys.images(caseId)).isInvalidated, true)
    assert.equal(client.getQueryData(keys.imageRename(caseId, identity.imageId)).phase, "renamed")
  } finally {
    release()
    client.clear()
  }
})

test("rename cannot begin while image or case deletion is active", async () => {
  for (const [key, state] of [
    [keys.imageDeletion(caseId, identity.imageId), { phase: "deleting" }],
    [keys.caseDeletion(caseId), { phase: "uncertain" }],
  ]) {
    const client = new QueryClient()
    client.setQueryData(key, state)
    try {
      assert.equal(isImageRenameLocked(client, caseId, identity.imageId), true)
      await assert.rejects(requestImageRename(client, image, renamedName, { fetchImpl: unexpected }), error => error instanceof ImageRenameError && error.code === "OPERATION_BLOCKED")
    } finally { client.clear() }
  }
})

test("a late rename response after case deletion cannot recreate the case image cache", async () => {
  const client = new QueryClient()
  client.setQueryData(keys.images(caseId), [image])
  let started, release
  const began = new Promise(resolve => { started = resolve })
  const barrier = new Promise(resolve => { release = resolve })
  const action = requestImageRename(client, image, renamedName, { fetchImpl: async () => {
    started()
    await barrier
    return Response.json({ ...image, displayName: renamedName }, { status: 200 })
  } })
  await began
  client.removeQueries({ queryKey: keys.images(caseId), exact: true })
  client.removeQueries({ queryKey: keys.imageRename(caseId, identity.imageId), exact: true })
  client.setQueryData(keys.caseDeletion(caseId), { phase: "deleted" })
  try {
    release()
    await action
    assert.equal(client.getQueryData(keys.images(caseId)), undefined)
    assert.equal(client.getQueryData(keys.imageRename(caseId, identity.imageId)), undefined)
  } finally {
    release()
    client.clear()
  }
})
