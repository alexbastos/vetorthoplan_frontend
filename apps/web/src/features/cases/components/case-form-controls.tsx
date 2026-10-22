"use client"

import { ChevronDown, ChevronUp, X } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"

import { DatePicker } from "@/components/ui/date-picker"
import { cn } from "@/lib/utils"

import { sanitizeUnsignedInteger } from "../lib/numeric-input"

type FieldShellProps = {
  children: ReactNode
  error?: string
  htmlFor?: string
  label: string
  labelHidden?: boolean
  required?: boolean
}

function FieldShell({ children, error, htmlFor, label, labelHidden = false, required = false }: FieldShellProps) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined

  return (
    <div className="flex min-w-0 w-full flex-col gap-[var(--input-field-gap)]">
      <label className={labelHidden ? "sr-only" : "flex min-h-4 items-center gap-[var(--input-field-label-gap)] text-[length:var(--input-field-label-size)] leading-[var(--input-field-label-line-height)] font-semibold text-[var(--input-field-label-color)]"} htmlFor={htmlFor}>
        {label}
        {required ? <span aria-hidden="true" className="ml-1 text-destructive">*</span> : null}
      </label>
      <div>{children}</div>
      {error ? <p className="mt-1.5 text-caption text-destructive" id={errorId} role="alert">{error}</p> : null}
    </div>
  )
}

type CaseRadioFieldProps = {
  disabled?: boolean
  error?: string
  label: string
  name: string
  options: ReadonlyArray<{ label: string; value: string }>
  registration: ComponentProps<"input">
  required?: boolean
}

function CaseRadioField({ disabled, error, label, name, options, registration, required = false }: CaseRadioFieldProps) {
  const errorId = `${name}-error`

  return (
    <fieldset aria-describedby={error ? errorId : undefined} className="min-w-0">
      <legend className="text-[length:var(--input-field-label-size)] leading-[1.4] font-semibold text-[var(--color-neutral-400)]">
        {label}
        {required ? <span aria-hidden="true" className="ml-1 text-destructive">*</span> : null}
      </legend>
      <div className="mt-2 flex min-h-10 flex-wrap items-center gap-x-5 gap-y-2">
        {options.map((option) => (
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-foreground" key={option.value}>
            <input
              {...registration}
              aria-describedby={error ? errorId : undefined}
              aria-invalid={Boolean(error)}
              className="case-editor-radio"
              disabled={disabled}
              name={name}
              required={required}
              type="radio"
              value={option.value}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {error ? <p className="mt-1.5 text-caption text-destructive" id={errorId} role="alert">{error}</p> : null}
    </fieldset>
  )
}

type CaseDateFieldProps = {
  clearLabel?: string
  disabled?: boolean
  error?: string
  id: string
  label: string
  onValueChange: (value: string) => void
  placeholder?: string
  value: string
}

function CaseDateField({ clearLabel, disabled, error, id, label, onValueChange, placeholder, value }: CaseDateFieldProps) {
  return (
    <FieldShell error={error} htmlFor={id} label={label}>
      <div
        className={cn(
          "flex h-[var(--input-height)] items-center rounded-[var(--input-radius)] border bg-[var(--input-surface-default)] px-[var(--input-padding-inline)]",
          error ? "border-[var(--input-border-error)]" : "border-[var(--input-border-default)] focus-within:border-[var(--input-border-focus)]",
          disabled && "bg-[var(--input-surface-disabled)]",
        )}
      >
        <DatePicker
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={Boolean(error)}
          ariaLabel={label}
          disabled={disabled}
          id={id}
          onValueChange={onValueChange}
          placeholder={placeholder}
          value={value}
        />
        {value && clearLabel ? <button
          aria-label={clearLabel}
          className="ml-2 flex size-6 shrink-0 items-center justify-center rounded-sm text-content-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40"
          disabled={disabled}
          onClick={() => { onValueChange(""); document.getElementById(id)?.focus() }}
          type="button"
        ><X aria-hidden="true" className="size-3.5" /></button> : null}
      </div>
    </FieldShell>
  )
}

type CaseAgeFieldProps = {
  describedBy?: string
  decreaseLabel: string
  disabled?: boolean
  error?: string
  id: string
  increaseLabel: string
  label: string
  max: number
  name: string
  onBlur: ComponentProps<"input">["onBlur"]
  onKeyDown?: ComponentProps<"input">["onKeyDown"]
  onValueChange: (value: string) => void
  placeholder?: string
  readOnly?: boolean
  ref: ComponentProps<"input">["ref"]
  value: string
}

function CaseAgeField({ describedBy, decreaseLabel, disabled, error, id, increaseLabel, label, max, name, onBlur, onKeyDown, onValueChange, placeholder, readOnly = false, ref, value }: CaseAgeFieldProps) {
  const age = value === "" ? null : Number(value)
  const canIncrease = age === null || age < max
  const canDecrease = age === null || age > 0

  function step(direction: 1 | -1) {
    const next = age === null ? (direction === 1 ? 1 : 0) : age + direction
    onValueChange(String(Math.max(0, Math.min(max, next))))
  }

  return (
    <FieldShell error={error} htmlFor={id} label={label} labelHidden>
      <div className={cn(
        "flex h-[var(--input-height)] w-full items-center rounded-[var(--input-radius)] border bg-[var(--input-surface-default)] focus-within:border-[var(--input-border-focus)]",
        error ? "border-[var(--input-border-error)]" : "border-[var(--input-border-default)]",
        disabled && "bg-[var(--input-surface-disabled)]",
      )}>
        <input
          aria-describedby={[describedBy, error ? `${id}-error` : undefined].filter(Boolean).join(" ") || undefined}
          aria-invalid={Boolean(error)}
          className="min-w-0 flex-1 bg-transparent pl-[var(--input-padding-inline)] text-ui text-[var(--input-text)] outline-none placeholder:text-[length:var(--input-placeholder-size)] placeholder:text-[var(--input-placeholder)] disabled:cursor-not-allowed disabled:text-[var(--input-text-disabled)]"
          disabled={disabled}
          id={id}
          inputMode="numeric"
          maxLength={String(max).length}
          name={name}
          onBlur={onBlur}
          onChange={(event) => { if (!readOnly) onValueChange(sanitizeUnsignedInteger(event.target.value, String(max).length)) }}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              if (readOnly) return
              event.preventDefault()
              if (event.key === "ArrowUp" && canIncrease) step(1)
              if (event.key === "ArrowDown" && canDecrease) step(-1)
              return
            }
            onKeyDown?.(event)
          }}
          pattern="[0-9]*"
          placeholder={placeholder}
          ref={ref}
          readOnly={readOnly}
          type="text"
          value={value}
        />
        <span aria-hidden="true" className={cn("shrink-0 pl-2 text-[0.6875rem] leading-4 font-normal text-description lowercase", readOnly && "pr-[var(--input-padding-inline)]")}>{label}</span>
        {!readOnly ? <div className="flex h-full w-8 shrink-0 flex-col items-center justify-center pr-1">
          <button
            aria-label={increaseLabel}
            className="flex h-4 w-7 items-center justify-center rounded-sm text-content-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--input-border-focus)] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={disabled || !canIncrease}
            onClick={() => step(1)}
            type="button"
          >
            <ChevronUp aria-hidden="true" className="size-3 translate-y-1" />
          </button>
          <button
            aria-label={decreaseLabel}
            className="flex h-4 w-7 items-center justify-center rounded-sm text-content-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--input-border-focus)] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={disabled || !canDecrease}
            onClick={() => step(-1)}
            type="button"
          >
            <ChevronDown aria-hidden="true" className="size-3 -translate-y-1" />
          </button>
        </div> : null}
      </div>
    </FieldShell>
  )
}

