const EXPIRY_MARGIN_MS = 5_000

function isUploadSignatureExpired(expiresAt: string, now = Date.now()): boolean {
  return Date.parse(expiresAt) - now <= EXPIRY_MARGIN_MS
}

function millisecondsUntilUploadExpiry(expiresAt: string, now = Date.now()): number {
  return Math.max(0, Date.parse(expiresAt) - now - EXPIRY_MARGIN_MS)
}

export { isUploadSignatureExpired, millisecondsUntilUploadExpiry }
