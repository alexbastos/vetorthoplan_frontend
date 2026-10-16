"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { createImageCopyName } from "../lib/case-image-name"
import { casesRepository } from "../services/cases-repository"
import type { CaseWorkspaceImage } from "../types/case-workspace"
import { casesQueryKeys } from "./cases-query-keys"
import { CasesRepositoryError } from "./cases-repository-error"

type ImageAction = { kind: "rename"; name: string } | { kind: "copy" | "delete" }

function useCaseImageActions({ caseId, image, existingNames, onCompleted }: {
  caseId: string
  image: CaseWorkspaceImage
  existingNames: readonly string[]
  onCompleted: () => void
}) {
  const t = useTranslations("cases.workspace.images.actions")
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (action: ImageAction) => {
      const input = { caseId, imageId: image.file.id }
      const result = action.kind === "rename"
        ? await casesRepository.renameImage({ ...input, name: action.name })
        : action.kind === "copy"
          ? await casesRepository.duplicateImage({ ...input, name: createImageCopyName(image.file.name, t("copySuffix"), existingNames) })
          : await casesRepository.deleteImage(input)
      if (!result.ok) throw new CasesRepositoryError(result.error)
    },
    onSuccess: async (_, action) => {
      onCompleted()
      await queryClient.invalidateQueries({ queryKey: casesQueryKeys.all })
      toast.success(t(`${action.kind}Success`))
    },
    onError: (error) => {
      toast.error(error instanceof CasesRepositoryError && error.code === "FILES_UNAVAILABLE"
        ? t("unavailable") : error instanceof CasesRepositoryError && error.code === "VALIDATION_ERROR"
          ? t("invalidName") : t("error"))
    },
  })
}

export { useCaseImageActions }
