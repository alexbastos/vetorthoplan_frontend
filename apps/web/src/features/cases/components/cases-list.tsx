"use client"

import { FolderOpen, Search } from "lucide-react"
import Image from "next/image"
import { useLocale, useTranslations } from "next-intl"
import { Tabs } from "radix-ui"
import { useMemo } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { CaseListItem, CaseListStatus } from "../services/case-list-api"
import { CaseCard } from "./case-card"
import { CasesContentMotion } from "./cases-content-motion"

type CasesListProps = {
  cases: readonly CaseListItem[]
  counts: Partial<Record<CaseListStatus, number>> | undefined
  filter: CaseListStatus | null
  search: string
  onFilterChange: (filter: CaseListStatus | null) => void
  onSearchChange: (value: string) => void
  isLoading: boolean
  isRefreshing: boolean
  hasMore: boolean
  isLoadingMore: boolean
  loadMoreError: boolean
  onLoadMore: () => void
}

const caseFilters = ["all", "DRAFT", "IN_PLANNING", "READY", "ARCHIVED"] as const

function CasesList({
  cases, counts, filter, search, onFilterChange, onSearchChange,
  isLoading, isRefreshing, hasMore, isLoadingMore, loadMoreError, onLoadMore,
}: CasesListProps) {
  const locale = useLocale()
  const t = useTranslations("cases.list")
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }),
    [locale],
  )
  const allCount = counts ? Object.values(counts).reduce((total, count) => total + count, 0) : undefined

  return (
    <CasesContentMotion variant="list">
      <section aria-labelledby="cases-list-title" className="w-full">
        <h2 className="sr-only" id="cases-list-title">{t("title")}</h2>

        <div className="mb-5 max-w-sm">
          <label className="sr-only" htmlFor="cases-search">{t("search.label")}</label>
          <Input
            autoComplete="off"
            id="cases-search"
            leadingIcon={<Search aria-hidden="true" />}
            maxLength={200}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("search.placeholder")}
            type="search"
            value={search}
          />
        </div>

        <Tabs.Root onValueChange={(value) => onFilterChange(value === "all" ? null : value as CaseListStatus)} value={filter ?? "all"}>
          <div className="border-b border-border" data-cases-filters>
            <Tabs.List aria-label={t("filters.label")} className="flex max-w-full gap-6 overflow-x-auto">
              {caseFilters.map((item) => (
                <Tabs.Trigger
                  className="group/tab relative flex shrink-0 items-center gap-2 border-b-2 border-transparent px-0 pt-1 pb-3 text-[13px] leading-[1.4] font-medium text-description outline-none transition-colors hover:text-foreground focus-visible:text-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground"
                  key={item}
                  value={item}
                >
                  {t(`filters.${item}`)}
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none font-bold text-description transition-colors group-data-[state=active]/tab:bg-foreground group-data-[state=active]/tab:text-background">
                    {counts ? item === "all" ? allCount : counts[item] ?? 0 : "…"}
                  </span>
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </div>

          <Tabs.Content className="mt-5 outline-none" data-cases-panel value={filter ?? "all"}>
            <div aria-live="polite" className="sr-only">
              {isLoading || isRefreshing ? t("loading") : t("results", { count: cases.length })}
            </div>
            {isLoading ? (
              <div aria-busy="true" className="space-y-px" role="status">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div className="h-24 animate-pulse border-b border-border bg-muted/40" key={index} />
                ))}
              </div>
            ) : cases.length > 0 ? (
              <ul aria-busy={isRefreshing} className="divide-y divide-border border-b border-border">
                {cases.map((caseSummary) => (
                  <li data-cases-row key={caseSummary.id}>
                    <CaseCard caseSummary={caseSummary} dateFormatter={dateFormatter} />
                  </li>
                ))}
              </ul>
            ) : (
              <FilteredCasesEmptyState isSearch={search.trim().length > 0} filter={filter} />
            )}

            {loadMoreError ? (
              <p className="mt-5 text-center text-[13px] text-description" role="alert">{t("loadMoreError")}</p>
            ) : null}
            {(hasMore || loadMoreError) && !isLoading ? (
              <div className="mt-6 flex justify-center">
                <Button disabled={isLoadingMore} onClick={onLoadMore} size="sm" type="button" variant="secondary">
                  {isLoadingMore ? t("loadingMore") : loadMoreError ? t("retryLoadMore") : t("loadMore")}
                </Button>
              </div>
            ) : null}
          </Tabs.Content>
        </Tabs.Root>
      </section>
    </CasesContentMotion>
  )
}

function FilteredCasesEmptyState({ isSearch, filter }: { isSearch: boolean; filter: CaseListStatus | null }) {
  const t = useTranslations("cases.list")
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-4 py-12 text-center" data-cases-filter-empty>
      {filter === "DRAFT" ? (
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-description">
          <FolderOpen aria-hidden="true" className="size-5" strokeWidth={1.5} />
        </span>
      ) : <FilteredCasesEmptyStateVisual />}
      <h3 className="mt-4 text-[14px] leading-[1.4] font-bold text-foreground">
        {t(isSearch ? "emptySearch.title" : "emptyFilter.title")}
      </h3>
      <p className="mt-1 max-w-sm text-[13px] leading-[1.4] text-description">
        {t(isSearch ? "emptySearch.description" : "emptyFilter.description")}
      </p>
    </div>
  )
}

function FilteredCasesEmptyStateVisual() {
  return (
    <>
      <Image alt="" aria-hidden="true" className="h-auto w-[10.5rem] dark:hidden" height={114} src="/images/cases/empty-filtered-cases.svg" width={142} />
      <Image alt="" aria-hidden="true" className="hidden h-auto w-[10.5rem] dark:block" height={114} src="/images/cases/empty-filtered-cases-dark.svg" width={142} />
    </>
  )
}

export { CasesList }
