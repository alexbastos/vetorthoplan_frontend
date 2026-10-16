import type { NextRequest } from "next/server"

import { proxyClinicalJson, withClinicalSession } from "@/lib/server/clinical-bff-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params
  return withClinicalSession(request, (context) =>
    proxyClinicalJson(context, `/api/v1/jobs/${encodeURIComponent(jobId)}`)
  )
}
