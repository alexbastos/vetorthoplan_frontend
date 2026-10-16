import type { LucideIcon } from "lucide-react"

type OpportunityDossierMetricProps = {
  icon: LucideIcon
  label: string
  value: string
}

function OpportunityDossierMetric({ icon: Icon, label, value }: OpportunityDossierMetricProps) {
  return (
    <div className="min-w-0 px-4 first:pl-0 last:pr-0">
      <div className="flex items-center gap-1.5 text-capta-text-muted">
        <Icon aria-hidden="true" className="size-4" strokeWidth={1.8} />
        <dt className="truncate text-xs">{label}</dt>
      </div>
      <dd className="mt-1.5 truncate text-sm font-semibold text-capta-text-primary">{value}</dd>
    </div>
  )
}

export { OpportunityDossierMetric }
export type { OpportunityDossierMetricProps }
