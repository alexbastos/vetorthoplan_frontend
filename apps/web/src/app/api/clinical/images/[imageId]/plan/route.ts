import type { NextRequest } from "next/server"

import {
  proxyClinicalJson,
  readClinicalMutationBody,
  withClinicalSession,
} from "@/lib/server/clinical-bff-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> },
) {
  const { imageId } = await params
  return withClinicalSession(request, (context) =>
    proxyClinicalJson(context, `/api/v1/images/${encodeURIComponent(imageId)}/plan`)
  )
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> },
) {
  const { imageId } = await params
  return withClinicalSession(
    request,
    async (context) => proxyClinicalJson(
      context,
      `/api/v1/images/${encodeURIComponent(imageId)}/plan`,
      { method: "PUT", body: Buffer.from(await readClinicalMutationBody(request)) },
    ),
    { method: "PUT" },
  )
}
