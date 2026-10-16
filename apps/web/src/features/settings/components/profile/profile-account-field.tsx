"use client"

import { useTranslations } from "next-intl"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type ProfileEditLineProps = {
  children: ReactNode
  className?: string
  description?: string
  error?: string
  id: string
  label: string
  required?: boolean
  showDivider?: boolean
}

function ProfileEditLine({ children, className, description, error, id, label, required = false, showDivider = true }: ProfileEditLineProps) {
  return (
    <div className={className}>
      <div
        className={cn(
          "py-4 transition-colors",
          showDivider && "border-b focus-within:border-[var(--input-border-focus)]",
          showDivider && (error ? "border-[var(--input-border-error)]" : "border-border"),
        )}
      >
        <label className="mb-1.5 block font-data text-[0.6875rem] leading-4 font-medium text-foreground" htmlFor={id}>
          {label}{required ? <span aria-hidden="true" className="text-[var(--color-feedback-error)]"> *</span> : null}
        </label>
        {children}
      </div>
      {error ? <p className="mt-2 text-caption text-[var(--color-feedback-error)]" id={`${id}-error`} role="alert">{error}</p> : null}
      {!error && description ? <p aria-live="polite" className="mt-2 text-caption text-description" id={`${id}-description`}>{description}</p> : null}
    </div>
  )
}

type ProfileDisplayFieldProps = {
  className?: string
  label: string
  value: string
}

function ProfileDisplayField({ className, label, value }: ProfileDisplayFieldProps) {
  const t = useTranslations("settings.profile")
  const hasValue = value.trim().length > 0

  return (
    <div className={className}>
      <dt className="font-data text-[0.6875rem] leading-4 font-medium text-foreground">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-[0.75rem] leading-5 font-normal text-description">{hasValue ? value : t("notProvided")}</dd>
    </div>
  )
}

const PROFILE_LINE_INPUT_CLASS_NAME = "w-full min-w-0 bg-transparent py-1 text-[0.75rem] leading-5 text-description outline-none placeholder:text-[0.75rem] placeholder:text-[var(--input-placeholder)]"

export { PROFILE_LINE_INPUT_CLASS_NAME, ProfileDisplayField, ProfileEditLine }
