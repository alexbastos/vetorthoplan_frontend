/** Estados locais do fluxo TOTP antes da integraÃ§Ã£o com a Authentication API. */
type TwoFactorAuthenticationStatus = "configuring" | "disabled" | "enabled" | "setting-up" | "verifying"
type TwoFactorAuthenticationMethod = "EMAIL" | "TOTP" | null

export type { TwoFactorAuthenticationMethod, TwoFactorAuthenticationStatus }
