"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, ArrowLeft, CheckCircle2, FileImage, LoaderCircle } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

import { clinicalBffClient } from "../services/clinical-bff-client"
import type { ClinicalImage } from "../types"
import { PlanningViewer } from "./planning-viewer"
import { RadiographUploadPanel } from "./radiograph-upload-panel"

function CaseWorkspace({ caseId }: { caseId: string }) {
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [addingRadiographs, setAddingRadiographs] = useState(false)
  const queryClient = useQueryClient()
  const caseQuery = useQuery({
    queryKey: ["clinical-case", caseId],
    queryFn: async () => {
      const result = await clinicalBffClient.getCase(caseId)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
  })
  const imagesQuery = useQuery({
    queryKey: ["clinical-images", caseId],
    queryFn: async () => {
      const result = await clinicalBffClient.listImages(caseId)
      if (!result.ok) throw new Error(result.error)
      return result.data.items
    },
    refetchInterval(query) {
      const images = query.state.data
      return images?.some((image) => ["PROCESSING", "QUARANTINED"].includes(image.status)) ? 2_000 : false
    },
  })

  useEffect(() => {
    if (selectedImageId || !imagesQuery.data) return
    setSelectedImageId(imagesQuery.data.find((image) => image.status === "READY")?.id ?? imagesQuery.data[0]?.id ?? null)
  }, [imagesQuery.data, selectedImageId])

  const selectedImage = imagesQuery.data?.find((image) => image.id === selectedImageId)

  if (caseQuery.isLoading || imagesQuery.isLoading) {
    return <div className="flex min-h-[70vh] items-center justify-center text-ui text-capta-text-secondary"><LoaderCircle className="mr-2 size-5 animate-spin" /> Carregando caso…</div>
  }
  if (caseQuery.isError || imagesQuery.isError || !caseQuery.data) {
    return <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">Não foi possível abrir este caso clínico.</div>
  }

  return (
    <main className="flex min-h-full flex-col px-4 py-5 sm:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-capta-border-default bg-capta-surface-card text-capta-text-secondary hover:text-capta-text-primary" href="/app/cases" aria-label="Voltar aos casos">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <p className="text-overline text-capta-text-secondary">{caseQuery.data.animal_name} · {caseQuery.data.species}</p>
            <h1 className="truncate text-heading-4 text-capta-text-primary">{caseQuery.data.title}</h1>
          </div>
        </div>
        <span className="rounded-full border border-capta-border-default bg-capta-surface-card px-3 py-1.5 text-caption font-semibold text-capta-text-secondary">
          {imagesQuery.data?.length ?? 0} radiografia(s)
        </span>
        <button className="rounded-xl bg-capta-brand-primary px-4 py-2.5 text-caption font-semibold text-white" onClick={() => setAddingRadiographs((current) => !current)} type="button">Adicionar radiografias</button>
      </header>

      {addingRadiographs && (
        <RadiographUploadPanel
          caseId={caseId}
          onSkip={() => setAddingRadiographs(false)}
          onUploadFinished={() => void queryClient.invalidateQueries({ queryKey: ["clinical-images", caseId] })}
        />
      )}

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {imagesQuery.data?.map((image) => (
          <ImageTab key={image.id} active={image.id === selectedImageId} image={image} onClick={() => setSelectedImageId(image.id)} />
        ))}
      </div>

      {!selectedImage ? (
        <EmptyMessage title="Nenhuma radiografia" description="Envie e confirme uma imagem para iniciar o planejamento." />
      ) : selectedImage.status === "READY" && selectedImage.preview_available ? (
        <PlanningViewer key={selectedImage.id} image={selectedImage} />
      ) : selectedImage.status === "READY" ? (
        <EmptyMessage title="Imagem processada, prévia indisponível" description="A imagem está pronta, mas ainda não há uma prévia para abrir no visualizador." />
      ) : selectedImage.status === "PENDING_UPLOAD" ? (
        <EmptyMessage title="Envio não concluído" description="Esta sessão não foi confirmada. Você pode iniciar um novo envio pelo botão “Adicionar radiografias”." />
      ) : selectedImage.status === "REJECTED" ? (
        <EmptyMessage
          title="Radiografia recusada"
          description={`O arquivo não passou pela inspeção (${selectedImage.rejection_code ?? "motivo desconhecido"}). Faça um novo envio.`}
          danger
        />
      ) : (
        <EmptyMessage
          title="Processando radiografia"
          description="A página atualiza automaticamente a cada dois segundos enquanto o worker valida e gera a prévia."
          loading
        />
      )}
    </main>
  )
}

function ImageTab({ active, image, onClick }: { active: boolean; image: ClinicalImage; onClick: () => void }) {
  return (
    <button
      className={cn(
        "flex min-w-56 items-center gap-3 rounded-xl border bg-capta-surface-card px-3 py-2 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-capta-border-focus",
        active ? "border-capta-brand-secondary shadow-sm" : "border-capta-border-default hover:bg-capta-surface-subtle",
      )}
      onClick={onClick}
      type="button"
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-capta-surface-subtle"><FileImage className="size-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-ui font-semibold text-capta-text-primary">{image.original_filename}</span>
        <span className="mt-0.5 flex items-center gap-1 text-caption text-capta-text-secondary">
          {image.status === "READY" ? <CheckCircle2 className="size-3 text-emerald-600" /> : image.status === "REJECTED" ? <AlertTriangle className="size-3 text-red-600" /> : <LoaderCircle className="size-3 animate-spin" />}
          {imageStatusLabel(image.status)}
        </span>
      </span>
    </button>
  )
}

function EmptyMessage({ danger, description, loading, title }: { danger?: boolean; description: string; loading?: boolean; title: string }) {
  return (
    <div className={cn("flex min-h-[620px] flex-col items-center justify-center rounded-2xl border border-dashed bg-capta-surface-card p-8 text-center", danger ? "border-red-300" : "border-capta-border-default")}>
      {loading ? <LoaderCircle className="mb-4 size-9 animate-spin text-capta-brand-secondary" /> : danger ? <AlertTriangle className="mb-4 size-9 text-red-600" /> : <FileImage className="mb-4 size-9 text-capta-text-muted" />}
      <h2 className="text-heading-4 text-capta-text-primary">{title}</h2>
      <p className="mt-2 max-w-lg text-ui text-capta-text-secondary">{description}</p>
    </div>
  )
}

function imageStatusLabel(status: ClinicalImage["status"]): string {
  return ({ PENDING_UPLOAD: "Aguardando envio", PROCESSING: "Processando", QUARANTINED: "Na fila", READY: "Pronta", REJECTED: "Recusada" })[status]
}

export { CaseWorkspace }
