import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"
import { QueryClient, QueryObserver } from "@tanstack/react-query"

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })

const { caseIngestionTargets, matchesIngestionIdentity, terminalIngestionRefreshKey, uniqueIngestionJobs } =
  await import("../src/features/cases/lib/case-ingestion.ts")
const { imageIngestionQueryOptions, ingestionJobQueryOptions, refreshIngestionImages, caseImagesPollInterval } = await import("../src/features/cases/lib/ingestion-query-options.ts")
const { fetchCaseImages, ImageReadError } = await import("../src/features/cases/services/image-read-api.ts")

const caseId = "00000000-0000-4000-8000-000000000064"
const imageId = "00000000-0000-4000-8000-000000000125"
const uploadId = "00000000-0000-4000-8000-000000000124"
const jobId = "00000000-0000-4000-8000-000000000126"
const image = { id: imageId, caseId, uploadId, jobId, originalFilename: "synthetic.png", kind: "PNG",
  mediaType: "image/png", detectedMediaType: "image/png", sizeBytes: 3, status: "PROCESSING",
  widthPx: null, heightPx: null, rejectionCode: null, createdAt: "2026-10-18T12:00:00Z",
  completedAt: "2026-10-18T12:00:01Z", processedAt: null, previewAvailable: false,
  previewWidthPx: null, previewHeightPx: null, pixelSpacingMm: null, imagerPixelSpacingMm: null, imageOrientationPatient: null }
const job = { id: jobId, caseId, imageId, uploadId, status: "QUEUED", attempts: 0, errorCode: null,
  createdAt: "2026-10-18T12:00:00Z", updatedAt: "2026-10-18T12:00:01Z", startedAt: null, finishedAt: null }
const confirmation = { caseId, imageId, uploadId, jobId, jobStatus: "QUEUED" }

test("image reconciliation keeps polling through projection lag and stops only on a terminal image or read error", async () => {
  const client = new QueryClient()
  let reads = 0
  const responses = [[], [{ ...image, status: "QUARANTINED" }], [{ ...image, status: "PROCESSING" }], [{ ...image, status: "READY" }]]
  const options = {
    queryKey: ["cases", "images", caseId], staleTime: 0,
    queryFn: () => Promise.resolve(responses[reads++]),
  }
  try {
    client.setQueryData(["cases", "ingestion-job", caseId, jobId], { ...job, status: "SUCCEEDED" })
    for (let i = 0; i < responses.length; i++) {
      const images = await client.fetchQuery(options)
      assert.equal(caseImagesPollInterval(caseId, images, [confirmation], false), i === 3 ? false : 2000)
    }
    assert.equal(reads, 4)
    assert.equal(caseImagesPollInterval(caseId, [image], [confirmation], true), false)
    for (const status of ["FAILED", "REJECTED", "CANCELLED"]) {
      assert.equal(caseImagesPollInterval(caseId, [{ ...image, status }], [confirmation], false), false)
    }
    assert.equal(caseImagesPollInterval(caseId, [], [{ ...confirmation, caseId: uploadId }], false), false)
    assert.equal(caseImagesPollInterval(caseId, [{ ...image, status: "PENDING_UPLOAD", jobId: null }], [], false), false)
    const failedImage = { ...image, status: "FAILED" }
    assert.equal(caseImagesPollInterval(caseId, [failedImage], [confirmation], false, id => id === jobId), 2000,
      "a confirmed retry must reconcile even when the image still projects the previous FAILED status")
    assert.equal(caseImagesPollInterval(caseId, [failedImage], [confirmation], false, () => false), false)
    assert.equal(caseImagesPollInterval(caseId, [failedImage], [confirmation], true, () => true), false)
  } finally { client.clear() }
})

