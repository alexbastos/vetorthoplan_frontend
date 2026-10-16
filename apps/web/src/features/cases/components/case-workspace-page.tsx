"use client"

import { useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, FileImage, FileText, Film, RefreshCw, Upload } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useRef, useState, type ChangeEvent } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useUnsavedChangesGuard } from "@/components/shared/app-shell/unsaved-changes-guard"
import { useAppTheme } from "@/components/shared/app-shell/app-theme-provider"

import { useCaseWorkspace } from "../hooks/use-case-workspace"
import { casesQueryKeys } from "../hooks/cases-query-keys"
import { CasesRepositoryError } from "../hooks/cases-repository-error"
import { CASE_FILE_ACCEPT_ATTRIBUTE, validateCaseFile } from "../lib/case-file-policy"
import { casesRepository } from "../services/cases-repository"
import type { CaseWorkspaceFile } from "../types/case-workspace"
import { CaseContextDetails } from "./case-context-details"
import { CaseWorkspaceImage } from "./case-workspace-image"
import { CaseWorkspacePanel, type WorkspacePanelSection } from "./case-workspace-panel"
import { CaseImageListItem } from "./case-image-list-item"

type CaseWorkspacePageProps = { caseId: string }
type WorkspaceImage = Extract<CaseWorkspaceFile, { kind: "image" }>

