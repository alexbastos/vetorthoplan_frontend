import * as React from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type InputFieldProps = Omit<
  React.ComponentPropsWithoutRef<typeof Input>,
  "aria-describedby" | "aria-invalid"
> & {
  label?: React.ReactNode
  helperText?: React.ReactNode
  error?: React.ReactNode
  showLabel?: boolean
  showHelperText?: boolean
  "aria-describedby"?: string
  "aria-invalid"?: React.AriaAttributes["aria-invalid"]
}

const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  (
    {
      id,
      label,
      helperText,
      error,
      showLabel = true,
      showHelperText = true,
      disabled,
      required,
      className,
      wrapperClassName,
      "aria-describedby": ariaDescribedBy,
      "aria-invalid": ariaInvalid,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId()
    const inputId = id ?? generatedId
    const helperTextId = `${inputId}-helper`
    const hasError = error !== undefined && error !== null
    const message = hasError ? error : helperText
    const shouldShowHelperText = showHelperText && message !== undefined && message !== null
    const describedBy = [ariaDescribedBy, shouldShowHelperText ? helperTextId : undefined]
      .filter(Boolean)
      .join(" ")

    return (
      <div data-slot="input-field" className="flex w-full flex-col gap-[var(--input-field-gap)]">
        {showLabel && label ? (
          <label
            data-slot="input-field-label"
            htmlFor={inputId}
            className={cn(
              "flex min-h-4 items-center gap-[var(--input-field-label-gap)] text-[length:var(--input-field-label-size)] font-semibold leading-[var(--input-field-label-line-height)]",
              disabled
                ? "text-[var(--input-field-label-color-disabled)]"
                : "text-[var(--input-field-label-color)]"
            )}
          >
            {label}
            {required ? (
              <span data-slot="input-field-required" className="text-[var(--color-feedback-error)]" aria-hidden="true">
                *
              </span>
            ) : null}
          </label>
        ) : null}
        <Input
          ref={ref}
          id={inputId}
          disabled={disabled}
          required={required}
          aria-describedby={describedBy || undefined}
          aria-invalid={hasError ? true : ariaInvalid}
          className={className}
          wrapperClassName={wrapperClassName}
          {...props}
        />
        {shouldShowHelperText ? (
          <p
            id={helperTextId}
            data-slot="input-field-helper"
            className={cn(
              "text-[length:var(--input-field-helper-size)] leading-[var(--input-field-helper-line-height)]",
              hasError
                ? "text-[var(--color-feedback-error)]"
                : disabled
                  ? "text-[var(--input-field-helper-color-disabled)]"
                  : "text-[var(--input-field-helper-color)]"
            )}
            role={hasError ? "alert" : undefined}
          >
            {message}
          </p>
        ) : null}
      </div>
    )
  }
)

InputField.displayName = "InputField"

export { InputField }
export type { InputFieldProps }
