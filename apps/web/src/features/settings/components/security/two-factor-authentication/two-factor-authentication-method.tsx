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
    <button aria-checked={isEnabled} aria-label={toggleLabel} className="flex w-full cursor-pointer items-center justify-between gap-4 border-b border-border py-4 text-left outline-none focus-visible:border-[var(--input-border-focus)] disabled:cursor-not-allowed disabled:opacity-70" disabled={disabled} onClick={onToggle} role="switch" type="button">
      <span className="flex min-w-0 items-center gap-2">
        <span className="font-data text-[0.6875rem] leading-4 font-medium text-foreground">{label}</span>
        {statusLabel ? <span className="text-caption text-description">{statusLabel}</span> : null}
      </span>
      <span aria-hidden="true" className="relative inline-flex h-5 w-9 shrink-0 rounded-full bg-background transition-colors data-[state=enabled]:bg-success" data-state={isEnabled ? "enabled" : "disabled"}>
        <span className="absolute top-0.5 left-0.5 size-4 rounded-full bg-card shadow-[var(--shadow-sm)] transition-transform data-[state=enabled]:translate-x-4" data-state={isEnabled ? "enabled" : "disabled"} />
      </span>
    </button>
  )
}

export { TwoFactorAuthenticationMethod }
