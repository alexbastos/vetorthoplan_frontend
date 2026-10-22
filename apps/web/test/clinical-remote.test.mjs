import assert from "node:assert/strict"
import test from "node:test"
import { checkClinicalRemote } from "../scripts/check-clinical-remote.mjs"

const origin = "https://clinical.example"
const publicResponses = {
  "/health/live": { status: "ok" }, "/health/ready": { status: "ready", database: "ok" },
  "/health/authentication_api": { status: "ok", timestamp: "irrelevant" },
  "/openapi.json": { openapi: "3.1.0", paths: { "/api/v1/cases": { get: {} } } },
  "/docs/authentication_api/json": { openapi: "3.1.0", paths: {
    "/authentication_api/api/v1/auth/login": { post: {} }, "/authentication_api/api/v1/organizations": { get: {} },
  } },
}

test("healthy services do not imply that organization-token exchange, clinical access or storage work", async () => {
  const paths = []
  const report = await checkClinicalRemote({ origin, fetchImpl: async (url, init) => {
    const path = new URL(url).pathname; paths.push(path)
    assert.equal(new URL(url).origin, origin)
    assert.equal(init.method, "GET"); assert.equal(init.body, undefined)
    assert.equal(init.credentials, "omit"); assert.equal(init.redirect, "manual"); assert.equal(init.cache, "no-store")
    assert.deepEqual(init.headers, { accept: "application/json" })
    return Response.json(publicResponses[path])
  } })
  assert.equal(paths.length, 5)
  assert.ok(report.health.every(result => result.ok))
  assert.deepEqual(report.pending, ["ORGANIZATION_TOKEN_UNDOCUMENTED"])
  assert.equal(report.publicChecksPassed, false)
  assert.equal(report.authenticatedClinicalFlowVerified, false)
  assert.equal(report.storageCorsAndWorkerVerified, false)
})

test("contract presence passes only public checks and never implies authenticated integration", async () => {
  const responses = structuredClone(publicResponses)
  responses["/docs/authentication_api/json"].paths["/authentication_api/api/v1/auth/organizations/{orgId}/token"] = { post: {} }
  const report = await checkClinicalRemote({ origin, fetchImpl: async url => Response.json(responses[new URL(url).pathname]) })
  assert.equal(report.publicChecksPassed, true)
  assert.equal(report.authenticatedClinicalFlowVerified, false)
  assert.deepEqual(report.pending, [])
})

test("unready dependencies, redirects, malformed JSON and network failure cannot be mistaken for availability or leak upstream bodies", async () => {
  const report = await checkClinicalRemote({ origin, fetchImpl: async url => {
    switch (new URL(url).pathname) {
      case "/health/live": return new Response(null, { status: 302, headers: { location: "https://private.example" } })
      case "/health/ready": return Response.json({ status: "not_ready", database: "error", secret: "private-storage" })
      case "/health/authentication_api": throw new Error("private-credential")
      case "/openapi.json": return new Response("bad JSON", { status: 200 })
      default: return Response.json({ private: "private-credential" })
    }
  } })
  assert.equal(report.publicChecksPassed, false)
  assert.ok(report.health.every(result => !result.ok))
  assert.equal(JSON.stringify(report).includes("private"), false)
  assert.ok(report.pending.includes("PUBLIC_CONTRACT_UNAVAILABLE"))
})

test("rejects Swagger paths, query credentials, fragments and non-loopback HTTP before any fetch", async () => {
  for (const origin of ["https://clinical.example/docs", "https://clinical.example?token=private", "https://user:password@clinical.example", "https://clinical.example#token", "http://clinical.example"]) {
    await assert.rejects(checkClinicalRemote({ origin, fetchImpl: () => assert.fail("invalid origin must not be contacted") }))
  }
})
