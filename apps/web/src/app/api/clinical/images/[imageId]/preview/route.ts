import { NextResponse, type NextRequest } from "next/server"

import { clinicalJson, withClinicalSession } from "@/lib/server/clinical-bff-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAX_PREVIEW_BYTES = 20 * 1024 * 1024

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> },
) {
  const { imageId } = await params
  return withClinicalSession(request, async (context) => {
    const metadataResponse = await fetch(
      new URL(`/api/v1/images/${encodeURIComponent(imageId)}/preview`, context.apiBaseUrl),
      {
        cache: "no-store",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${context.session.accessToken}`,
        },
      },
    )
    if (!metadataResponse.ok) {
      return new NextResponse(await metadataResponse.text(), {
        status: metadataResponse.status,
        headers: { "cache-control": "no-store", "content-type": "application/json" },
      })
    }
    const metadata: unknown = await metadataResponse.json()
    if (!isPreviewMetadata(metadata)) {
      return clinicalJson({ error: { code: "INVALID_PREVIEW_RESPONSE", retryable: true } }, 503)
    }
    const previewUrl = new URL(metadata.url)
    if (
      previewUrl.protocol !== "https:" &&
      !(previewUrl.protocol === "http:" && isLoopback(previewUrl.hostname))
    ) {
      return clinicalJson({ error: { code: "INVALID_PREVIEW_URL", retryable: false } }, 502)
    }
    const previewResponse = await fetch(previewUrl, { cache: "no-store", redirect: "error" })
    const declaredLength = Number(previewResponse.headers.get("content-length") ?? "0")
    if (!previewResponse.ok || (declaredLength > 0 && declaredLength > MAX_PREVIEW_BYTES)) {
      return clinicalJson({ error: { code: "PREVIEW_UNAVAILABLE", retryable: true } }, 502)
    }
    const content = await previewResponse.arrayBuffer()
    if (content.byteLength > MAX_PREVIEW_BYTES) {
      return clinicalJson({ error: { code: "PREVIEW_TOO_LARGE", retryable: false } }, 502)
    }
    return new NextResponse(content, {
      headers: {
        "cache-control": "private, max-age=60",
        "content-type": metadata.media_type,
        "x-content-type-options": "nosniff",
      },
    })
  })
}

function isPreviewMetadata(value: unknown): value is { media_type: "image/png"; url: string } {
  return isRecord(value) && value.media_type === "image/png" && typeof value.url === "string"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isLoopback(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
}
