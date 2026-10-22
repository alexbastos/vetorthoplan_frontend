import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

const OFFICIAL_ORIGIN = "https://bwtp7pm5pc.execute-api.us-east-1.amazonaws.com"
const TOKEN_PATH = "/authentication_api/api/v1/auth/organizations/{orgId}/token"
const PUBLIC_PATHS = ["/health/live", "/health/ready", "/health/authentication_api", "/openapi.json", "/docs/authentication_api/json"]

// Public GETs only. Never accepts credentials, signs in, creates sessions or sends files.
async function checkClinicalRemote({ origin = OFFICIAL_ORIGIN, fetchImpl = fetch } = {}) {
  const target = new URL(origin)
  if (origin !== origin.trim() || target.username || target.password || target.pathname !== "/" || target.search || target.hash
    || target.protocol !== "https:" && !(target.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(target.hostname))) {
    throw new Error("Informe somente uma origem HTTPS, sem caminho, credenciais, query ou fragmento; HTTP é permitido apenas em loopback.")
  }
  const results = await Promise.all(PUBLIC_PATHS.map(async path => {
    try {
      const response = await fetchImpl(`${target.origin}${path}`, {
        method: "GET", cache: "no-store", credentials: "omit", redirect: "manual", signal: AbortSignal.timeout(10_000),
        headers: { accept: "application/json" },
      })
      if (response.status !== 200) return { path, status: response.status, ok: false }
      const body = await response.json()
      return { path, status: 200, ok: true, body }
    } catch { return { path, status: null, ok: false } }
  }))
  const byPath = new Map(results.map(result => [result.path, result]))
  const clinical = byPath.get("/openapi.json").body
  const authentication = byPath.get("/docs/authentication_api/json").body
  const health = results.slice(0, 3).map(result => ({
    path: result.path, status: result.status,
    ok: result.ok && (result.path === "/health/ready"
      ? result.body?.status === "ready" && result.body?.database === "ok"
      : ["ok", "healthy", "up"].includes(result.body?.status)),
  }))
  const clinicalDocumented = Boolean(clinical?.openapi && clinical?.paths?.["/api/v1/cases"]?.get)
  const loginDocumented = Boolean(authentication?.openapi && authentication?.paths?.["/authentication_api/api/v1/auth/login"]?.post)
  const organizationsDocumented = Boolean(authentication?.paths?.["/authentication_api/api/v1/organizations"]?.get)
  const organizationTokenDocumented = Boolean(authentication?.paths?.[TOKEN_PATH]?.post)
  const pending = []
  if (health.some(result => !result.ok)) pending.push("PUBLIC_HEALTH_UNAVAILABLE")
  if (!clinicalDocumented || !loginDocumented || !organizationsDocumented) pending.push("PUBLIC_CONTRACT_UNAVAILABLE")
  if (!organizationTokenDocumented) pending.push("ORGANIZATION_TOKEN_UNDOCUMENTED")
  // Expose only statuses and contract presence. No raw bodies, signed URLs or error text.
  return {
    origin: target.origin, checkedAt: new Date().toISOString(), health,
    contracts: { clinicalDocumented, loginDocumented, organizationsDocumented, organizationTokenDocumented },
    publicChecksPassed: pending.length === 0, pending,
    authenticatedClinicalFlowVerified: false, storageCorsAndWorkerVerified: false,
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 3) throw new Error("Uso: check:clinical-remote [origem]")
    const report = await checkClinicalRemote({ origin: process.argv[2] ?? OFFICIAL_ORIGIN })
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
    process.exitCode = report.publicChecksPassed ? 0 : 2
  } catch {
    process.stderr.write("Não foi possível verificar a origem. Use check:clinical-remote [origem HTTPS sem caminho ou credenciais].\n")
    process.exitCode = 1
  }
}

export { checkClinicalRemote }
