import type { SettingsBffError, SettingsBffErrorCode, SettingsBffResult } from "../types/settings"

const POSTAL_CODE_ERROR_CODES = new Set<SettingsBffErrorCode>([
  "INVALID_POSTAL_CODE",
  "POSTAL_CODE_NOT_FOUND",
  "POSTAL_CODE_REQUEST_FAILED",
  "POSTAL_CODE_UNAVAILABLE",
  "SESSION_UNAVAILABLE",
])

type PostalCodeAddress = {
  city: string
  country: "BR"
  state: string
  street: string
}

const GENERIC_ERROR: SettingsBffError = {
  code: "POSTAL_CODE_REQUEST_FAILED",
  retryable: true,
}

async function lookupPostalCode(postalCode: string, signal: AbortSignal): Promise<SettingsBffResult<{ address: PostalCodeAddress }>> {
  try {
    const response = await fetch("/api/settings/postal-code", {
      body: JSON.stringify({ postalCode }),
      cache: "no-store",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      method: "POST",
      signal,
    })
    const payload = await readJson(response)

    if (!response.ok) {
      return { error: getPublicError(payload), ok: false, status: response.status }
    }

    return { data: payload as { address: PostalCodeAddress }, ok: true, status: response.status }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error
    }

    return { error: GENERIC_ERROR, ok: false, status: 503 }
  }
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.headers.get("content-type")?.includes("application/json")) {
    return undefined
  }

  try {
    return await response.json()
  } catch {
    return undefined
  }
}

function getPublicError(payload: unknown): SettingsBffError {
  if (!isRecord(payload) || !isRecord(payload.error)) {
    return GENERIC_ERROR
  }

  const { code, retryable } = payload.error
  return isPostalCodeErrorCode(code) && typeof retryable === "boolean"
    ? { code, retryable }
    : GENERIC_ERROR
}

function isPostalCodeErrorCode(value: unknown): value is SettingsBffErrorCode {
  return typeof value === "string" && POSTAL_CODE_ERROR_CODES.has(value as SettingsBffErrorCode)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export { lookupPostalCode }
