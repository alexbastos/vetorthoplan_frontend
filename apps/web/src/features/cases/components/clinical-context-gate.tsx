"use client"

import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { useEffect, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { CLINICAL_CONTEXT_CHANGED_EVENT, setCaseBrowserOrganization } from "../services/case-fetch"
import { ClinicalContextError, fetchClinicalContext, type ClinicalContext } from "../services/clinical-context-api"

const CONTEXT_KEY = ["clinical-context"] as const

function ClinicalContextGate({ children }: { children: ReactNode }) {
  const t = useTranslations("cases.organization")
  const parent = useQueryClient()
  const pathname = usePathname()
  const [choosing, setChoosing] = useState(false)
  const [changed, setChanged] = useState(false)
  const selection = useMutation({ mutationFn: async (organizationId: string) => {
    await parent.cancelQueries({ queryKey: CONTEXT_KEY, exact: true })
    return fetchClinicalContext({ organizationId })
  }, retry: false,
    onSuccess: value => { parent.setQueryData(CONTEXT_KEY, value); setChoosing(false); setChanged(false) } })
  const query = useQuery({ queryKey: CONTEXT_KEY, queryFn: ({ signal }) => fetchClinicalContext({ signal }), retry: false, refetchOnWindowFocus: true, staleTime: 30_000,
    enabled: !selection.isPending && !choosing })
  useEffect(() => {
    const handle = () => { setChanged(true); setCaseBrowserOrganization(undefined) }
    window.addEventListener(CLINICAL_CONTEXT_CHANGED_EVENT, handle)
    return () => { window.removeEventListener(CLINICAL_CONTEXT_CHANGED_EVENT, handle); parent.removeQueries({ queryKey: CONTEXT_KEY, exact: true }) }
  }, [parent])
  const value = query.data
  const failure = selection.error ?? query.error
  const errorText = failure instanceof ClinicalContextError && failure.code === "SESSION_UNAVAILABLE" ? "sessionError"
    : failure instanceof ClinicalContextError && (failure.code === "ACCESS_DENIED" || failure.code === "CLINICAL_ORGANIZATION_UNAVAILABLE") ? "accessError"
      : failure instanceof ClinicalContextError && failure.code === "RATE_LIMITED" ? "rateLimited" : "error"
  if (query.isPending) return <p aria-busy="true" className="mx-auto py-12 text-sm text-description">{t("loading")}</p>
  if (query.isError || changed || !value) return (
    <section className="mx-auto max-w-md space-y-4 py-12" role="alert">
      <h1 className="text-lg font-semibold">{t(changed ? "changed" : "unavailable")}</h1>
      <p className="text-sm text-description">{t(changed ? "changedDescription" : errorText)}</p>
      <Button disabled={query.isFetching} onClick={() => { selection.reset(); void query.refetch().then(result => { if (result.isSuccess) setChanged(false) }) }} size="sm" type="button">{t("retry")}</Button>
    </section>
  )
  if (value.state === "no_organizations") return (
    <section className="mx-auto max-w-md space-y-4 py-12">
      <h1 className="text-lg font-semibold">{t("noneTitle")}</h1>
      <p className="text-sm text-description">{t("noneDescription")}</p>
      <Button disabled={query.isFetching} onClick={() => void query.refetch()} size="sm" type="button">{t("retry")}</Button>
    </section>
  )
  if (value.state === "selection_required" || choosing) return (
    <section aria-busy={selection.isPending} className="mx-auto w-full max-w-md space-y-4 py-12">
      <h1 className="text-lg font-semibold">{t("chooseTitle")}</h1>
      <p className="text-sm text-description">{t("chooseDescription")}</p>
      <ul className="space-y-2">{value.organizations.map(organization => <li key={organization.id}>
        <Button className="h-auto min-h-10 w-full justify-start whitespace-normal break-words py-3 text-left" disabled={selection.isPending} onClick={() => selection.mutate(organization.id)} type="button" variant="secondary">{organization.name}</Button>
      </li>)}</ul>
      {failure ? <p className="text-sm text-destructive" role="alert">{t(errorText)}</p> : null}
      {value.state === "ready" ? <Button disabled={selection.isPending} onClick={() => { selection.reset(); setChoosing(false) }} size="sm" type="button" variant="ghost">{t("cancel")}</Button> : null}
    </section>
  )
  return <>
    {value.organization ? <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-description">
      <span>{t("active", { name: value.organization.name })}</span>
      {value.organizations.length > 1 && pathname === "/app/cases" ? <Button onClick={() => { selection.reset(); setChoosing(true) }} size="sm" type="button" variant="ghost">{t("change")}</Button> : null}
    </div> : null}
    <ClinicalCaseScope context={value} key={value.organization?.id ?? "local"}>{children}</ClinicalCaseScope>
  </>
}

function ClinicalCaseScope({ context, children }: { context: Extract<ClinicalContext, { state: "ready" }>; children: ReactNode }) {
  const parent = useQueryClient()
  // Each organization gets its own QueryClient, including commands and upload
  // receipts. Late callbacks from a previous scope cannot populate the new one.
  const [client] = useState(() => new QueryClient({ defaultOptions: parent.getDefaultOptions() }))
  const [ready, setReady] = useState(false)
  const organizationId = context.organization?.id
  useEffect(() => {
    setCaseBrowserOrganization(organizationId); setReady(true)
    return () => { setCaseBrowserOrganization(undefined); void client.cancelQueries(); client.clear() }
  }, [client, organizationId])
  return ready ? <QueryClientProvider client={client}>{children}</QueryClientProvider> : null
}
export { ClinicalContextGate }
