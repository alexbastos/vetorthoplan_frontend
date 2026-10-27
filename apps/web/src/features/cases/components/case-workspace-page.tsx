"use client"

import { ArrowLeft, FileImage, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

import { useUnsavedChangesGuard } from "@/components/shared/app-shell/unsaved-changes-guard"
import { useAppTheme } from "@/components/shared/app-shell/app-theme-provider"
import { Button } from "@/components/ui/button"

import { useCaseDetail } from "../hooks/use-case-detail"
import { useCaseIngestions } from "../hooks/use-case-ingestions"
import { canPreviewCaseImage, caseImageViewerMessage } from "../lib/case-image-state"
import { CaseDetailRequestError } from "../services/case-detail-api"
import { CaseContextDetails } from "./case-context-details"
import { CaseFilesImport } from "./case-files-import"
import { CaseImagesList } from "./case-images-list"
import { CasePreviewPanel } from "./case-preview-panel"
import { CaseWorkspacePanel, type WorkspacePanelSection } from "./case-workspace-panel"
import { TploPlanningPanel } from "./tplo-planning-panel"

type CaseWorkspacePageProps = { caseId: string }

function CaseWorkspacePage({ caseId }: CaseWorkspacePageProps) {
  const t = useTranslations("cases.workspace")
  const tCaseStatus = useTranslations("cases.list.status")
  const router = useRouter()
  const { requestNavigation } = useUnsavedChangesGuard()
  const { resolvedTheme, setPreference } = useAppTheme()
  const query = useCaseDetail(caseId)
  const ingestion = useCaseIngestions(caseId, Boolean(query.data))
  const { imagesQuery, jobActive } = ingestion
  const [activeSection, setActiveSection] = useState<WorkspacePanelSection>("case")
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [planningOpen, setPlanningOpen] = useState(false)
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  useEffect(() => {
    if (selectedImageId && imagesQuery.data && !imagesQuery.data.some(image => image.id === selectedImageId)) setSelectedImageId(null)
  }, [imagesQuery.data, selectedImageId])

  if (query.isLoading) return <WorkspaceLoading label={t("loading")} />
  if (!query.data) {
    const missing = query.error instanceof CaseDetailRequestError
      && (query.error.code === "CASE_NOT_FOUND" || query.error.code === "VALIDATION_ERROR")
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--case-editor-canvas)] px-6 text-center" role="alert">
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

  const caseDetail = query.data
  const images = imagesQuery.data ?? []
  const selectedImage = images.find((image) => image.id === selectedImageId)
    ?? images.find(canPreviewCaseImage) ?? images[0]
  const canShowPreview = canPreviewCaseImage(selectedImage)
  const selectedIngestion = ingestion.entries.find((entry) => entry.imageId === selectedImage?.id)
  const selectedJob = selectedIngestion?.job
  const imageMessage = caseImageViewerMessage(selectedImage, selectedJob?.status, selectedIngestion?.retryAcknowledged)
  const viewerTitle = imagesQuery.isPending ? "imagesLoading.title" : imagesQuery.isError ? "imagesReadError.title"
    : `${imageMessage}.title` as const
  const viewerDescription = imagesQuery.isPending ? "imagesLoading.description" : imagesQuery.isError ? "imagesReadError.description"
    : `${imageMessage}.description` as const
  const closeUpload = () => {
    setUploadOpen(false)
  }
  const openUpload = () => {
    setUploadOpen(true)
  }
  const imageList = <>
    <div className={uploadOpen ? "" : "hidden"}>
      <CaseFilesImport caseId={caseId} caseTitle={caseDetail.title} ingestion={ingestion} mode="existing" onBusyChange={setUploadBusy} onClose={closeUpload} />
    </div>
    <div className={uploadOpen ? "hidden" : ""}>
      {jobActive || ingestion.hasFailedJob || ingestion.hasReadError || ingestion.hasMissingJob || ingestion.hasUnscheduledJob || ingestion.needsImageRefresh ? (
        <div className="mb-3 space-y-2 rounded-[var(--radius-token-md)] border border-border bg-muted/40 px-3 py-3 text-sm" role="status">
          <p className="font-medium text-foreground">{t(ingestion.hasMissingJob ? "images.jobMissing"
            : ingestion.hasUnscheduledJob ? "images.jobNotScheduled" : ingestion.hasReadError ? "images.jobReadError"
              : ingestion.hasFailedJob ? "images.jobFailed" : jobActive ? "images.jobActive" : "images.jobReconciling")}</p>
          {ingestion.hasMissingJob || ingestion.hasUnscheduledJob || ingestion.hasReadError || ingestion.hasFailedJob || ingestion.needsImageRefresh ? <Button disabled={ingestion.isRefreshing} onClick={() => void ingestion.refresh()} size="sm" type="button" variant="secondary">{t("images.refreshProcessing")}</Button> : null}
        </div>
      ) : null}
      <CaseImagesList canAdd ingestion={ingestion} query={imagesQuery} onAdd={openUpload} onSelect={setSelectedImageId} onDeleted={id => setSelectedImageId(current => current === id ? null : current)} selectedId={selectedImage?.id ?? null} />
    </div>
  </>

  if (planningOpen && selectedImage && canPreviewCaseImage(selectedImage)) {
    return <TploPlanningPanel caseId={caseId} caseTitle={caseDetail.title} image={selectedImage} onBack={() => setPlanningOpen(false)} />
  }

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
        <h1 className="col-span-2 row-start-3 w-full max-w-[22rem] justify-self-center truncate rounded-[var(--radius-token-md)] border border-border bg-transparent px-4 py-2 text-center text-[13px] font-semibold lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:max-w-48 xl:max-w-[22rem]" title={caseDetail.title}>{caseDetail.title}</h1>
        <div className="col-start-2 row-start-1 hidden items-center justify-end lg:col-start-3 lg:flex">
          <span className="rounded-full border border-border px-3 py-1 font-data text-[10px] font-medium text-description">{tCaseStatus(caseDetail.status)}</span>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 px-3 py-3 sm:px-4 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-3 lg:px-5">
        <CaseWorkspacePanel
          activeSection={activeSection}
          calibrationAvailable={false}
          caseContext={<CaseContextDetails caseSummary={caseDetail} />}
          imageList={imageList}
          imageActions={<div className="flex flex-wrap gap-2"><Button disabled={uploadBusy} onClick={() => uploadOpen ? closeUpload() : openUpload()} size="sm" type="button" variant="secondary">{t(uploadOpen ? "images.backToList" : "images.addRadiograph")}</Button>{selectedImage && canPreviewCaseImage(selectedImage) && !uploadOpen ? <Button onClick={() => setPlanningOpen(true)} size="sm" type="button">Abrir planejamento TPLO</Button> : null}</div>}
          onSectionChange={setActiveSection}
        />
        {canShowPreview ? <CasePreviewPanel image={selectedImage} key={selectedImage.id} /> : <section className="order-2 flex min-h-[28rem] items-center justify-center overflow-hidden rounded-[var(--radius-token-md)] border border-border bg-[var(--case-viewer-shell)] px-6 text-center text-white lg:col-start-2 lg:row-start-1 lg:min-h-0 lg:order-none">
          <div className="max-w-xs">
            <FileImage aria-hidden="true" className="mx-auto size-9 text-white/40" />
            <h2 className="mt-4 text-base font-semibold">{t(viewerTitle)}</h2>
            <p className="mt-2 text-[13px] leading-5 text-white/60">{t(viewerDescription)}</p>
          </div>
        </section>}
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
