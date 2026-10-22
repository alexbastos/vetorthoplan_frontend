import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"
import { QueryClient } from "@tanstack/react-query"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript," }
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })
const { retryIngestionJobForBff } = await import("../src/lib/server/ingestion-job-retry-bff.ts")
const { ApiHttpClient } = await import("../../../packages/api-client/src/http-client.ts")
const { getIngestionJobForBff } = await import("../src/lib/server/ingestion-job-bff.ts")
const { requestIngestionRetry } = await import("../src/features/cases/lib/ingestion-job-retry.ts")
const { casesQueryKeys } = await import("../src/features/cases/hooks/cases-query-keys.ts")
const caseId = "00000000-0000-4000-8000-000000000064"
const jobId = "00000000-0000-4000-8000-000000000126"
const otherId = "00000000-0000-4000-8000-000000000999"
const job = { id: jobId, case_id: caseId, image_id: "00000000-0000-4000-8000-000000000125",
  upload_id: "00000000-0000-4000-8000-000000000124", status: "FAILED", attempts: 1, error_code: "processing_failed",
  created_at: "2026-10-20T12:00:00Z", updated_at: "2026-10-20T12:00:02Z", started_at: "2026-10-20T12:00:01Z", finished_at: "2026-10-20T12:00:02Z" }
const queued = { ...job, status: "QUEUED", error_code: null, started_at: null, finished_at: null, updated_at: "2026-10-20T12:01:00Z" }

test("retry verifies case ownership and FAILED before POST, forwards signal, and returns the same job's public projection", async () => {
  const calls = []
  const signal = new AbortController().signal
  const client = new ApiHttpClient({ baseUrl: "https://clinical.example", fetch: async (url, init) => {
    calls.push({ url: String(url), init })
    return Response.json(init.method === "POST" ? { ...queued, private_metadata: "secret" } : job, { status: init.method === "POST" ? 202 : 200 })
  } })
  const result = await retryIngestionJobForBff(caseId, jobId,
    (pathParams, signal) => client.request({ method: "get", path: "/api/v1/jobs/{job_id}", pathParams, signal }),
    (pathParams, signal) => client.request({ method: "post", path: "/api/v1/jobs/{job_id}/retry", pathParams, signal }), signal)
  assert.equal(result.status, 202)
  assert.equal(result.body.id, jobId)
  assert.equal(result.body.caseId, caseId)
  assert.equal(result.body.imageId, job.image_id)
  assert.equal(result.body.uploadId, job.upload_id)
  assert.equal(result.body.status, "QUEUED")
  assert.equal(JSON.stringify(result).includes("secret"), false)
  assert.deepEqual(calls.map(call => call.init.method), ["GET", "POST"])
  assert.equal(calls[1].url, `https://clinical.example/api/v1/jobs/${jobId}/retry`)
  assert.equal(calls[1].init.body, undefined)
  assert.equal(calls[1].init.headers.has("authorization"), false)
  assert.equal(calls[1].init.headers.has("content-type"), false)
  assert.equal(calls[1].init.cache, "no-store")
  let received
  await retryIngestionJobForBff(caseId, jobId, async (_, passed) => { assert.equal(passed, signal); return { status: 200, data: job } },
    async (path, passed) => { received = [path, passed]; return { status: 202, data: queued } }, signal)
  assert.deepEqual(received, [{ job_id: jobId }, signal])
})

test("bad IDs, other-case jobs, missing jobs, malformed jobs and non-FAILED states never issue a mutation", async () => {
  let writes = 0, reads = 0
  const writer = async () => { writes++; return { status: 202, data: queued } }
  for (const [caseKey, jobKey] of [["../case", jobId], [caseId, "../job"]]) {
    assert.equal((await retryIngestionJobForBff(caseKey, jobKey, async () => { reads++; return { status: 200, data: job } }, writer)).status, 400)
  }
  assert.equal(reads, 0)
  for (const [data, expected] of [[{ ...job, case_id: otherId }, 404], [{ ...job, id: otherId }, 502],
    [{ ...job, attempts: -1 }, 502], ...["QUEUED", "PROCESSING", "SUCCEEDED", "REJECTED"].map(status => [{ ...job, status }, 409])]) {
    assert.equal((await retryIngestionJobForBff(caseId, jobId, async () => ({ status: 200, data }), writer)).status, expected)
  }
  assert.equal((await retryIngestionJobForBff(caseId, jobId, async () => ({ status: 404, data: { message: "private" } }), writer)).status, 404)
  assert.equal(writes, 0)
})

