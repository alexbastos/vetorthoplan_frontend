import { Pencil } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"
import type { UseFormRegisterReturn } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"

type ProfileFormRowProps = {
  autoComplete?: string
  description?: string
  editable?: boolean
  error?: string
  formatValue?: (value: string) => string
  label: string
  inputMode?: "decimal" | "email" | "none" | "numeric" | "search" | "tel" | "text" | "url"
  onValueChange?: (value: string) => void
  placeholder?: string
  registration: UseFormRegisterReturn
  required?: boolean
  showDivider?: boolean
  type?: "date" | "email" | "tel" | "text" | "url"
}

function ProfileFormRow({ autoComplete, description, editable = true, error, formatValue, inputMode, label, onValueChange, placeholder, registration, required, showDivider = true, type = "text" }: ProfileFormRowProps) {
  const inputId = `profile-${registration.name}`

  return (
    <div className={showDivider ? "border-b border-capta-border-default py-4" : "py-4"}>
      <label className="text-caption font-semibold text-capta-text-muted" htmlFor={inputId}>
        {label}{required ? <span aria-hidden="true" className="ml-1 text-[var(--color-feedback-error)]">*</span> : null}
      </label>
      <div className="mt-1.5 flex items-center gap-3">
        <input
          {...registration}
          autoComplete={autoComplete}
          className="min-w-0 flex-1 bg-transparent text-ui font-semibold text-capta-text-primary outline-none placeholder:font-normal placeholder:text-capta-text-muted focus-visible:outline-none"
          id={inputId}
          inputMode={inputMode}
          onChange={(event) => {
            if (formatValue) {
              event.currentTarget.value = formatValue(event.currentTarget.value)
            }

            const value = event.currentTarget.value
            registration.onChange(event)
            onValueChange?.(value)
          }}
          placeholder={placeholder}
          readOnly={!editable}
          type={type}
        />
        {editable ? <EditFieldButton inputId={inputId} label={label} /> : null}
      </div>
      {error ? <p className="mt-1 text-caption text-[var(--color-feedback-error)]" role="alert">{error}</p> : null}
      {!error && description ? <p aria-live="polite" className="mt-1 text-caption text-capta-text-secondary">{description}</p> : null}
    </div>
  )
}

type ProfileTextAreaRowProps = {
  error?: string
  onValueChange: (value: string) => void
  showDivider?: boolean
  value: string
}

type ProfileDateRowProps = {
  error?: string
  label: string
  onValueChange: (value: string) => void
  value: string
}

function ProfileDateRow({ error, label, onValueChange, value }: ProfileDateRowProps) {
  const inputId = "profile-birth-date"

  return (
    <div className="border-b border-capta-border-default py-4">
      <label className="text-caption font-semibold text-capta-text-muted" htmlFor={inputId}>{label}</label>
      <div className="mt-1.5 flex items-center gap-3">
        <DatePicker id={inputId} onValueChange={onValueChange} value={value} />
        <EditFieldButton inputId={inputId} label={label} />
      </div>
      {error ? <p className="mt-1 text-caption text-[var(--color-feedback-error)]" role="alert">{error}</p> : null}
    </div>
  )
}

function ProfileTextAreaRow({ error, onValueChange, showDivider = true, value }: ProfileTextAreaRowProps) {
  const t = useTranslations("settings.fields")
  const tActions = useTranslations("common.actions")
  const tAccessibility = useTranslations("common.accessibility")
  const inputId = "profile-bio"
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [draft, setDraft] = useState(value)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (!isEditing) {
      setDraft(value)
    }
  }, [isEditing, value])

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus()
    }
  }, [isEditing])

  const cancelEditing = () => {
    setDraft(value)
    setIsEditing(false)
  }

  const saveDraft = () => {
    onValueChange(draft)
    setIsEditing(false)
  }

  return (
    <div className={showDivider ? "border-b border-capta-border-default py-4" : "py-4"}>
      <label className="text-caption font-semibold text-capta-text-muted" htmlFor={inputId}>{t("bio")}</label>
      {isEditing ? (
        <div className="mt-1.5">
          <textarea
            aria-invalid={Boolean(error)}
            className="min-h-20 w-full resize-y rounded-[var(--input-radius)] border border-capta-border-default bg-transparent px-3 py-2 text-ui text-capta-text-primary outline-none placeholder:text-capta-text-muted transition-colors focus-visible:border-capta-border-default"
            id={inputId}
            maxLength={500}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t("bioPlaceholder")}
            ref={textareaRef}
            rows={3}
            value={draft}
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button onClick={cancelEditing} size="sm" type="button" variant="ghost">{tActions("cancel")}</Button>
            <Button onClick={saveDraft} size="sm" type="button">{tActions("save")}</Button>
          </div>
        </div>
      ) : (
        <div className="mt-1.5 flex items-start gap-3">
          <p className={`min-w-0 flex-1 text-ui ${value ? "font-semibold text-capta-text-primary" : "font-normal text-capta-text-muted"}`}>
            {value || t("bioPlaceholder")}
          </p>
          <button
            aria-controls={inputId}
            aria-expanded={false}
            aria-label={tAccessibility("editField", { field: t("bio") })}
            className="shrink-0 cursor-pointer rounded-sm p-1 text-capta-text-muted transition-colors hover:text-capta-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-capta-brand-primary"
            onClick={() => setIsEditing(true)}
            type="button"
          >
            <Pencil aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}
      {error ? <p className="mt-1 text-caption text-[var(--color-feedback-error)]" role="alert">{error}</p> : null}
    </div>
  )
}

type EditFieldButtonProps = {
  inputId: string
  label: string
}

function EditFieldButton({ inputId, label }: EditFieldButtonProps) {
  const t = useTranslations("common.accessibility")
  return (
    <button
      aria-label={t("editField", { field: label })}
      className="shrink-0 cursor-pointer rounded-sm p-1 text-capta-text-muted transition-colors hover:text-capta-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-capta-brand-primary"
      onClick={() => {
        const field = document.getElementById(inputId)

        if (field instanceof HTMLButtonElement) {
          field.click()
          return
        }

        field?.focus()
      }}
      type="button"
    >
      <Pencil aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
    </button>
  )
}

export { ProfileDateRow, ProfileFormRow, ProfileTextAreaRow }
