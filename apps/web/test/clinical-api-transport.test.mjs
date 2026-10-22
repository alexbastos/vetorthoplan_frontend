import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { shortCircuit: true, url: "data:text/javascript," }
    }

    if (specifier.startsWith(".") && !/\.(?:[cm]?[jt]s|json)$/.test(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context)
      } catch {
        // Let Node report the original resolution error.
      }
    }

    return nextResolve(specifier, context)
  },
})

const { ApiHttpClient } = await import("../../../packages/api-client/src/http-client.ts")
const { createClinicalApiClient } = await import("../src/lib/server/clinical-api.ts")
const { getClinicalServerEnvironment } = await import("../src/lib/server/environment.ts")

const localEnvironment = {
  CLINICAL_API_BASE_URL: "http://127.0.0.1:8000",
  CLINICAL_API_IDENTITY_MODE: "local",
  NODE_ENV: "development",
}

test("clinical identity mode is explicit and restricted to development/test", () => {
  assert.deepEqual(getClinicalServerEnvironment(localEnvironment), {
    clinicalApiBaseUrl: "http://127.0.0.1:8000",
    identityMode: "local",
  })
  assert.equal(getClinicalServerEnvironment({ ...localEnvironment, NODE_ENV: "test" }).identityMode, "local")

  for (const NODE_ENV of ["production", "staging", undefined]) {
    assert.throws(
      () => getClinicalServerEnvironment({ ...localEnvironment, NODE_ENV }),
      /CLINICAL_API_IDENTITY_MODE/,
    )
  }

  assert.throws(
    () => getClinicalServerEnvironment({ ...localEnvironment, CLINICAL_API_IDENTITY_MODE: undefined }),
    /CLINICAL_API_IDENTITY_MODE/,
  )
})

test("clinical API URL must be a canonical, protected server origin", () => {
  for (const CLINICAL_API_BASE_URL of [
    "http://clinical.example.test",
    "http://127.0.0.1:8000/docs",
    "http://127.0.0.1:8000?x=1",
    "http://user:password@127.0.0.1:8000",
  ]) {
    assert.throws(
      () => getClinicalServerEnvironment({ ...localEnvironment, CLINICAL_API_BASE_URL }),
      /CLINICAL_API_BASE_URL/,
    )
  }
  assert.equal(
    getClinicalServerEnvironment({ ...localEnvironment, CLINICAL_API_BASE_URL: "http://localhost:8000/" })
      .clinicalApiBaseUrl,
    "http://localhost:8000",
  )
})

test("clinical client uses server URL without sending browser credentials or identity IDs", async () => {
  const calls = []
  const client = createClinicalApiClient({
    environment: localEnvironment,
    fetch: async (url, init) => {
      calls.push({ url: String(url), init })
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { "content-type": "application/json" },
        status: 200,
      })
    },
  })

  const result = await client.request({ method: "get", path: "/health/live" })

  assert.equal(result.status, 200)
  assert.deepEqual(result.data, { status: "ok" })
  assert.equal(calls[0].url, "http://127.0.0.1:8000/health/live")
  assert.equal(calls[0].init.cache, "no-store")
  assert.equal(calls[0].init.redirect, "manual")
  assert.equal(calls[0].init.headers.get("authorization"), null)
  assert.equal(calls[0].init.headers.get("cookie"), null)
  assert.equal(calls[0].init.headers.get("x-tenant-id"), null)
  assert.equal(calls[0].init.headers.get("x-actor-id"), null)
})

test("clinical transport preserves 401/403 status for the BFF to translate", async () => {
  for (const status of [401, 403]) {
    const client = new ApiHttpClient({
      baseUrl: "http://127.0.0.1:8000",
      fetch: async () => new Response(JSON.stringify({ code: "REMOTE_CODE", message: "private" }), {
        headers: { "content-type": "application/json" },
        status,
      }),
    })

    const result = await client.request({ method: "get", path: "/health/live" })
    assert.equal(result.status, status)
  }
})

test("clinical transport stops on timeout and malformed JSON", async () => {
  const slowClient = new ApiHttpClient({
    baseUrl: "http://127.0.0.1:8000",
    timeoutMs: 5,
    fetch: (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true })
    }),
  })
  await assert.rejects(slowClient.request({ method: "get", path: "/health/live" }))

  const malformedClient = new ApiHttpClient({
    baseUrl: "http://127.0.0.1:8000",
    fetch: async () => new Response("{bad json", {
      headers: { "content-type": "application/json" },
      status: 200,
    }),
  })
  await assert.rejects(malformedClient.request({ method: "get", path: "/health/live" }), SyntaxError)
})