test("retry rejects changed case/job/image/upload links and accepts processing that already advanced", async () => {
  for (const field of ["id", "case_id", "image_id", "upload_id"]) {
    assert.equal((await retryIngestionJobForBff(caseId, jobId, async () => ({ status: 200, data: job }),
      async () => ({ status: 202, data: { ...queued, [field]: otherId } }))).status, 502)
  }
  for (const status of ["QUEUED", "PROCESSING", "SUCCEEDED", "REJECTED", "FAILED"]) {
    const result = await retryIngestionJobForBff(caseId, jobId, async () => ({ status: 200, data: job }),
      async () => ({ status: 202, data: { ...queued, status } }))
    assert.equal(result.status, 202)
    assert.equal(result.body.status, status)
  }
})

test("404/409 and operational failures become safe BFF errors, including a race after the ownership read", async () => {
  for (const [status, expected, code] of [[404, 404, "JOB_NOT_FOUND"], [409, 409, "JOB_RETRY_NOT_ALLOWED"],
    [403, 403, "ACCESS_DENIED"], [422, 400, "VALIDATION_ERROR"], [401, 503, "SERVICE_UNAVAILABLE"], [429, 503, "SERVICE_UNAVAILABLE"],
    [500, 503, "SERVICE_UNAVAILABLE"], [200, 502, "INVALID_RESPONSE"]]) {
    const result = await retryIngestionJobForBff(caseId, jobId, async () => ({ status: 200, data: job }),
      async () => ({ status, data: { message: "private bucket", trace_id: "private" } }))
    assert.equal(result.status, expected)
    assert.equal(result.body.error.code, code)
    assert.equal(JSON.stringify(result).includes("private"), false)
  }
  for (const [error, status] of [[new Error("private network"), 503], [new SyntaxError("private"), 502]]) {
    assert.equal((await retryIngestionJobForBff(caseId, jobId, async () => ({ status: 200, data: job }), async () => { throw error })).status, status)
  }
  const aborted = new AbortController(); aborted.abort()
  let writes = 0
  await retryIngestionJobForBff(caseId, jobId, async () => ({ status: 200, data: job }), async () => { writes++; return { status: 202, data: queued } }, aborted.signal)
  assert.equal(writes, 0)
})

test("lost 202 crosses browser command, BFF ownership check and clinical HTTP transport with only one backend mutation", async () => {
  const client = new QueryClient()
  const calls = []
  let actual = job
  const clinical = new ApiHttpClient({ baseUrl: "https://clinical.example", fetch: async (url, init) => {
    calls.push({ url: String(url), method: init.method })
    assert.equal(init.body, undefined)
    if (init.method === "POST") { actual = queued; return Response.json(actual, { status: 202 }) }
    return Response.json(actual)
  } })
  const read = pathParams => clinical.request({ method: "get", path: "/api/v1/jobs/{job_id}", pathParams })
  try {
    await requestIngestionRetry(client, { caseId, jobId, imageId: job.image_id, uploadId: job.upload_id, imageStatus: "FAILED" }, {
      fetchImpl: async (url, init) => {
        if (init.method === "POST") {
          assert.equal(url, `/api/cases/${caseId}/jobs/${jobId}/retry`)
          const result = await retryIngestionJobForBff(caseId, jobId, read,
            pathParams => clinical.request({ method: "post", path: "/api/v1/jobs/{job_id}/retry", pathParams }))
          assert.equal(result.status, 202)
          throw new Error("browser lost response after backend commit")
        }
        const result = await getIngestionJobForBff(caseId, jobId, read)
        return Response.json(result.body, { status: result.status })
      },
    })
    assert.deepEqual(calls.map(call => call.method), ["GET", "GET", "POST", "GET"])
    assert.equal(calls.filter(call => call.method === "POST").length, 1)
    const result = client.getQueryData(casesQueryKeys.ingestionJob(caseId, jobId))
    assert.equal(result.status, "QUEUED")
    assert.equal(result.imageId, job.image_id)
    assert.equal(result.uploadId, job.upload_id)
    assert.equal(client.getQueryData(casesQueryKeys.ingestionRetry(caseId, jobId)).acknowledged, true)
  } finally { client.clear() }
})
