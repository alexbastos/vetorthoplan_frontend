"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { toast } from "sonner"

import { useUnsavedChangesGuard } from "@/components/shared/app-shell/unsaved-changes-guard"

import { getCaseFileKey, validateCaseFile, type CaseFileValidationError } from "../lib/case-file-policy"
import { getCaseWorkspaceHref } from "../lib/case-workspace-route"
import { casesRepository } from "../services/cases-repository"
import type { CasesErrorCode, CreateCaseInput } from "../types/cases"
import { casesQueryKeys } from "./cases-query-keys"
import { CasesRepositoryError } from "./cases-repository-error"

type UseImportCaseFilesOptions = {
  caseInput: CreateCaseInput | null
}

function useImportCaseFiles({ caseInput }: UseImportCaseFilesOptions) {
  const router = useRouter()
  const t = useTranslations("cases.newCase.fileImport")
  const queryClient = useQueryClient()
  const { registerUnsavedChangesHandler } = useUnsavedChangesGuard()
  const createdCaseIdRef = useRef<string | null>(null)
  const [files, setFiles] = useState<readonly File[]>([])
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const { isPending, mutateAsync, reset } = useMutation({
    mutationFn: async (selectedFiles: readonly File[]) => {
      let caseId = createdCaseIdRef.current

      if (!caseId) {
        if (!caseInput) {
          throw new CasesRepositoryError({ code: "VALIDATION_ERROR", retryable: false })
        }

        const createResult = await casesRepository.createCase(caseInput)

        if (!createResult.ok) {
          throw new CasesRepositoryError(createResult.error)
        }

        caseId = createResult.data.id
        createdCaseIdRef.current = caseId
      }

      const result = await casesRepository.importFiles({ caseId, files: selectedFiles })

      if (!result.ok) {
        throw new CasesRepositoryError(result.error)
      }

      return caseId
    },
    onSettled: async () => {
      if (createdCaseIdRef.current) {
        await queryClient.invalidateQueries({ queryKey: casesQueryKeys.all })
      }
    },
  })

  const discardChanges = useCallback(() => {
    setFiles([])
    setSelectionError(null)
    reset()
  }, [reset])
  const hasUnsavedChanges = useCallback(() => files.length > 0, [files.length])
  const getUnsavedChanges = useCallback(() => files.map((file) => ({
    field: "files",
    label: t("fieldLabel"),
    previousValue: "",
    value: file.name,
  })), [files, t])

  useEffect(
    () => registerUnsavedChangesHandler({ discardChanges, getUnsavedChanges, hasUnsavedChanges }),
    [discardChanges, getUnsavedChanges, hasUnsavedChanges, registerUnsavedChangesHandler],
  )

  useEffect(() => {
    if (files.length === 0) {
      return
    }

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", warnBeforeUnload)
    return () => window.removeEventListener("beforeunload", warnBeforeUnload)
  }, [files.length])

  const addFiles = useCallback((incomingFiles: readonly File[]) => {
    const validFiles: File[] = []
    let firstError: CaseFileValidationError | "duplicate" | undefined
    const existingKeys = new Set(files.map(getCaseFileKey))

    for (const file of incomingFiles) {
      const validation = validateCaseFile(file)

      if (!validation.ok) {
        firstError ??= validation.error
        continue
      }

      const key = getCaseFileKey(file)
      if (existingKeys.has(key)) {
        firstError ??= "duplicate"
        continue
      }

      existingKeys.add(key)
      validFiles.push(file)
    }

    if (validFiles.length > 0) {
      setFiles((currentFiles) => [...currentFiles, ...validFiles])
    }

    setSelectionError(firstError ? t(getSelectionErrorKey(firstError)) : null)
  }, [files, t])

  const removeFile = useCallback((fileKey: string) => {
    setFiles((currentFiles) => currentFiles.filter((file) => getCaseFileKey(file) !== fileKey))
    setSelectionError(null)
  }, [])

  const onSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (files.length === 0) {
      setSelectionError(t("validation.required"))
      return
    }

    reset()

    try {
      const caseId = await mutateAsync(files)
      setFiles([])
      toast.success(t("notifications.importedTitle"), { description: t("notifications.importedDescription") })
      router.push(getCaseWorkspaceHref(caseId))
    } catch (error) {
      const errorCode = error instanceof CasesRepositoryError ? error.code : undefined
      toast.error(t("notifications.importErrorTitle"), { description: getImportErrorMessage(errorCode, t) })
    }
  }, [files, mutateAsync, reset, router, t])

  return {
    addFiles,
    completion: files.length > 0 ? 100 : 0,
    files,
    isImporting: isPending,
    onSubmit,
    removeFile,
    selectionError,
  }
}

function getSelectionErrorKey(error: CaseFileValidationError | "duplicate") {
  if (error === "empty") return "validation.empty" as const
  if (error === "too-large") return "validation.tooLarge" as const
  if (error === "duplicate") return "validation.duplicate" as const
  return "validation.unsupportedType" as const
}

function getImportErrorMessage(
  code: CasesErrorCode | undefined,
  t: ReturnType<typeof useTranslations<"cases.newCase.fileImport">>,
): string {
  if (code === "CASE_NOT_FOUND") return t("notifications.caseNotFound")
  if (code === "CASES_UNAVAILABLE") return t("notifications.createUnavailableError")
  if (code === "FILES_UNAVAILABLE") return t("notifications.unavailableError")
  if (code === "VALIDATION_ERROR") return t("notifications.validationError")
  return t("notifications.genericError")
}

export { useImportCaseFiles }
export type ImportCaseFilesController = ReturnType<typeof useImportCaseFiles>
