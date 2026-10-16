type SecurityHeader = {
  key: string
  value: string
}

type ReportOnlyContentSecurityPolicyOptions = {
  allowGoogleIdentity: boolean
  isDevelopment: boolean
  nonce: string
}

const CONTENT_SECURITY_POLICY_REPORT_ONLY_HEADER =
  "Content-Security-Policy-Report-Only"
const CSP_NONCE_PATTERN = /^[A-Za-z0-9_-]{22}$/
const GOOGLE_IDENTITY_ORIGIN = "https://accounts.google.com"
const GOOGLE_IDENTITY_ROOT = `${GOOGLE_IDENTITY_ORIGIN}/gsi/`
const GOOGLE_IDENTITY_SCRIPT = `${GOOGLE_IDENTITY_ROOT}client`
const GOOGLE_IDENTITY_STYLE = `${GOOGLE_IDENTITY_ROOT}style`

const BASELINE_CONTENT_SECURITY_POLICY = [
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join("; ")

const GLOBAL_SECURITY_HEADERS: readonly SecurityHeader[] = Object.freeze([
  {
    key: "Content-Security-Policy",
    value: BASELINE_CONTENT_SECURITY_POLICY,
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "off",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Permitted-Cross-Domain-Policies",
    value: "none",
  },
  {
    key: "X-XSS-Protection",
    value: "0",
  },
])

const GOOGLE_POPUP_SECURITY_HEADERS: readonly SecurityHeader[] = Object.freeze([
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
])

const SENSITIVE_ROUTE_HEADERS: readonly SecurityHeader[] = Object.freeze([
  {
    key: "Cache-Control",
    value: "no-store",
  },
  {
    key: "Referrer-Policy",
    value: "no-referrer",
  },
])

const STRICT_TRANSPORT_SECURITY_HEADER: SecurityHeader = Object.freeze({
  key: "Strict-Transport-Security",
  value: "max-age=31536000",
})

function createGlobalSecurityHeaders(isProduction: boolean): SecurityHeader[] {
  return [
    ...GLOBAL_SECURITY_HEADERS,
    ...(isProduction ? [STRICT_TRANSPORT_SECURITY_HEADER] : []),
  ]
}

function createReportOnlyContentSecurityPolicy({
  allowGoogleIdentity,
  isDevelopment,
  nonce,
}: ReportOnlyContentSecurityPolicyOptions): string {
  if (!CSP_NONCE_PATTERN.test(nonce)) {
    throw new TypeError("Invalid CSP nonce")
  }

  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(allowGoogleIdentity ? [GOOGLE_IDENTITY_SCRIPT] : []),
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
  ]
  const styleElementSources = [
    "'self'",
    `'nonce-${nonce}'`,
    ...(allowGoogleIdentity ? [GOOGLE_IDENTITY_STYLE] : []),
  ]
  const styleFallbackSources = [
    "'self'",
    // Necessário para estilos inline gerados em runtime por React e GSAP.
    "'unsafe-inline'",
    ...(allowGoogleIdentity ? [GOOGLE_IDENTITY_STYLE] : []),
  ]
  const connectSources = [
    "'self'",
    ...(allowGoogleIdentity ? [GOOGLE_IDENTITY_ROOT] : []),
    ...(isDevelopment ? ["ws:"] : []),
  ]
  const frameSources = allowGoogleIdentity ? [GOOGLE_IDENTITY_ROOT] : ["'none'"]

  return [
    "default-src 'none'",
    `script-src ${scriptSources.join(" ")}`,
    "script-src-attr 'none'",
    `style-src ${styleFallbackSources.join(" ")}`,
    `style-src-elem ${styleElementSources.join(" ")}`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src ${connectSources.join(" ")}`,
    `frame-src ${frameSources.join(" ")}`,
    "worker-src 'none'",
    "media-src 'none'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ")
}

function createContentSecurityPolicyNonce(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(16))
  const base64 = btoa(String.fromCharCode(...randomBytes))

  return base64
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "")
}

function copySecurityHeaders(headers: readonly SecurityHeader[]): SecurityHeader[] {
  return headers.map((header) => ({ ...header }))
}

export {
  BASELINE_CONTENT_SECURITY_POLICY,
  CONTENT_SECURITY_POLICY_REPORT_ONLY_HEADER,
  copySecurityHeaders,
  createContentSecurityPolicyNonce,
  createGlobalSecurityHeaders,
  createReportOnlyContentSecurityPolicy,
  GOOGLE_POPUP_SECURITY_HEADERS,
  SENSITIVE_ROUTE_HEADERS,
}
export type { ReportOnlyContentSecurityPolicyOptions, SecurityHeader }
