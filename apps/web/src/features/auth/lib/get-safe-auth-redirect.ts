const DEFAULT_LOGIN_REDIRECT = "/app"
const INTERNAL_URL_BASE = "http://vetorthoplan.internal"

function getSafeAuthRedirect(destination: string | undefined): string {
  const decodedDestination = decodeDestination(destination)

  if (
    !destination ||
    !decodedDestination ||
    !destination.startsWith("/") ||
    decodedDestination.startsWith("//") ||
    /[\\\u0000-\u001F]/.test(decodedDestination)
  ) {
    return DEFAULT_LOGIN_REDIRECT
  }

  const parsedDestination = new URL(destination, INTERNAL_URL_BASE)

  return parsedDestination.origin === INTERNAL_URL_BASE
    ? `${parsedDestination.pathname}${parsedDestination.search}${parsedDestination.hash}`
    : DEFAULT_LOGIN_REDIRECT
}

function isOAuthAuthorizationRedirect(destination: string): boolean {
  const parsedDestination = new URL(destination, INTERNAL_URL_BASE)

  return (
    parsedDestination.origin === INTERNAL_URL_BASE &&
    parsedDestination.pathname === "/oauth/authorize"
  )
}

function decodeDestination(destination: string | undefined): string | undefined {
  if (!destination) {
    return undefined
  }

  try {
    return decodeURIComponent(destination)
  } catch {
    return undefined
  }
}

export { DEFAULT_LOGIN_REDIRECT, getSafeAuthRedirect, isOAuthAuthorizationRedirect }
