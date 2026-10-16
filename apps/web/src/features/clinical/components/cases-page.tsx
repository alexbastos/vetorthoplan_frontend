"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import { ArrowRight, Bone, CalendarDays, FolderOpen, LoaderCircle, Search } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import { clinicalBffClient } from "../services/clinical-bff-client"
import type { CaseStatus } from "../types"

function CasesPage() {
  const [statusFilter, setStatusFilter] = useState<CaseStatus | "ALL">("ALL")
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timeout)
  }, [searchInput])

  const casesQuery = useInfiniteQuery({
    queryKey: ["clinical-cases", statusFilter, search],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const result = await clinicalBffClient.listCases({
        limit: 20,
        cursor: pageParam ?? undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        search: search || undefined,
      })
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  })
  const cases = useMemo(() => casesQuery.data?.pages.flatMap((page) => page.items) ?? [], [casesQuery.data])
  const statusCounts = casesQuery.data?.pages[0]?.status_counts
  const totalCount = statusCounts ? Object.values(statusCounts).reduce((total, count) => total + count, 0) : 0
  const tabs: { status: CaseStatus | "ALL"; label: string; count: number }[] = [
    { status: "ALL", label: "Todos", count: totalCount },
    { status: "DRAFT", label: "Rascunho", count: statusCounts?.DRAFT ?? 0 },
    { status: "IN_PLANNING", label: "Em planejamento", count: statusCounts?.IN_PLANNING ?? 0 },
    { status: "READY", label: "Pronto", count: statusCounts?.READY ?? 0 },
    { status: "ARCHIVED", label: "Arquivado", count: statusCounts?.ARCHIVED ?? 0 },
  ]

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-8 sm:py-10">
      <header className="max-w-2xl space-y-2">
        <p className="text-overline text-capta-text-secondary">Planejamento ortopédico</p>
        <h1 className="text-heading-3 text-capta-text-primary">Casos clínicos</h1>
        <p className="text-ui text-capta-text-secondary">
          Acompanhe radiografias processadas e abra o ambiente de planejamento TPLO.
        </p>
        <Link className="mt-4 inline-flex rounded-xl bg-capta-brand-primary px-4 py-2.5 text-ui font-semibold text-white" href="/app/cases/new">Criar caso</Link>
      </header>

      <section className="mt-7 space-y-4" aria-label="Filtros de casos clínicos">
        <label className="relative block max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-capta-text-muted" aria-hidden="true" />
          <input
            className="w-full rounded-xl border border-capta-border-default bg-capta-surface-card py-3 pl-10 pr-4 text-ui text-capta-text-primary outline-none focus-visible:ring-2 focus-visible:ring-capta-border-focus"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Buscar por caso, paciente, espécie ou raça"
            aria-label="Buscar casos clínicos"
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por status">
          {tabs.map((tab) => (
            <button
              key={tab.status}
              type="button"
              aria-pressed={statusFilter === tab.status}
              onClick={() => setStatusFilter(tab.status)}
              className={`rounded-full border px-3 py-2 text-caption font-semibold transition ${statusFilter === tab.status ? "border-capta-brand-primary bg-capta-brand-primary text-white" : "border-capta-border-default bg-capta-surface-card text-capta-text-secondary hover:bg-capta-surface-subtle"}`}
            >
              {tab.label} <span className="ml-1 opacity-80">{tab.count}</span>
            </button>
          ))}
        </div>
      </section>

      {casesQuery.isLoading ? (
        <div className="mt-8 flex items-center rounded-2xl border border-capta-border-default bg-capta-surface-card p-8 text-ui text-capta-text-secondary">
          <LoaderCircle className="mr-2 size-4 animate-spin" aria-hidden="true" /> Carregando casos…
        </div>
      ) : casesQuery.isError ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-ui text-red-800">
          <p>Não foi possível carregar os casos. Verifique a sessão e o backend clínico.</p>
          <button className="mt-3 font-semibold underline" onClick={() => void casesQuery.refetch()} type="button">Tentar novamente</button>
        </div>
      ) : cases.length === 0 ? (
        <div className="mt-8 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-capta-border-default bg-capta-surface-card p-8 text-center">
          <FolderOpen className="mb-4 size-10 text-capta-text-muted" aria-hidden="true" />
          <h2 className="text-heading-4 text-capta-text-primary">{search || statusFilter !== "ALL" ? "Nenhum caso encontrado" : "Nenhum caso cadastrado"}</h2>
          <p className="mt-2 max-w-md text-ui text-capta-text-secondary">
            {search || statusFilter !== "ALL" ? "Experimente ajustar a busca ou o filtro de status." : "Crie um caso para iniciar a importação e o planejamento."}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cases.map((clinicalCase) => (
            <Link
              key={clinicalCase.id}
              href={`/app/cases/${clinicalCase.id}`}
              className="group rounded-2xl border border-capta-border-default bg-capta-surface-card p-5 outline-none transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-capta-border-focus"
            >
              <div className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-capta-surface-subtle text-capta-brand-primary">
                  <Bone className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-capta-surface-subtle px-2.5 py-1 text-caption font-semibold text-capta-text-secondary">
                      {statusLabel(clinicalCase.status)}
                    </span>
                    <ArrowRight className="size-4 text-capta-text-muted transition group-hover:translate-x-1" aria-hidden="true" />
                  </div>
                  <h2 className="mt-4 truncate text-heading-4 text-capta-text-primary">{clinicalCase.title}</h2>
                  <p className="mt-1 text-ui text-capta-text-secondary">
                    {clinicalCase.animal_name} · {clinicalCase.species}
                    {clinicalCase.breed ? ` · ${clinicalCase.breed}` : ""}
                  </p>
                  <p className="mt-4 flex items-center gap-2 text-caption text-capta-text-muted">
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                    Atualizado em {new Intl.DateTimeFormat("pt-BR").format(new Date(clinicalCase.updated_at))}
                  </p>
                </div>
              </div>
            </Link>
          ))}
          </div>
          {casesQuery.hasNextPage && (
            <div className="mt-6 flex justify-center">
              <button
                className="rounded-xl border border-capta-border-default bg-capta-surface-card px-5 py-3 text-ui font-semibold text-capta-text-primary disabled:opacity-60"
                disabled={casesQuery.isFetchingNextPage}
                onClick={() => void casesQuery.fetchNextPage()}
                type="button"
              >
                {casesQuery.isFetchingNextPage ? "Carregando…" : "Carregar mais"}
              </button>
            </div>
          )}
          {casesQuery.isFetchNextPageError && <p className="mt-3 text-center text-caption text-red-700">Falha ao carregar mais casos. Tente novamente.</p>}
        </>
      )}
    </main>
  )
}

function statusLabel(status: string): string {
  return ({ ARCHIVED: "Arquivado", DRAFT: "Rascunho", IN_PLANNING: "Em planejamento", READY: "Pronto" })[status] ?? status
}

export { CasesPage }
