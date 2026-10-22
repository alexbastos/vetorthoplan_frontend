"use client"

import { useInfiniteQuery } from "@tanstack/react-query"

import { fetchCaseList, type CaseListStatus } from "../services/case-list-api"
import { casesQueryKeys } from "./cases-query-keys"

function useCases(status: CaseListStatus | null, search: string) {
  const query = useInfiniteQuery({
    queryFn: ({ pageParam, signal }) => fetchCaseList({ cursor: pageParam, search, status }, { signal }),
    queryKey: casesQueryKeys.listPage(status, search),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    retry: 1,
  })

  return {
    cases: query.data?.pages.flatMap((page) => page.items) ?? [],
    statusCounts: query.data?.pages[0]?.statusCounts,
    isLoading: query.isPending,
    isRefreshing: query.isFetching && !query.isFetchingNextPage,
    isLoadingMore: query.isFetchingNextPage,
    hasMore: query.hasNextPage,
    loadMoreError: query.isFetchNextPageError,
    loadMore: query.fetchNextPage,
    loadError: query.isPending ? query.error : null,
    retry: query.refetch,
  }
}

export { useCases }
export type CasesController = ReturnType<typeof useCases>
