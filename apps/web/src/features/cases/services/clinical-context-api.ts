import { z } from "zod"

const OrganizationSchema = z.object({ id: z.string().min(1).max(255), name: z.string().min(1), memberRole: z.string() })
const ContextSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("ready"), mode: z.enum(["local", "jwt"]), organization: OrganizationSchema.nullable(), organizations: z.array(OrganizationSchema) }),
  z.object({ state: z.literal("selection_required"), mode: z.literal("jwt"), organizations: z.array(OrganizationSchema).min(1) }),
  z.object({ state: z.literal("no_organizations"), mode: z.literal("jwt"), organizations: z.array(OrganizationSchema).max(0) }),
])
type ClinicalContext = z.infer<typeof ContextSchema>
class ClinicalContextError extends Error {
  readonly code: string
  constructor(code: string) { super(code); this.name = "ClinicalContextError"; this.code = code }
}
async function fetchClinicalContext(options: { organizationId?: string; signal?: AbortSignal; fetchImpl?: typeof fetch } = {}): Promise<ClinicalContext> {
  let response: Response
  try {
    response = await (options.fetchImpl ?? fetch)("/api/cases/context", { method: options.organizationId === undefined ? "POST" : "PUT",
      ...(options.organizationId === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizationId: options.organizationId }) }),
      credentials: "same-origin", cache: "no-store", signal: options.signal })
  } catch { throw new ClinicalContextError("SERVICE_UNAVAILABLE") }
  let body: unknown
  try { body = await response.json() } catch { throw new ClinicalContextError("INVALID_RESPONSE") }
  if (!response.ok) {
    const error = z.object({ error: z.object({ code: z.string() }) }).safeParse(body)
    throw new ClinicalContextError(error.success ? error.data.error.code : "SERVICE_UNAVAILABLE")
  }
  const result = ContextSchema.safeParse(body)
  if (!result.success) throw new ClinicalContextError("INVALID_RESPONSE")
  const value = result.data
  if (value.state === "ready" && (value.mode === "jwt" ? !value.organization || !value.organizations.some(item => item.id === value.organization!.id) : value.organization !== null)) throw new ClinicalContextError("INVALID_RESPONSE")
  return value
}
export { ClinicalContextError, fetchClinicalContext }
export type { ClinicalContext }