function CaseWorkspacePage({ caseId }: CaseWorkspacePageProps) {
  const t = useTranslations("cases.workspace")
  const tCaseStatus = useTranslations("cases.list.status")
  const queryClient = useQueryClient()
  const router = useRouter()
  const { requestNavigation } = useUnsavedChangesGuard()
  const { resolvedTheme, setPreference } = useAppTheme()
  const query = useCaseWorkspace(caseId)
  const [activeImageId, setActiveImageId] = useState<string | null>(null)
  const [emptySection, setEmptySection] = useState<WorkspacePanelSection>("images")
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleAddFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""
    if (files.length === 0) return
    if (files.some((file) => !validateCaseFile(file).ok)) {
      toast.error(t("upload.invalid"))
      return
    }

    setIsImporting(true)
    try {
      const result = await casesRepository.importFiles({ caseId, files })
      if (!result.ok) throw new CasesRepositoryError(result.error)
      await queryClient.invalidateQueries({ queryKey: casesQueryKeys.all })
      toast.success(t("upload.success"))
    } catch (error) {
      toast.error(error instanceof CasesRepositoryError && error.code === "FILES_UNAVAILABLE"
        ? t("upload.unavailable") : t("upload.error"))
    } finally {
      setIsImporting(false)
    }
  }

  if (query.isLoading) return <WorkspaceLoading label={t("loading")} />
  if (!query.data) {
    const missing = query.error instanceof CasesRepositoryError && query.error.code === "CASE_NOT_FOUND"
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--case-editor-canvas)] px-6 text-center">
        <FileImage aria-hidden="true" className="size-9 text-description" />
        <h1 className="text-xl font-bold text-foreground">{t(missing ? "missing.title" : "error.title")}</h1>
        <p className="max-w-md text-sm text-description">{t(missing ? "missing.description" : "error.description")}</p>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="secondary"><Link href="/app/cases">{t("backToCases")}</Link></Button>
          {!missing ? <Button onClick={() => void query.refetch()} size="sm" type="button"><RefreshCw aria-hidden="true" />{t("retry")}</Button> : null}
        </div>
      </div>
    )
  }

  const { case: caseSummary, files } = query.data
  const images = files.filter((file): file is WorkspaceImage => file.kind === "image")
  const attachments = files.filter((file) => file.kind === "attachment")
  const existingImageNames = images.map((image) => image.file.name)
  const selectedImage = images.find((image) => image.file.id === activeImageId)
    ?? images.find((image) => image.rendering.status === "ready") ?? images[0]
  const imageActions = (
    <Button aria-label={t("upload.add")} className="!size-7 !rounded-[var(--radius-token-md)] !px-0" disabled={isImporting} onClick={() => fileInputRef.current?.click()} size="sm" title={t("upload.add")} type="button" variant="ghost">
      <Upload aria-hidden="true" className="size-4" strokeWidth={1.5} />
    </Button>
  )
  const imageList = (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2 pb-3">
        <p className="font-data text-[0.6875rem] leading-4 font-medium text-foreground">{t("images.count", { count: images.length })}</p>
      </div>
      <div className="space-y-1.5">
        {images.length > 0 ? images.map((image) => (
          <CaseImageListItem caseId={caseId} existingNames={existingImageNames} image={image} isActive={selectedImage?.file.id === image.file.id} key={image.file.id} onSelect={() => requestNavigation(() => setActiveImageId(image.file.id))} />
        )) : <p className="py-5 text-[0.75rem] leading-5 font-normal text-description">{t("images.empty")}</p>}
      </div>
      {attachments.length > 0 ? (
        <div className="mt-5 border-t border-border pt-4">
          <h3 className="font-data text-[0.6875rem] leading-4 font-medium text-foreground">{t("attachments")}</h3>
          <ul className="mt-2 space-y-2">
            {attachments.map((file) => (
              <li className="flex min-w-0 items-center gap-2 text-[0.75rem] leading-5 font-normal text-description" key={file.file.id}>
                {file.format === "pdf" ? <FileText aria-hidden="true" className="size-3.5 shrink-0" /> : <Film aria-hidden="true" className="size-3.5 shrink-0" />}
                <span className="truncate" title={file.file.name}>{file.file.name}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--case-editor-canvas)] text-foreground lg:h-dvh lg:min-h-0" data-case-workspace>
      <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-border bg-card px-4 py-3 sm:px-5 lg:min-h-16 lg:grid-cols-[20rem_minmax(0,1fr)_auto] lg:px-5">
        <div className="col-start-1 row-start-1 flex min-w-0 items-center">
          <Button className="shrink-0 !px-3" onClick={() => requestNavigation(() => router.push("/app/cases"))} size="sm" type="button" variant="ghost">
            <ArrowLeft aria-hidden="true" />
            {t("back")}
          </Button>
        </div>
        <div className="col-start-1 row-start-2 inline-flex w-max items-center gap-1.5 font-data text-[10px] font-medium lg:col-start-2 lg:row-start-1 lg:justify-self-start lg:gap-1 lg:text-[9px] xl:gap-1.5 xl:text-[10px]">
          <span className={`whitespace-nowrap transition-colors motion-reduce:transition-none ${resolvedTheme === "light" ? "text-foreground" : "text-description"}`}>{t("theme.light")}</span>
          <button
            aria-checked={resolvedTheme === "dark"}
            aria-label={t("theme.label")}
            className="relative h-4 w-10 shrink-0 cursor-pointer rounded-full border border-border bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setPreference(resolvedTheme === "light" ? "dark" : "light")}
            role="switch"
            type="button"
          >
            <span aria-hidden="true" className={`pointer-events-none absolute top-1/2 left-0.5 size-3 -translate-y-1/2 rounded-full bg-[var(--color-icon-active-default)] transition-transform duration-200 motion-reduce:transition-none ${resolvedTheme === "dark" ? "translate-x-[1.375rem]" : "translate-x-0"}`} />
          </button>
          <span className={`whitespace-nowrap transition-colors motion-reduce:transition-none ${resolvedTheme === "dark" ? "text-foreground" : "text-description"}`}>{t("theme.dark")}</span>
        </div>
        <h1 className="col-span-2 row-start-3 w-full max-w-[22rem] justify-self-center truncate rounded-[var(--radius-token-md)] border border-border bg-transparent px-4 py-2 text-center text-[13px] font-semibold lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:max-w-48 xl:max-w-[22rem]" title={caseSummary.title}>{caseSummary.title}</h1>
        <div className="col-start-2 row-start-1 hidden items-center justify-end lg:col-start-3 lg:flex">
          <span className="rounded-full border border-border px-3 py-1 font-data text-[10px] font-medium text-description">{tCaseStatus(caseSummary.status)}</span>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 px-3 py-3 sm:px-4 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-3 lg:px-5">
        <input accept={CASE_FILE_ACCEPT_ATTRIBUTE} className="sr-only" disabled={isImporting} multiple onChange={(event) => void handleAddFiles(event)} ref={fileInputRef} tabIndex={-1} type="file" />
        {selectedImage ? (
          <CaseWorkspaceImage caseContext={<CaseContextDetails caseSummary={caseSummary} />} caseId={caseId} image={selectedImage} imageActions={imageActions} imageList={imageList} key={selectedImage.file.id} />
        ) : (
          <>
            <CaseWorkspacePanel activeSection={emptySection} calibrationAvailable={false} caseContext={<CaseContextDetails caseSummary={caseSummary} />} imageActions={imageActions} imageList={imageList} onSectionChange={setEmptySection} />
            <section className="order-2 flex min-h-[28rem] items-center justify-center overflow-hidden rounded-[var(--radius-token-md)] border border-border bg-[var(--case-viewer-shell)] px-6 text-center text-white lg:col-start-2 lg:row-start-1 lg:min-h-0 lg:order-none">
              <div className="max-w-xs"><FileImage aria-hidden="true" className="mx-auto size-9 text-white/40" /><h2 className="mt-4 text-base font-semibold">{t("noImage.title")}</h2><p className="mt-2 text-[13px] leading-5 text-white/60">{t("noImage.description")}</p><Button className="mt-5" onClick={() => fileInputRef.current?.click()} size="sm" type="button">{t("upload.add")}</Button></div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function WorkspaceLoading({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-label={label} className="flex h-dvh flex-col bg-[var(--case-editor-canvas)]">
      <div className="h-20 shrink-0 animate-pulse border-b border-border bg-card" />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 px-4 pb-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="hidden min-h-0 gap-2 lg:flex"><div className="flex flex-col gap-1.5"><div className="size-8 animate-pulse rounded-[var(--radius-token-md)] border border-border bg-card" /><div className="size-8 animate-pulse rounded-[var(--radius-token-md)] border border-border bg-card" /><div className="size-8 animate-pulse rounded-[var(--radius-token-md)] border border-border bg-card" /></div><div className="min-h-0 flex-1 animate-pulse rounded-[var(--radius-token-md)] border border-border bg-card" /></div>
        <div className="animate-pulse rounded-[var(--radius-token-md)] border border-border bg-[var(--case-viewer-shell)]" />
      </div>
    </div>
  )
}

export { CaseWorkspacePage }
