import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"
import { QueryClient } from "@tanstack/react-query"

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript," }
  if (context.parentURL?.includes("/node_modules/")) return nextResolve(specifier, context)
  return nextResolve(specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) ? `${specifier}.ts` : specifier, context)
} })
const { fetchTploClinicalProtocol, fetchTploRotationTable } = await import("../src/features/cases/services/tplo-reference-api.ts")
const { getTploClinicalProtocolForBff, getTploRotationTableForBff } = await import("../src/lib/server/tplo-reference-bff.ts")
const { parseTploRotationQuery } = await import("../src/features/cases/schemas/tplo-reference.schema.ts")
const { tploClinicalProtocolQueryOptions, tploRotationTableQueryOptions } = await import("../src/features/cases/lib/tplo-reference-query-options.ts")
const unconfigured = { configured: false, table_version: null, source: null, match_count: 0, entries: [] }
const protocol = { configured: true, protocol_version: "protocol-v1", source: "clinical configuration", acceptance_enabled: true,
  clinically_validated: false, tpa_max_absolute_error_degrees: 1.5,
  measurements: [{ name: "CUSTOM", landmarks: ["a", "b"], tolerance: { degrees: 2 } }] }
const table = { ...unconfigured, configured: true, table_version: "table-v1", source: "reference", query: { tpa_degrees: 24, blade_diameter_mm: 24 },
  entries: [{ tpa_degrees: 24, blade_diameter_mm: 24, rotation_mm: 8, label: "Reference only" }], match_count: 1, recommendation_enabled: false }
const read = data => async () => ({ status: 200, data })

test("reference reads preserve configuration absence, open protocol definitions and exact table matches without inventing recommendations", async () => {
  for (const payload of [{ configured: false }, protocol]) {
    const result = await getTploClinicalProtocolForBff(read({ ...payload, private_trace: "secret" }))
    assert.equal(result.status, 200)
    assert.deepEqual(await fetchTploClinicalProtocol({ fetchImpl: async () => Response.json(result.body) }),
      { acceptance_enabled: false, clinically_validated: false, ...payload })
  }
  for (const payload of [unconfigured, { ...unconfigured, configured: true, table_version: "v1", source: "db" }, table]) {
    const result = await getTploRotationTableForBff({}, read(payload))
    assert.equal(result.status, 200)
    assert.deepEqual(await fetchTploRotationTable({}, { fetchImpl: async () => Response.json(result.body) }), { ...payload, recommendation_enabled: false })
  }
})

test("query validation rejects duplicate, empty, unknown, nonfinite and out-of-range values before HTTP", async () => {
  for (const search of ["tpa_degrees=", "tpa_degrees= ", "tpa_degrees=NaN", "tpa_degrees=Infinity", "tpa_degrees=91", "tpa_degrees=-1",
    "blade_diameter_mm=0", "tpa_degrees=0&tpa_degrees=1", "other=1", "tpa_degrees=0x10", "tpa_degrees=1e999"]) {
    assert.equal(parseTploRotationQuery(new URLSearchParams(search)), null, search)
  }
  assert.deepEqual(parseTploRotationQuery(new URLSearchParams("blade_diameter_mm=24&tpa_degrees=0")), { tpa_degrees: 0, blade_diameter_mm: 24 })
  for (const query of [{ tpa_degrees: null }, { tpa_degrees: 91 }, { blade_diameter_mm: 0 }, { other: 1 }, { tpa_degrees: Infinity }]) {
    const forbidden = () => assert.fail("invalid query cannot reach HTTP")
    assert.equal((await getTploRotationTableForBff(query, forbidden)).status, 400)
    await assert.rejects(fetchTploRotationTable(query, { fetchImpl: forbidden }), e => e.code === "VALIDATION_ERROR")
  }
})

test("reference transport uses same-origin no-store GET, forwards bounds without changing them and respects cancellation", async () => {
  const signal = new AbortController().signal
  await fetchTploRotationTable({ tpa_degrees: 0, blade_diameter_mm: 24 }, { signal, fetchImpl: async (url, init) => {
    assert.equal(url, "/api/cases/tplo/rotation-table?tpa_degrees=0&blade_diameter_mm=24")
    assert.equal(init.method, "GET"); assert.equal(init.cache, "no-store"); assert.equal(init.credentials, "same-origin")
    assert.equal(init.signal, signal); assert.equal(init.body, undefined)
    return Response.json(table)
  } })
  const aborted = AbortSignal.abort()
  let calls = 0
  assert.equal((await getTploClinicalProtocolForBff(async () => { calls++; return read(protocol)() }, aborted)).status, 503)
  assert.equal(calls, 0)
})

test("malformed and private upstream responses fail safely, including enabled recommendation and clinical-validation claims", async () => {
  for (const payload of [{}, { configured: true, clinically_validated: true }, { ...protocol, measurements: [null] }]) {
    assert.equal((await getTploClinicalProtocolForBff(read(payload))).status, 502)
    await assert.rejects(fetchTploClinicalProtocol({ fetchImpl: async () => Response.json(payload) }), e => e.code === "INVALID_RESPONSE")
  }
  for (const payload of [{ ...table, recommendation_enabled: true }, { ...table, entries: [{ nested: {} }] }, { ...table, match_count: -1 }]) {
    assert.equal((await getTploRotationTableForBff({}, read(payload))).status, 502)
  }
  for (const status of [401, 403, 422, 500]) {
    const result = await getTploClinicalProtocolForBff(async () => ({ status, data: { message: "private-token" } }))
    assert.equal(result.status, status === 403 || status === 422 ? status : 503)
    assert.equal(JSON.stringify(result).includes("private-token"), false)
  }
  await assert.rejects(fetchTploClinicalProtocol({ fetchImpl: async () => Response.json({ message: "private-token" }, { status: 500 }) }), e => e.code === "INVALID_RESPONSE")
})

test("reference caches deduplicate identical reads, isolate query parameters and stay scoped to the organization's QueryClient", async () => {
  const one = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } }), two = new QueryClient()
  let calls = 0
  const options = { fetchImpl: async () => { calls++; return Response.json(table) } }
  try {
    const query = tploRotationTableQueryOptions({ tpa_degrees: 24 }, options)
    await Promise.all([one.fetchQuery(query), one.fetchQuery(query)])
    assert.equal(calls, 1)
    assert.equal(two.getQueryData(query.queryKey), undefined)
    assert.equal(one.getQueryData(tploRotationTableQueryOptions({ tpa_degrees: 25 }).queryKey), undefined)
    const clinical = tploClinicalProtocolQueryOptions({ fetchImpl: async () => Response.json({ configured: false }) })
    assert.equal((await one.fetchQuery(clinical)).configured, false)
    assert.equal(two.getQueryData(clinical.queryKey), undefined)
  } finally { one.clear(); two.clear() }
})
