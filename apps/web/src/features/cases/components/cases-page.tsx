"use client"

import { Plus, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { Suspense } from "react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import { useCases } from "../hooks/use-cases"
import { CasesContentMotion } from "./cases-content-motion"
import { CasesEmptyState } from "./cases-empty-state"
import { CasesList } from "./cases-list"
import { CasesPageMotion } from "./cases-page-motion"

function CasesPage() {
  const t = useTranslations("cases")
  const { cases, isLoading, loadError, retry } = useCases()

  return (
    <CasesPageMotion>
      <div className="mx-auto flex w-full max-w-[61rem] flex-1 flex-col">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl space-y-2">
            <h1 className="text-[22px] leading-[1.3] font-bold text-[var(--color-obsidian)] dark:text-foreground" data-cases-header-part="title">{t("title")}</h1>
            <p className="text-[13px] leading-[1.4] text-description" data-cases-header-part="description">{t("description")}</p>
          </div>

          <div className="flex w-full sm:w-auto" data-cases-header-part="action">
            <Button asChild className="w-full sm:w-auto" size="sm">
              <Link href="/app/cases/new">
                <Plus aria-hidden="true" />
                {t("actions.newCase")}
              </Link>
            </Button>
          </div>
        </header>

        <main
          className={cn(
            "mt-8 flex min-h-72 flex-1",
            cases.length > 0 ? "items-start" : "items-center justify-center py-12 sm:py-16",
          )}
          data-case-count={cases.length}
        >
          {isLoading ? (
            <CasesPageSkeleton label={t("states.loading")} />
          ) : loadError ? (
            <CasesContentMotion className="max-w-md" variant="error">
              <EmptyState
                action={
                  <Button onClick={() => void retry()} size="sm" type="button" variant="secondary">
                    <RefreshCw aria-hidden="true" />
                    {t("actions.retry")}
                  </Button>
                }
                description={t("states.loadErrorDescription")}
                descriptionClassName="text-[13px] text-description"
                title={t("states.loadErrorTitle")}
                titleClassName="font-bold text-[var(--color-obsidian)] dark:text-foreground"
              />
            </CasesContentMotion>
          ) : cases.length === 0 ? (
            <CasesEmptyState />
          ) : (
            <Suspense fallback={<CasesPageSkeleton label={t("states.loading")} />}>
              <CasesList cases={cases} />
            </Suspense>
          )}
        </main>
      </div>
    </CasesPageMotion>
  )
}

function CasesPageSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-label={label} className="w-full">
      <div className="flex gap-6 border-b border-border pb-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div className="h-5 w-20 animate-pulse rounded bg-muted" key={index} />
        ))}
      </div>
      <div className="mt-5 divide-y divide-border border-b border-border">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="flex items-start gap-4 py-3 sm:items-center sm:gap-5" key={index}>
            <div className="aspect-[4/3] w-20 shrink-0 animate-pulse bg-muted" />
            <div className="grid flex-1 grid-cols-1 items-start gap-5 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1.1fr)_6.5rem_7.5rem] sm:items-center">
              <div className="space-y-2">
                <div className="h-2.5 w-12 animate-pulse rounded bg-muted" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              </div>
              <div className="hidden space-y-2 sm:block">
                <div className="h-2.5 w-14 animate-pulse rounded bg-muted" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
              </div>
              <div className="hidden space-y-2 sm:block">
                <div className="h-2.5 w-20 animate-pulse rounded bg-muted" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
              </div>
              <div className="hidden space-y-2 sm:block">
                <div className="h-2.5 w-12 animate-pulse rounded bg-muted" />
                <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
              </div>
              <div className="hidden space-y-2 sm:block">
                <div className="ml-auto h-2.5 w-20 animate-pulse rounded bg-muted" />
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { CasesPage }
