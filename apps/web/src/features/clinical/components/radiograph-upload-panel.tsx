"use client"

import { useState } from "react"

import { clinicalBffClient } from "../services/clinical-bff-client"
import type { IngestionJob } from "../types"

const MAX_BYTES = 100 * 1024 * 1024

function RadiographUploadPanel({ caseId, onSkip, onUploadFinished }: { caseId: string; onSkip: () => void; onUploadFinished?: () => void }) {
  const [files, setFiles] = useState<File[]>([])
  const [states, setStates] = useState<Record<number, string>>({})
  const [isUploading, setIsUploading] = useState(false)

  async function uploadSelectedFiles() {
    if (isUploading || files.length === 0) return
    setIsUploading(true)
    for (const [index, file] of files.entries()) {
      if (states[index] === "Pronta" || states[index]?.startsWith("A ingestão ainda está em andamento")) continue
      try {
        const mediaType = mediaTypeFor(file.name)
        if (!mediaType) throw new Error("Formato não permitido. Use DICOM, PNG ou JPEG.")
        if (file.size < 1 || file.size > MAX_BYTES) throw new Error("O arquivo deve ter até 100 MiB e não pode estar vazio.")

        setStates((current) => ({ ...current, [index]: "Calculando checksum…" }))
        const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer())
        const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")

        setStates((current) => ({ ...current, [index]: "Criando sessão…" }))
        const sessionResult = await clinicalBffClient.createImageUpload(caseId, {
          original_filename: file.name,
          media_type: mediaType,
          size_bytes: file.size,
          sha256,
        })
        if (!sessionResult.ok) throw new Error(sessionResult.error)

        setStates((current) => ({ ...current, [index]: "Enviando ao armazenamento…" }))
        const form = new FormData()
        for (const [name, value] of Object.entries(sessionResult.data.upload.fields)) form.append(name, value)
        form.append("file", file)
        const storageResponse = await fetch(sessionResult.data.upload.url, {
          method: sessionResult.data.upload.method,
          body: form,
          redirect: "error",
          credentials: "omit",
        })
        if (!storageResponse.ok) throw new Error(`O armazenamento recusou o envio (${storageResponse.status}). Selecione o arquivo e tente novamente.`)

        setStates((current) => ({ ...current, [index]: "Confirmando e aguardando ingestão…" }))
        let completeResult = await clinicalBffClient.completeImageUpload(sessionResult.data.upload_id)
        if (!completeResult.ok && completeResult.status >= 500) {
          completeResult = await clinicalBffClient.completeImageUpload(sessionResult.data.upload_id)
        }
        const retryDelays = [1_000, 2_000, 4_000]
        for (const delay of retryDelays) {
          if (completeResult.ok || completeResult.errorCode !== "IMAGE_UPLOAD_OBJECT_INVALID" || completeResult.details?.reason !== "object_not_found") break
          await new Promise((resolve) => window.setTimeout(resolve, delay))
          completeResult = await clinicalBffClient.completeImageUpload(sessionResult.data.upload_id)
        }
        if (!completeResult.ok) throw new Error(completeResult.error)

        let jobStatus: IngestionJob["status"] = completeResult.data.job_status
        for (let attempt = 0; attempt < 150 && (jobStatus === "QUEUED" || jobStatus === "PROCESSING"); attempt += 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 2_000))
          const jobResult = await clinicalBffClient.getIngestionJob(completeResult.data.job_id)
          if (!jobResult.ok) throw new Error(jobResult.error)
          jobStatus = jobResult.data.status
        }
        if (jobStatus === "SUCCEEDED") setStates((current) => ({ ...current, [index]: "Pronta" }))
        else if (jobStatus === "REJECTED") setStates((current) => ({ ...current, [index]: "Recusada; selecione outro arquivo" }))
        else if (jobStatus === "FAILED") setStates((current) => ({ ...current, [index]: "Falha de processamento; tente atualizar o caso" }))
        else setStates((current) => ({ ...current, [index]: "A ingestão ainda está em andamento; acompanhe no caso" }))
        onUploadFinished?.()
      } catch (error) {
        setStates((current) => ({
          ...current,
          [index]: error instanceof Error ? error.message : "Não foi possível enviar este arquivo.",
        }))
      }
    }
    setIsUploading(false)
  }

  return (
    <section className="mx-auto mt-8 w-full max-w-3xl rounded-2xl border border-capta-border-default bg-capta-surface-card p-6 sm:p-8">
      <p className="text-overline text-capta-text-secondary">Etapa 2 de 2</p>
      <h1 className="mt-2 text-heading-3 text-capta-text-primary">Adicionar radiografias (opcional)</h1>
      <p className="mt-2 text-ui text-capta-text-secondary">O caso já foi criado. Você pode anexar imagens agora ou voltar ao caso depois.</p>
      <label
        className="mt-6 block rounded-xl border border-dashed border-capta-border-default p-6 text-ui text-capta-text-secondary"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          setFiles(Array.from(event.dataTransfer.files))
          setStates({})
        }}
      >
        <span className="mb-2 block font-semibold text-capta-text-primary">Selecione ou arraste DICOM, PNG ou JPEG</span>
        <span className="mb-4 block text-caption">Até 100 MiB por arquivo</span>
        <input
          accept=".dcm,.dicom,.png,.jpg,.jpeg,image/png,image/jpeg,application/dicom,image/dicom"
          className="block w-full text-caption"
          disabled={isUploading}
          multiple
          onChange={(event) => {
            const selection = Array.from(event.target.files ?? [])
            setFiles(selection)
            setStates({})
          }}
          type="file"
        />
      </label>
      {files.length > 0 && (
        <ul className="mt-5 space-y-3">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`} className="flex flex-wrap justify-between gap-2 rounded-lg bg-capta-surface-subtle p-3 text-caption">
              <span className="font-semibold text-capta-text-primary">{file.name}</span>
              <span className="text-capta-text-secondary">{states[index] ?? "Selecionada"}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        {files.length > 0 && <button className="rounded-xl bg-capta-brand-primary px-5 py-3 text-ui font-semibold text-white disabled:opacity-60" disabled={isUploading} onClick={() => void uploadSelectedFiles()} type="button">{isUploading ? "Enviando…" : "Adicionar agora"}</button>}
        <button className="rounded-xl border border-capta-border-default px-5 py-3 text-ui font-semibold text-capta-text-primary" disabled={isUploading} onClick={onSkip} type="button">Ir para o caso / adicionar depois</button>
      </div>
      <p className="mt-4 text-caption text-capta-text-muted">O envio do arquivo e o processamento são etapas distintas. A tela só indicará “Pronta” após o processamento terminar.</p>
    </section>
  )
}

function mediaTypeFor(filename: string): string | null {
  const extension = filename.toLowerCase().split(".").pop()
  if (extension === "dcm" || extension === "dicom") return "application/dicom"
  if (extension === "png") return "image/png"
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg"
  return null
}

export { RadiographUploadPanel }
