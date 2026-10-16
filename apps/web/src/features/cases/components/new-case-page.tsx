"use client"

import { ArrowLeft } from "lucide-react"
import { useTranslations } from "next-intl"
import { useCallback, useState } from "react"

import { Button } from "@/components/ui/button"
import { useImportCaseFiles } from "../hooks/use-import-case-files"
import { useNewCaseForm } from "../hooks/use-new-case-form"
import type { CreateCaseInput } from "../types/cases"
import { CaseCreationProgress, type CaseCreationStep } from "./case-creation-progress"
import { CaseFilesImport } from "./case-files-import"
import { NewCaseForm } from "./new-case-form"

function NewCasePage() {
  const t = useTranslations("cases.newCase")
  const [currentStep, setCurrentStep] = useState<CaseCreationStep>("case-details")
  const [caseInput, setCaseInput] = useState<CreateCaseInput | null>(null)
  const continueToFileImport = useCallback((input: CreateCaseInput) => {
    setCaseInput(input)
    setCurrentStep("file-import")
  }, [])
  const controller = useNewCaseForm({ onContinue: continueToFileImport })
  const fileImportController = useImportCaseFiles({ caseInput })
  const isCaseDetailsStep = currentStep === "case-details"
  const isBusy = controller.isContinuing || fileImportController.isImporting
  const activeFormId = isCaseDetailsStep ? "new-case-form" : "case-files-form"
  const handleBack = isCaseDetailsStep ? controller.cancel : () => setCurrentStep("case-details")

  return (
    <div className="min-h-dvh bg-[var(--case-editor-canvas)]" data-case-editor>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
          <Button disabled={isBusy} onClick={handleBack} size="sm" type="button" variant="ghost">
            <ArrowLeft aria-hidden="true" />
            {t("actions.back")}
          </Button>

          <div className="flex items-center gap-2">
            <Button disabled={isBusy} onClick={controller.cancel} size="sm" type="button" variant="secondary">
              {t("actions.cancel")}
            </Button>
            <Button form={activeFormId} loading={isBusy} size="sm" type="submit">
              {isCaseDetailsStep
                ? controller.isContinuing ? t("actions.continuing") : t("actions.continue")
                : fileImportController.isImporting ? t("actions.importing") : t("actions.finish")}
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 py-8 sm:px-6">
        <CaseCreationProgress
          caseCompletion={controller.completion}
          currentStep={currentStep}
          fileCompletion={fileImportController.completion}
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
            caseTitle={caseInput?.title ?? ""}
            controller={fileImportController}
            onClose={() => setCurrentStep("case-details")}
          />
        )}
      </main>
    </div>
  )
}

export { NewCasePage }
