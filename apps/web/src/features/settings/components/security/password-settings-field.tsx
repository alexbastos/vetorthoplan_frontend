import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import type { UseFormRegisterReturn } from "react-hook-form"

type PasswordSettingsFieldProps = {
  autoComplete: "current-password" | "new-password"
  error?: string
  hidePasswordLabel: string
  label: string
  placeholder: string
  registration: UseFormRegisterReturn
  showPasswordLabel: string
}

function PasswordSettingsField({ autoComplete, error, hidePasswordLabel, label, placeholder, registration, showPasswordLabel }: PasswordSettingsFieldProps) {
  const inputId = `security-password-${registration.name}`
  const errorId = `${inputId}-error`
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const visibilityLabel = isPasswordVisible ? hidePasswordLabel : showPasswordLabel

  return (
    <div className="border-b border-capta-border-default py-4">
      <label className="text-caption font-semibold text-capta-text-muted" htmlFor={inputId}>
        {label}<span aria-hidden="true" className="ml-1 text-[var(--color-feedback-error)]">*</span>
      </label>
      <div className="mt-1.5 flex items-center gap-3">
        <input
          {...registration}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          autoComplete={autoComplete}
          className="min-w-0 flex-1 bg-transparent text-ui font-semibold text-capta-text-primary outline-none placeholder:font-normal placeholder:text-capta-text-muted focus-visible:outline-none"
          id={inputId}
          placeholder={placeholder}
          required
          type={isPasswordVisible ? "text" : "password"}
        />
        <button
          aria-label={visibilityLabel}
          aria-pressed={isPasswordVisible}
          className="shrink-0 cursor-pointer rounded-sm p-1 text-capta-text-muted transition-colors hover:text-capta-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-capta-brand-primary"
          onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
          type="button"
        >
          {isPasswordVisible ? <EyeOff aria-hidden="true" className="size-3.5" strokeWidth={1.5} /> : <Eye aria-hidden="true" className="size-3.5" strokeWidth={1.5} />}
        </button>
      </div>
      {error ? <p className="mt-1 text-caption text-[var(--color-feedback-error)]" id={errorId} role="alert">{error}</p> : null}
    </div>
  )
}

export { PasswordSettingsField }
