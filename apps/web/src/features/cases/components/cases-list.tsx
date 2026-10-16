"use client"

import { FolderOpen } from "lucide-react"
import Image from "next/image"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { Tabs } from "radix-ui"
import { useMemo } from "react"

import type { CaseStatus, CaseSummary } from "../types/cases"
import { CaseCard } from "./case-card"
import { CasesContentMotion } from "./cases-content-motion"

type CasesListProps = {
  cases: readonly CaseSummary[]
}

type CaseFilter = "all" | CaseStatus

const caseFilters: readonly CaseFilter[] = ["all", "draft", "in-progress", "completed", "archived"]
const caseFilterSet = new Set<string>(caseFilters)

function CasesList({ cases }: CasesListProps) {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations("cases.list")
  const activeFilter = parseCaseFilter(searchParams.get("status"))
  const counts = useMemo(() => getFilterCounts(cases), [cases])
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }),
    [locale],
  )

  function handleFilterChange(value: string) {
    const nextFilter = parseCaseFilter(value)
    const nextSearchParams = new URLSearchParams(searchParams.toString())

    if (nextFilter === "all") {
      nextSearchParams.delete("status")
    } else {
      nextSearchParams.set("status", nextFilter)
    }

    const query = nextSearchParams.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  return (
    <CasesContentMotion variant="list">
      <section aria-labelledby="cases-list-title" className="w-full">
        <h2 className="sr-only" id="cases-list-title">{t("title")}</h2>

        <Tabs.Root onValueChange={handleFilterChange} value={activeFilter}>
          <div className="border-b border-border" data-cases-filters>
            <Tabs.List
              aria-label={t("filters.label")}
              className="flex max-w-full gap-6 overflow-x-auto"
            >
              {caseFilters.map((filter) => (
                <Tabs.Trigger
                  className="group/tab relative flex shrink-0 items-center gap-2 border-b-2 border-transparent px-0 pt-1 pb-3 text-[13px] leading-[1.4] font-medium text-description outline-none transition-colors hover:text-foreground focus-visible:text-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground"
                  key={filter}
                  value={filter}
                >
                  {t(`filters.${filter}`)}
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none font-bold text-description transition-colors group-data-[state=active]/tab:bg-foreground group-data-[state=active]/tab:text-background">
                    {counts[filter]}
                  </span>
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </div>

          {caseFilters.map((filter) => {
            const filteredCases = filter === "all"
              ? cases
              : cases.filter((caseSummary) => caseSummary.status === filter)

            return (
              <Tabs.Content className="mt-5 outline-none" data-cases-panel key={filter} value={filter}>
                {filteredCases.length > 0 ? (
                  <ul className="divide-y divide-border border-b border-border">
                    {filteredCases.map((caseSummary) => (
                      <li data-cases-row key={caseSummary.id}>
                        <CaseCard caseSummary={caseSummary} dateFormatter={dateFormatter} />
                      </li>
                    ))}
                  </ul>
                ) : filter !== "all" ? (
                  <FilteredCasesEmptyState filter={filter} />
                ) : null}
              </Tabs.Content>
            )
          })}
        </Tabs.Root>
      </section>
    </CasesContentMotion>
  )
}

function FilteredCasesEmptyState({ filter }: { filter: CaseStatus }) {
  const t = useTranslations("cases.list.emptyFilter")
  const usesFigmaIllustration = filter !== "draft"

  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-4 py-12 text-center" data-cases-filter-empty>
      {usesFigmaIllustration ? (
        <FilteredCasesEmptyStateVisual />
      ) : (
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-description">
          <FolderOpen aria-hidden="true" className="size-5" strokeWidth={1.5} />
        </span>
      )}
      <h3 className="mt-4 text-[14px] leading-[1.4] font-bold text-foreground">
        {t("title")}
      </h3>
      <p className="mt-1 max-w-sm text-[13px] leading-[1.4] text-description">
        {t("description")}
      </p>
    </div>
  )
}

function FilteredCasesEmptyStateVisual() {
  return (
    <>
      <Image
        alt=""
        aria-hidden="true"
        className="h-auto w-[10.5rem] dark:hidden"
        height={114}
        src="/images/cases/empty-filtered-cases.svg"
        width={142}
      />
      <Image
        alt=""
        aria-hidden="true"
        className="hidden h-auto w-[10.5rem] dark:block"
        height={114}
        src="/images/cases/empty-filtered-cases-dark.svg"
        width={142}
      />
    </>
  )
}

function parseCaseFilter(value: string | null): CaseFilter {
  return value && caseFilterSet.has(value) ? value as CaseFilter : "all"
}

function getFilterCounts(cases: readonly CaseSummary[]): Record<CaseFilter, number> {
  const counts: Record<CaseFilter, number> = {
    all: cases.length,
    archived: 0,
    completed: 0,
    draft: 0,
    "in-progress": 0,
  }

  for (const caseSummary of cases) {
    counts[caseSummary.status] += 1
  }

  return counts
}

export { CasesList }
