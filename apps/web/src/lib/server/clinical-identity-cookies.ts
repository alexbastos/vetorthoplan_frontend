import "server-only"

import { z } from "zod"
import type { SessionCookieSecrets } from "./environment"
import { openSessionToken, sealSessionToken } from "./session-cookie-codec"
import type { SessionCookieStore } from "./session-cookies"

const SELECTION_TTL = 7 * 24 * 60 * 60
const TOKEN_TTL = 15 * 60
const SelectionSchema = z.object({ ownerId: z.string().min(1), organizationId: z.string().min(1).max(255) })
const AccessSchema = SelectionSchema.extend({ accessToken: z.string().min(1), sessionBinding: z.string(), expiresAt: z.number().finite() })
type ClinicalIdentityCookieOptions = { secrets: SessionCookieSecrets; authOrigin: string; clinicalOrigin: string; production: boolean; now?: Date }

function clinicalIdentityCookieNames(production: boolean) {
  const prefix = production ? "__Host-Http-" : ""
  return { selection: `${prefix}vetorthoplan_clinical_organization`, access: `${prefix}vetorthoplan_clinical_access` }
}

function createClinicalIdentityCookies(reader: Pick<SessionCookieStore, "get">, writer: Pick<SessionCookieStore, "set">, options: ClinicalIdentityCookieOptions) {
  const names = clinicalIdentityCookieNames(options.production)
  const common = { httpOnly: true, path: "/", priority: "high", sameSite: "lax", secure: options.production } as const
  const aad = (name: string) => `${name}:clinical-identity:${options.authOrigin}:${options.clinicalOrigin}`
  const read = (name: string, ttl: number): unknown => {
    const value = reader.get(name)?.value
    if (!value) return undefined
    for (const secret of [options.secrets.current, options.secrets.previous]) {
      if (!secret) continue
      const opened = openSessionToken(value, { additionalAuthenticatedData: aad(name), key: Buffer.from(secret, "base64url"), maxAgeSeconds: ttl, now: options.now })
      if (opened.status === "valid") { try { return JSON.parse(opened.token) } catch { return undefined } }
    }
  }
  const write = (name: string, value: unknown, ttl: number, maxAge = ttl) => {
    const sealed = sealSessionToken(JSON.stringify(value), { additionalAuthenticatedData: aad(name), key: Buffer.from(options.secrets.current, "base64url"), maxAgeSeconds: ttl, now: options.now })
    writer.set(name, sealed, { ...common, maxAge })
  }
  const clearAccess = () => writer.set(names.access, "", { ...common, maxAge: 0, expires: new Date(0) })
  return {
    selection(ownerId: string) {
      const parsed = SelectionSchema.safeParse(read(names.selection, SELECTION_TTL))
      return parsed.success && parsed.data.ownerId === ownerId ? parsed.data.organizationId : undefined
    },
    access(ownerId: string, organizationId: string, sessionBinding: string) {
      const parsed = AccessSchema.safeParse(read(names.access, TOKEN_TTL))
      return parsed.success && parsed.data.ownerId === ownerId && parsed.data.organizationId === organizationId && parsed.data.sessionBinding === sessionBinding
        && parsed.data.expiresAt > (options.now ?? new Date()).getTime() + 15_000 ? parsed.data.accessToken : undefined
    },
    setSelection(ownerId: string, organizationId: string) { write(names.selection, { ownerId, organizationId }, SELECTION_TTL) },
    setAccess(ownerId: string, organizationId: string, sessionBinding: string, accessToken: string, expiresIn: number) {
      const lifetime = Math.min(TOKEN_TTL, expiresIn)
      write(names.access, { ownerId, organizationId, sessionBinding, accessToken, expiresAt: (options.now ?? new Date()).getTime() + lifetime * 1000 }, TOKEN_TTL, lifetime)
    },
    clearAccess,
    clear() { clearAccess(); writer.set(names.selection, "", { ...common, maxAge: 0, expires: new Date(0) }) },
  }
}
export { clinicalIdentityCookieNames, createClinicalIdentityCookies }
export type ClinicalIdentityCookies = ReturnType<typeof createClinicalIdentityCookies>
