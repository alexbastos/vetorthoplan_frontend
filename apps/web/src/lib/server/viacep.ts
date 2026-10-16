import "server-only"

type PostalCodeAddress = {
  city: string
  country: "BR"
  state: string
  street: string
}

type PostalCodeLookup =
  | { address: PostalCodeAddress; kind: "found" }
  | { kind: "not-found" }
  | { kind: "unavailable" }

const VIACEP_REQUEST_TIMEOUT_MS = 4_000

async function lookupBrazilianPostalCode(postalCode: string): Promise<PostalCodeLookup> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), VIACEP_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`https://viacep.com.br/ws/${postalCode}/json/`, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: controller.signal,
    })

    if (!response.ok) {
      return { kind: "unavailable" }
    }

    const payload = await response.json().catch(() => undefined)

    if (!isRecord(payload)) {
      return { kind: "unavailable" }
    }

    if (payload.erro === true) {
      return { kind: "not-found" }
    }

    const city = getString(payload.localidade)
    const state = getString(payload.uf)

    if (!city || !state) {
      return { kind: "unavailable" }
    }

    return {
      address: {
        city,
        country: "BR",
        state,
        street: getString(payload.logradouro),
      },
      kind: "found",
    }
  } catch {
    return { kind: "unavailable" }
  } finally {
    clearTimeout(timeout)
  }
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export { lookupBrazilianPostalCode }
export type { PostalCodeAddress, PostalCodeLookup }