test("fresh reads rebuild monitoring without an in-memory confirmation and stop after completion", async () => {
  const client = new QueryClient()
  let currentJob = job
  let currentImage = image
  const urls = []
  const fetchImpl = async (url, init) => {
    urls.push(String(url))
    assert.equal(init.method, undefined) // Every request is a GET; no upload or worker retry.
    return Response.json(String(url).endsWith("/images") ? { items: [currentImage] } : currentJob)
  }
  try {
    const images = await fetchCaseImages(caseId, { fetchImpl })
    const targets = caseIngestionTargets(caseId, images, [])
    assert.equal(targets.length, 1)
    assert.equal(targets[0].jobId, jobId)
    assert.equal(targets[0].reportedJobStatus, undefined)
    const options = ingestionJobQueryOptions(targets[0], { fetchImpl })
    const queued = await client.fetchQuery(options)
    assert.equal(options.refetchInterval({ state: { data: queued, error: null } }), 2000)
    currentJob = { ...job, status: "PROCESSING", attempts: 1 }
    await client.invalidateQueries({ queryKey: options.queryKey, refetchType: "none" })
    assert.equal((await client.fetchQuery(options)).status, "PROCESSING")
    currentJob = { ...currentJob, status: "SUCCEEDED", finishedAt: "2026-10-18T12:00:02Z" }
    await client.invalidateQueries({ queryKey: options.queryKey, refetchType: "none" })
    const done = await client.fetchQuery(options)
    assert.equal(options.refetchInterval({ state: { data: done, error: null } }), false)
    assert.ok(terminalIngestionRefreshKey({ ...targets[0], job: done }))
    assert.equal(images[0].status, "PROCESSING") // A job cannot mark the image READY by itself.
    currentImage = { ...image, status: "READY", previewAvailable: true }
    const refreshed = await fetchCaseImages(caseId, { fetchImpl })
    assert.deepEqual(caseIngestionTargets(caseId, refreshed, [confirmation]), [])
    assert.equal(urls.some((url) => url.endsWith(`/images/${imageId}/job`)), false)
  } finally { client.clear() }
})

test("a null lookup stays idle until manual invalidation and seeds the canonical job cache", async () => {
  const client = new QueryClient()
  const target = caseIngestionTargets(caseId, [{ ...image, jobId: null, status: "QUARANTINED" }], [])[0]
  let result = null
  let lookups = 0
  const options = imageIngestionQueryOptions(target, async () => { lookups++; return Response.json({ job: result }) })
  try {
    assert.equal(await client.fetchQuery(options), null)
    assert.equal(await client.fetchQuery(options), null)
    assert.equal(lookups, 1)
    assert.equal(options.refetchInterval, false)
    assert.equal(options.retry, false)
    result = job
    await client.invalidateQueries({ queryKey: options.queryKey, refetchType: "none" })
    const discovered = await client.fetchQuery(options)
    assert.equal(discovered.id, jobId)
    let directCalls = 0
    const canonical = ingestionJobQueryOptions({ ...target, jobId: discovered.id }, {
      initialData: discovered, initialDataUpdatedAt: Date.now(),
      fetchImpl: async () => { directCalls++; return Response.json(job) },
    })
    assert.deepEqual(await client.fetchQuery(canonical), job)
    assert.equal(directCalls, 0)
    assert.equal(lookups, 2)
  } finally { client.clear() }
})

test("duplicate observers of a job share one in-flight request", async () => {
  const client = new QueryClient()
  let release
  const barrier = new Promise((resolve) => { release = resolve })
  let calls = 0
  const target = caseIngestionTargets(caseId, [image], [confirmation, confirmation])[0]
  const options = ingestionJobQueryOptions(target, { fetchImpl: async () => {
    calls++; await barrier; return Response.json(job)
  } })
  try {
    const first = client.fetchQuery(options)
    const second = client.fetchQuery(options)
    assert.equal(calls, 1)
    release()
    const results = await Promise.all([first, second])
    assert.deepEqual(results[0], results[1])
    assert.equal(calls, 1)
  } finally { release(); client.clear() }
})

