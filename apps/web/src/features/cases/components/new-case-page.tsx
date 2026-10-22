"use client"

import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useCallback, useState } from "react"

import { Button } from "@/components/ui/button"
import { useNewCaseForm } from "../hooks/use-new-case-form"
import { getCaseWorkspaceHref } from "../lib/case-workspace-route"
import type { CaseDetail } from "../types/case-detail"
import { CaseCreationProgress, type CaseCreationStep } from "./case-creation-progress"
import { CaseFilesImport } from "./case-files-import"
import { NewCaseForm } from "./new-case-form"

function NewCasePage() {
  const router = useRouter()
  const t = useTranslations("cases.newCase")
  const [currentStep, setCurrentStep] = useState<CaseCreationStep>("case-details")
  const [createdCase, setCreatedCase] = useState<CaseDetail | null>(null)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadConfirmed, setUploadConfirmed] = useState(false)
  const continueToFileImport = useCallback((created: CaseDetail) => {
    setCreatedCase(created)
    setCurrentStep("file-import")
  }, [])
  const controller = useNewCaseForm({ onCreated: continueToFileImport })
  const isCaseDetailsStep = currentStep === "case-details"
  const isBusy = controller.isCreating || uploadBusy
  const finish = useCallback(() => {
    if (createdCase) {
      router.push(getCaseWorkspaceHref(createdCase.id))
    }
  }, [createdCase, router])
  const handleBack = isCaseDetailsStep ? controller.cancel : finish

  return (
    <div className="min-h-dvh bg-[var(--case-editor-canvas)]" data-case-editor>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
          <Button disabled={isBusy} onClick={handleBack} size="sm" type="button" variant="ghost">
            <ArrowLeft aria-hidden="true" />
            {t("actions.back")}
          </Button>

          <div className="flex items-center gap-2">
            {isCaseDetailsStep ? (
              <>
                <Button disabled={isBusy} onClick={controller.cancel} size="sm" type="button" variant="secondary">{t("actions.cancel")}</Button>
                <Button form="new-case-form" loading={controller.isCreating} size="sm" type="submit">
                  {controller.isCreating ? t("actions.creating") : t("actions.create")}
                </Button>
              </>
            ) : (
              <Button disabled={isBusy} onClick={finish} size="sm" type="button">{t("actions.openCase")}</Button>
            )}
          </div>
        </div>
      </header>

      <main className="px-4 py-8 sm:px-6">
        <CaseCreationProgress
          caseCompletion={controller.completion}
          currentStep={currentStep}
          fileCompletion={uploadConfirmed ? 100 : 0}
        />

        {isCaseDetailsStep ? (
          <section
            aria-labelledby="new-case-title"
            className="mx-auto mt-4 w-full max-w-[42.5rem] overflow-hidden rounded-[var(--radius-token-xl)] border border-border bg-card shadow-[var(--shadow-card)]"
          >
            <header className="px-5 pt-6 pb-3 sm:px-8 sm:pt-7 sm:pb-3">
              <h1 className="text-[22px] leading-[1.3] font-bold text-foreground" id="new-case-title">{t("title")}</h1>
              <p className="mt-2 max-w-2xl text-[13px] leading-[1.4] text-description">{t("description")}</p>
            </header>
            <NewCaseForm controller={controller} />
          </section>
        ) : (
          <CaseFilesImport
            caseId={createdCase?.id ?? ""}
            caseTitle={createdCase?.title ?? ""}
            onBusyChange={setUploadBusy}
            onConfirmed={() => setUploadConfirmed(true)}
          />
        )}
      </main>
    </div>
  )
}

export { NewCasePage }
