import type { NextRequest } from "next/server"

import { proxyClinicalJson, withClinicalSession } from "@/lib/server/clinical-bff-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> },
) {
  const { uploadId } = await params
  return withClinicalSession(
    request,
    (context) => proxyClinicalJson(
      context,
      `/api/v1/image-uploads/${encodeURIComponent(uploadId)}/complete`,
      { method: "POST" },
    ),
    { method: "POST", body: "none" },
  )
}