test("errors stop polling and a manual read resumes the same job without a command", async () => {
  for (const [status, code] of [[404, "JOB_NOT_FOUND"], [503, "SERVICE_UNAVAILABLE"]]) {
    const client = new QueryClient()
    let fail = true
    let calls = 0
    const options = ingestionJobQueryOptions(caseIngestionTargets(caseId, [image], [])[0], { fetchImpl: async () => {
      calls++
      return fail ? Response.json({ error: { code, retryable: status === 503 } }, { status }) : Response.json(job)
    } })
    try {
      await assert.rejects(client.fetchQuery(options), (error) => error instanceof ImageReadError && error.code === code)
      assert.equal(calls, 1)
      assert.equal(options.refetchInterval({ state: { data: job, error: new Error("read failed") } }), false)
      fail = false
      assert.equal((await client.fetchQuery(options)).id, jobId)
      assert.equal(calls, 2)
    } finally { client.clear() }
  }
})

test("persisted links win, pending uploads stay idle and references never cross case or upload", () => {
  assert.deepEqual(caseIngestionTargets(caseId, [{ ...image, jobId: null, status: "PENDING_UPLOAD" }], []), [])
  const stale = { ...confirmation, jobId: uploadId }
  assert.equal(caseIngestionTargets(caseId, [image], [stale, stale])[0].jobId, jobId)
  assert.deepEqual(caseIngestionTargets(caseId, [], [{ ...confirmation, caseId: uploadId }]), [])
  assert.equal(caseIngestionTargets(caseId, [{ ...image, jobId: null }], [{ ...confirmation, uploadId: imageId }])[0].jobId, null)
  for (const status of ["READY", "REJECTED", "CANCELLED"]) {
    assert.deepEqual(caseIngestionTargets(caseId, [{ ...image, status }], [confirmation]), [])
  }
  const failed = caseIngestionTargets(caseId, [{ ...image, status: "FAILED" }], [])[0]
  assert.equal(ingestionJobQueryOptions(failed).refetchInterval({ state: { data: job, error: null } }), false)
  assert.equal(uniqueIngestionJobs([failed, failed]).length, 1)
  assert.equal(matchesIngestionIdentity(job, { ...failed, imageId: uploadId }), false)
})

test("terminal reconciliation keys are stable per attempt and renew after another worker attempt", () => {
  const target = caseIngestionTargets(caseId, [image], [])[0]
  const entry = { ...target, job: { ...job, status: "FAILED", attempts: 1 } }
  const key = terminalIngestionRefreshKey(entry)
  assert.ok(key)
  assert.equal(terminalIngestionRefreshKey(entry), key)
  assert.notEqual(terminalIngestionRefreshKey({ ...entry, job: { ...entry.job, attempts: 2 } }), key)
  assert.equal(terminalIngestionRefreshKey({ ...entry, imageStatus: "FAILED" }), null)
  assert.equal(terminalIngestionRefreshKey({ ...entry, job: null }), null)
})

test("terminal reconciliation cancels an older image read and obtains a fresh persisted state", async () => {
  const client = new QueryClient()
  let calls = 0
  let aborted = false
  const observer = new QueryObserver(client, {
    queryKey: ["cases", "images", caseId], retry: false,
    queryFn: ({ signal }) => {
      calls++
      if (calls === 1) return new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => { aborted = true; reject(new DOMException("Aborted", "AbortError")) })
      })
      return Promise.resolve([{ ...image, status: "READY" }])
    },
  })
  const unsubscribe = observer.subscribe(() => {})
  try {
    assert.equal(calls, 1)
    await refreshIngestionImages(client, caseId)
    assert.equal(aborted, true)
    assert.equal(calls, 2)
    assert.equal(observer.getCurrentResult().data[0].status, "READY")
  } finally { unsubscribe(); client.clear() }
})
