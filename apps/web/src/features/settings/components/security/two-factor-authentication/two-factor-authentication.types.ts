/** Estados locais do fluxo TOTP antes da integraÃ§Ã£o com a Authentication API. */
type TwoFactorAuthenticationStatus = "configuring" | "disabled" | "enabled" | "setting-up" | "verifying"

export type { TwoFactorAuthenticationStatus }
