import type { NextRequest } from "next/server"

import { proxyClinicalJson, readClinicalMutationBody, withClinicalSession } from "@/lib/server/clinical-bff-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  return withClinicalSession(request, (context) => {
    const query = new URLSearchParams()
    for (const key of ["search", "status", "cursor", "limit"]) {
      const value = request.nextUrl.searchParams.get(key)
      if (value) query.set(key, value)
    }
    const suffix = query.size > 0 ? `?${query}` : ""
    return proxyClinicalJson(context, `/api/v1/cases${suffix}`)
  })
}

export async function POST(request: NextRequest) {
  const idempotencyKey = request.headers.get("idempotency-key")
  return withClinicalSession(
    request,
    async (context) => proxyClinicalJson(context, "/api/v1/cases", {
      method: "POST",
      body: Buffer.from(await readClinicalMutationBody(request)),
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
    }),
    { method: "POST" },
  )
}
