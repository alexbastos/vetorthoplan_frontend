"use client"

import { useQuery } from "@tanstack/react-query"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"

import { CLINICAL_CONTEXT_QUERY_KEY, fetchClinicalContext } from "../services/clinical-context-api"

function ClinicalOrganizationLabel() {
  const pathname = usePathname()
  const t = useTranslations("cases.organization")
  // Observe the context loaded by the gate without starting another request.
  const query = useQuery({ queryKey: CLINICAL_CONTEXT_QUERY_KEY,
    queryFn: ({ signal }) => fetchClinicalContext({ signal }), enabled: false })
  const organization = !query.isError && query.data?.state === "ready" ? query.data.organization : null

  if (!organization || (pathname !== "/app/cases" && !pathname.startsWith("/app/cases/"))) return null

  const label = t("active", { name: organization.name })
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span aria-hidden="true">·</span>
      <span aria-label={label} className="truncate" title={label}>{organization.name}</span>
    </span>
  )
}

export { ClinicalOrganizationLabel }
