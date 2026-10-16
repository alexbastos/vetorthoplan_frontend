"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import type { FormEvent, InputHTMLAttributes } from "react"
import { useState } from "react"

import { clinicalBffClient } from "../services/clinical-bff-client"
import type { ClinicalCase, CreateCasePayload } from "../types"
import { RadiographUploadPanel } from "./radiograph-upload-panel"

function CreateCasePage() {
  const router = useRouter()
  const [createdCase, setCreatedCase] = useState<ClinicalCase | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function createCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    const form = new FormData(event.currentTarget)
    const birthDate = stringField(form, "birth_date")
    const approximateAge = stringField(form, "approximate_age_months")
    const payload: CreateCasePayload = {
      title: stringField(form, "title"),
      animal_name: stringField(form, "animal_name"),
      species: stringField(form, "species"),
      breed: stringField(form, "breed") || null,
      sex: (stringField(form, "sex") || null) as CreateCasePayload["sex"],
      birth_date: birthDate || null,
      approximate_age_months: approximateAge ? Number(approximateAge) : null,
      weight_kg: stringField(form, "weight_kg") ? Number(stringField(form, "weight_kg")) : null,
      clinical_notes: stringField(form, "clinical_notes") || null,
    }
    if (payload.birth_date && payload.approximate_age_months !== null) {
      setFieldErrors({ approximate_age_months: "Informe a data de nascimento ou a idade aproximada, não ambos." })
      return
    }

    setIsSubmitting(true)
    setError(null)
    setFieldErrors({})
    const key = idempotencyKey ?? crypto.randomUUID()
    setIdempotencyKey(key)
    const result = await clinicalBffClient.createCase(payload, key)
    setIsSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      setFieldErrors(result.fieldErrors ?? {})
      return
    }
    setCreatedCase(result.data)
  }

  if (createdCase) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-8 sm:px-8 sm:py-10">
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-ui text-emerald-900" role="status">
          Caso criado como rascunho. A radiografia é opcional e pode ser adicionada depois.
        </div>
        <section className="mx-auto max-w-3xl rounded-2xl border border-capta-border-default bg-capta-surface-card p-6 sm:p-8">
          <p className="text-overline text-capta-text-secondary">Etapa 1 de 2 · Somente leitura</p>
          <h1 className="mt-2 text-heading-3 text-capta-text-primary">{createdCase.title}</h1>
          <p className="mt-2 text-ui text-capta-text-secondary">{createdCase.animal_name} · {createdCase.species}{createdCase.breed ? ` · ${createdCase.breed}` : ""}</p>
          <p className="mt-2 text-caption text-capta-text-muted">O caso já está salvo. Para corrigir os dados, será necessária a operação de edição do backend.</p>
        </section>
        <RadiographUploadPanel caseId={createdCase.id} onSkip={() => router.push(`/app/cases/${createdCase.id}`)} />
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8 sm:px-8 sm:py-10">
      <Link className="text-caption font-semibold text-capta-text-secondary underline" href="/app/cases">Voltar aos casos</Link>
      <section className="mx-auto mt-5 max-w-3xl rounded-2xl border border-capta-border-default bg-capta-surface-card p-6 sm:p-8">
        <p className="text-overline text-capta-text-secondary">Etapa 1 de 2</p>
        <h1 className="mt-2 text-heading-3 text-capta-text-primary">Dados do caso</h1>
        <p className="mt-2 text-ui text-capta-text-secondary">Crie o caso primeiro. Você poderá adicionar radiografias na próxima etapa ou depois.</p>
        <form className="mt-7 grid gap-5 sm:grid-cols-2" onSubmit={(event) => void createCase(event)}>
          <Field label="Título do caso" name="title" required maxLength={200} error={fieldErrors.title} onEdit={() => setIdempotencyKey(null)} />
          <Field label="Nome do paciente" name="animal_name" required maxLength={120} error={fieldErrors.animal_name} onEdit={() => setIdempotencyKey(null)} />
          <Field label="Espécie" name="species" required maxLength={80} error={fieldErrors.species} onEdit={() => setIdempotencyKey(null)} />
          <Field label="Raça (opcional)" name="breed" maxLength={120} error={fieldErrors.breed} onEdit={() => setIdempotencyKey(null)} />
          <label className="block text-caption font-semibold text-capta-text-secondary">
            Sexo (opcional)
            <select className={inputClass} name="sex" defaultValue="" onChange={() => setIdempotencyKey(null)}>
              <option value="">Não informado</option><option value="FEMALE">Fêmea</option><option value="MALE">Macho</option><option value="UNKNOWN">Desconhecido</option>
            </select>
            {fieldErrors.sex && <span className="mt-1 block text-red-700">{fieldErrors.sex}</span>}
          </label>
          <Field label="Nascimento" name="birth_date" type="date" error={fieldErrors.birth_date} onEdit={() => setIdempotencyKey(null)} />
          <Field label="Idade aproximada (meses)" name="approximate_age_months" type="number" min={0} max={600} error={fieldErrors.approximate_age_months} onEdit={() => setIdempotencyKey(null)} />
          <Field label="Peso em kg (opcional)" name="weight_kg" type="number" min={0.01} max={99999.99} step={0.01} error={fieldErrors.weight_kg} onEdit={() => setIdempotencyKey(null)} />
          <label className="block text-caption font-semibold text-capta-text-secondary sm:col-span-2">
            Notas clínicas (opcional)
            <textarea className={`${inputClass} min-h-28`} name="clinical_notes" maxLength={4000} onChange={() => setIdempotencyKey(null)} />
            {fieldErrors.clinical_notes && <span className="mt-1 block text-red-700">{fieldErrors.clinical_notes}</span>}
          </label>
          {error && <p className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-ui text-red-800" role="alert">Não foi possível criar o caso: {error}. Corrija os campos ou tente novamente.</p>}
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <button className="rounded-xl bg-capta-brand-primary px-5 py-3 text-ui font-semibold text-white disabled:opacity-60" disabled={isSubmitting} type="submit">{isSubmitting ? "Criando…" : "Criar caso"}</button>
            <Link className="rounded-xl border border-capta-border-default px-5 py-3 text-ui font-semibold text-capta-text-primary" href="/app/cases">Cancelar</Link>
          </div>
        </form>
      </section>
    </main>
  )
}

const inputClass = "mt-2 block w-full rounded-xl border border-capta-border-default bg-capta-surface-card px-3 py-3 text-ui text-capta-text-primary outline-none focus-visible:ring-2 focus-visible:ring-capta-border-focus"

function Field({
  label,
  name,
  error,
  onEdit,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; onEdit: () => void }) {
  return (
    <label className="block text-caption font-semibold text-capta-text-secondary">
      {label}
      <input className={inputClass} name={name} onChange={onEdit} {...props} />
      {error && <span className="mt-1 block text-red-700">{error}</span>}
    </label>
  )
}

function stringField(form: FormData, name: string): string {
  const value = form.get(name)
  return typeof value === "string" ? value.trim() : ""
}

export { CreateCasePage }
