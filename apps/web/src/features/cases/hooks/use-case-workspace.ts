"use client"

import { useQuery } from "@tanstack/react-query"

import { casesRepository } from "../services/cases-repository"
import { CasesRepositoryError } from "./cases-repository-error"
import { casesQueryKeys } from "./cases-query-keys"

function useCaseWorkspace(caseId: string) {
  return useQuery({
    queryKey: casesQueryKeys.workspace(caseId),
    queryFn: async ({ signal }) => {
      const result = await casesRepository.getCaseWorkspace(caseId, { signal })
      if (!result.ok) throw new CasesRepositoryError(result.error)
      return result.data
    },
    retry: (failureCount, error) => error instanceof CasesRepositoryError
      && !error.retryable ? false : failureCount < 2,
  })
}

export { useCaseWorkspace }
