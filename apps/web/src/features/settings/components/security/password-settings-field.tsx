import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import type { UseFormRegisterReturn } from "react-hook-form"

import { cn } from "@/lib/utils"

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
    <div>
      <div className={cn("border-b py-4 transition-colors focus-within:border-[var(--input-border-focus)]", error ? "border-[var(--input-border-error)]" : "border-border")}>
        <label className="mb-1.5 block font-data text-[0.6875rem] leading-4 font-medium text-foreground" htmlFor={inputId}>
          {label}<span aria-hidden="true" className="text-[var(--color-feedback-error)]"> *</span>
        </label>
        <div className="flex items-center gap-3">
          <input
            {...registration}
            aria-describedby={error ? errorId : undefined}
            aria-invalid={Boolean(error)}
            autoComplete={autoComplete}
            className="min-w-0 flex-1 bg-transparent py-1 text-[0.75rem] leading-5 text-description outline-none placeholder:text-[0.75rem] placeholder:text-[var(--input-placeholder)] focus-visible:outline-none"
            id={inputId}
            placeholder={placeholder}
            required
            type={isPasswordVisible ? "text" : "password"}
          />
          <button
            aria-label={visibilityLabel}
            aria-pressed={isPasswordVisible}
            className="shrink-0 cursor-pointer rounded-[var(--button-radius)] p-1 text-description transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[var(--button-focus-weight)] focus-visible:ring-[var(--button-focus-color)]"
            onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
            type="button"
          >
            {isPasswordVisible ? <EyeOff aria-hidden="true" className="size-3.5" strokeWidth={1.5} /> : <Eye aria-hidden="true" className="size-3.5" strokeWidth={1.5} />}
          </button>
        </div>
      </div>
      {error ? <p className="mt-2 text-caption text-[var(--color-feedback-error)]" id={errorId} role="alert">{error}</p> : null}
    </div>
  )
}

export { PasswordSettingsField }