type CaseTextareaFieldProps = {
  disabled?: boolean
  error?: string
  id: string
  label: string
  maxLength: number
  onChange: ComponentProps<"textarea">["onChange"]
  onBlur: ComponentProps<"textarea">["onBlur"]
  name: string
  placeholder?: string
  ref: ComponentProps<"textarea">["ref"]
  valueLength: number
}

function CaseTextareaField({ disabled, error, id, label, maxLength, onBlur, onChange, name, placeholder, ref, valueLength }: CaseTextareaFieldProps) {
  return (
    <FieldShell error={error} htmlFor={id} label={label}>
      <textarea
        aria-describedby={`${id}-counter${error ? ` ${id}-error` : ""}`}
        aria-invalid={Boolean(error)}
        className={cn(
          "min-h-28 w-full resize-y rounded-[var(--input-radius)] border bg-[var(--input-surface-default)] px-3 py-2.5 text-[13px] leading-[1.5] text-foreground outline-none placeholder:text-[length:var(--input-placeholder-size)] placeholder:text-[var(--input-placeholder)] disabled:cursor-not-allowed disabled:bg-[var(--input-surface-disabled)] disabled:text-content-disabled",
          error ? "border-[var(--input-border-error)]" : "border-[var(--input-border-default)] focus:border-[var(--input-border-focus)]",
        )}
        disabled={disabled}
        id={id}
        maxLength={maxLength}
        name={name}
        onBlur={onBlur}
        onChange={onChange}
        placeholder={placeholder}
        ref={ref}
        rows={4}
      />
      <p className="mt-1 text-right text-caption text-description" id={`${id}-counter`}>
        {valueLength}/{maxLength}
      </p>
    </FieldShell>
  )
}

export { CaseAgeField, CaseDateField, CaseRadioField, CaseTextareaField }
