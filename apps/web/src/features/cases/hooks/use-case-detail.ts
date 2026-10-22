"use client"

import { useQuery } from "@tanstack/react-query"

import { CaseDetailRequestError, fetchCaseDetail } from "../services/case-detail-api"
import { casesQueryKeys } from "./cases-query-keys"

function useCaseDetail(caseId: string) {
  return useQuery({
    queryKey: casesQueryKeys.detail(caseId),
    queryFn: async ({ signal }) => {
      return fetchCaseDetail(caseId, { signal })
    },
    retry: (failureCount, error) => error instanceof CaseDetailRequestError
      && !error.retryable ? false : failureCount < 2,
  })
}

export { useCaseDetail }
