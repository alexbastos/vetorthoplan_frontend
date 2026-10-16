"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { casesRepository } from "../services/cases-repository"
import type { CreateCaseInput } from "../types/cases"
import { CasesRepositoryError } from "./cases-repository-error"
import { casesQueryKeys } from "./cases-query-keys"

function useCreateCase() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (input: CreateCaseInput) => {
      const result = await casesRepository.createCase(input)

      if (!result.ok) {
        throw new CasesRepositoryError(result.error)
      }

      return result.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: casesQueryKeys.all })
    },
  })

  return {
    createCase: mutation.mutateAsync,
    createError: mutation.error,
    isCreating: mutation.isPending,
    reset: mutation.reset,
  }
}

export { useCreateCase }
export type CreateCaseController = ReturnType<typeof useCreateCase>
