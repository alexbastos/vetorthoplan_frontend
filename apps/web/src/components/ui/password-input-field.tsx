"use client"

import { Eye, EyeOff } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { InputField, type InputFieldProps } from "@/components/ui/input-field"

type PasswordInputFieldProps = Omit<InputFieldProps, "trailingIcon" | "type"> & {
  hidePasswordLabel?: string
  showPasswordLabel?: string
}

const PasswordInputField = React.forwardRef<HTMLInputElement, PasswordInputFieldProps>(({ disabled, hidePasswordLabel = "Ocultar senha", showPasswordLabel = "Mostrar senha", ...props }, ref) => {
  const [isVisible, setIsVisible] = React.useState(false)
  const visibilityLabel = isVisible ? hidePasswordLabel : showPasswordLabel

  return (
    <InputField
      {...props}
      ref={ref}
      disabled={disabled}
      trailingIcon={
        <Button
          aria-label={visibilityLabel}
          aria-pressed={isVisible}
          className="size-7 p-0 text-[var(--input-placeholder)] hover:text-[var(--input-placeholder)]"
          disabled={disabled}
          onClick={() => setIsVisible((visible) => !visible)}
          size="sm"
          type="button"
          variant="ghost"
        >
          {isVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </Button>
      }
      type={isVisible ? "text" : "password"}
    />
  )
})

PasswordInputField.displayName = "PasswordInputField"

export { PasswordInputField }
export type { PasswordInputFieldProps }
