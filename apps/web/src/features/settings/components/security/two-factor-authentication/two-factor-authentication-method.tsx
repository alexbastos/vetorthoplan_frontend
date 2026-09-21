type TwoFactorAuthenticationMethodProps = {
  disabled?: boolean
  isEnabled: boolean
  label: string
  onToggle: () => void
  statusLabel?: string
  toggleLabel: string
}

/** Linha de um método de verificação que poderá ser ativado pelo fluxo TOTP. */
function TwoFactorAuthenticationMethod({ disabled = false, isEnabled, label, onToggle, statusLabel, toggleLabel }: TwoFactorAuthenticationMethodProps) {
  return (
    <button aria-checked={isEnabled} aria-label={toggleLabel} className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-token-sm)] outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70" disabled={disabled} onClick={onToggle} role="switch" type="button">
      <span aria-hidden="true" className="relative inline-flex h-5 w-9 shrink-0 rounded-full bg-background transition-colors data-[state=enabled]:bg-success" data-state={isEnabled ? "enabled" : "disabled"}>
        <span className="absolute top-0.5 left-0.5 size-4 rounded-full bg-card shadow-[var(--shadow-sm)] transition-transform data-[state=enabled]:translate-x-4" data-state={isEnabled ? "enabled" : "disabled"} />
      </span>
      <span className="text-ui font-semibold whitespace-nowrap text-foreground">{label}</span>
      {statusLabel ? <span className="text-caption text-content-secondary">{statusLabel}</span> : null}
    </button>
  )
}

export { TwoFactorAuthenticationMethod }
