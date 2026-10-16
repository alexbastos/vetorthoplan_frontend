import type { NextRequest } from "next/server"

import { proxyClinicalJson, readClinicalMutationBody, withClinicalSession } from "@/lib/server/clinical-bff-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await params
  return withClinicalSession(
    request,
    async (context) => proxyClinicalJson(
      context,
      `/api/v1/cases/${encodeURIComponent(caseId)}/image-uploads`,
      { method: "POST", body: Buffer.from(await readClinicalMutationBody(request)) },
    ),
    { method: "POST" },
  )
}
