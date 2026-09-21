const LEGACY_ACCESS_TOKEN_COOKIE_NAME = "vetorthoplan_access_token"
const PENDING_VERIFICATION_EMAIL_COOKIE_NAME = "vetorthoplan_pending_verification_email"
const PENDING_VERIFICATION_EMAIL_MAX_AGE_SECONDS = 15 * 60
const LEGACY_REFRESH_TOKEN_COOKIE_NAME = "vetorthoplan_refresh_token"
const SESSION_ACCESS_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Host-Http-vetorthoplan_session_access"
    : "vetorthoplan_session_access"
const SESSION_REFRESH_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Host-Http-vetorthoplan_session_refresh"
    : "vetorthoplan_session_refresh"

export {
  LEGACY_ACCESS_TOKEN_COOKIE_NAME,
  LEGACY_REFRESH_TOKEN_COOKIE_NAME,
  PENDING_VERIFICATION_EMAIL_COOKIE_NAME,
  PENDING_VERIFICATION_EMAIL_MAX_AGE_SECONDS,
  SESSION_ACCESS_COOKIE_NAME,
  SESSION_REFRESH_COOKIE_NAME,
}
