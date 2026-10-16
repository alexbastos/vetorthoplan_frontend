"use client"

import { useLocale, useTranslations } from "next-intl"

import { FileUploadCard, type FileUploadCardLabels } from "@/components/ui/file-upload-card"
import type { ImportCaseFilesController } from "../hooks/use-import-case-files"
import { CASE_FILE_ACCEPT_ATTRIBUTE, getCaseFileKey } from "../lib/case-file-policy"

type CaseFilesImportProps = {
  caseTitle: string
  controller: ImportCaseFilesController
  onClose: () => void
}

function CaseFilesImport({ caseTitle, controller, onClose }: CaseFilesImportProps) {
  const locale = useLocale()
  const t = useTranslations("cases.newCase.fileImport")
  const files = controller.files.map((file) => ({ file, id: getCaseFileKey(file) }))
  const labels: FileUploadCardLabels = {
    browse: t("browse"),
    close: t("close"),
    description: t("sectionDescription", { caseTitle }),
    dropTitle: t("dropTitle"),
    formats: t("formats"),
    importing: t("importing"),
    preparing: t("preparing"),
    ready: t("ready"),
    removeFile: (fileName) => t("removeFile", { fileName }),
    title: t("title"),
  }

  return (
    <form className="mx-auto mt-4 w-full max-w-[42.5rem]" id="case-files-form" onSubmit={controller.onSubmit}>
      <FileUploadCard
        accept={CASE_FILE_ACCEPT_ATTRIBUTE}
        disabled={controller.isImporting}
        error={controller.selectionError}
        files={files}
        headingId="case-files-title"
        headingLevel={1}
        labels={labels}
        locale={locale}
        onClose={onClose}
        onFileRemove={controller.removeFile}
        onFilesChange={controller.addFiles}
      />
    </form>
  )
}

export { CaseFilesImport }
