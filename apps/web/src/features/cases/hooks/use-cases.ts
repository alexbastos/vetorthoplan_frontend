"use client"

import { useQuery } from "@tanstack/react-query"

import { casesRepository } from "../services/cases-repository"
import { CasesRepositoryError } from "./cases-repository-error"
import { casesQueryKeys } from "./cases-query-keys"

function useCases() {
  const query = useQuery({
    queryFn: async ({ signal }) => {
      const result = await casesRepository.listCases({ signal })

      if (!result.ok) {
        throw new CasesRepositoryError(result.error)
      }

      return result.data
    },
    queryKey: casesQueryKeys.list(),
  })

  return {
    cases: query.data ?? [],
    isLoading: query.isLoading,
    loadError: query.error,
    retry: query.refetch,
  }
}

export { useCases }
export type CasesController = ReturnType<typeof useCases>
