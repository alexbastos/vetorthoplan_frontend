const CLINICAL_CONTEXT_CHANGED_EVENT = "vetorthoplan:clinical-context-changed"
let browserOrganization: string | undefined

function createCaseFetch(fetchImpl: typeof fetch, organization: () => string | undefined, onContextChanged: () => void): typeof fetch {
  return async (input, init) => {
    if (typeof input !== "string" || !/^\/api\/cases(?:\/|\?|$)/.test(input)) throw new Error("Invalid case BFF destination")
    const headers = new Headers(init?.headers)
    headers.delete("authorization")
    const expected = organization()
    if (expected) headers.set("x-clinical-organization", encodeURIComponent(expected))
    const response = await fetchImpl(input, { ...init, headers, credentials: "same-origin" })
    if (response.status === 409 || response.status === 403) {
      try {
        const body = await response.clone().json()
        if (body?.error?.code === "CLINICAL_CONTEXT_CHANGED" || body?.error?.code === "CLINICAL_ORGANIZATION_REQUIRED") onContextChanged()
      } catch { /* Let the service classify its original response. */ }
    }
    return response
  }
}
const caseFetch = createCaseFetch((input, init) => fetch(input, init), () => typeof window === "undefined" ? undefined : browserOrganization,
  () => { if (typeof window !== "undefined") window.dispatchEvent(new Event(CLINICAL_CONTEXT_CHANGED_EVENT)) })
function setCaseBrowserOrganization(value: string | undefined) { browserOrganization = value }

export { caseFetch, CLINICAL_CONTEXT_CHANGED_EVENT, createCaseFetch, setCaseBrowserOrganization }
