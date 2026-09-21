import { Building2, ChevronRight, Cpu, HeartPulse } from "lucide-react"

import { CaptaBrandLogo } from "@/components/ui/capta-brand-logo"
import { cn } from "@/lib/utils"

import type {
  OpportunityDetailsVisualContent,
  OpportunityDossierCategory,
} from "../types"

type OpportunityPreviewPanelProps = {
  content: OpportunityDetailsVisualContent
  onSelect: (dossierId: string) => void
  selectedDossierId: string
}

const dossierIcons = {
  health: HeartPulse,
  infrastructure: Building2,
  technology: Cpu,
} satisfies Record<OpportunityDossierCategory, typeof Cpu>

function OpportunityPreviewPanel({
  content,
  onSelect,
  selectedDossierId,
}: OpportunityPreviewPanelProps) {
  return (
    <div
      data-opportunity-preview
      className="h-full overflow-hidden rounded-[var(--radius-token-lg)] border border-border bg-card shadow-[var(--shadow-card)]"
    >
      <div className="relative flex h-8 items-center border-b border-border px-3">
        <div aria-hidden="true" className="flex shrink-0 items-center gap-1">
          <span className="size-1.5 rounded-full bg-[var(--color-neutral-400)]" />
          <span className="size-1.5 rounded-full bg-[var(--color-neutral-400)]" />
          <span className="size-1.5 rounded-full bg-[var(--color-neutral-400)]" />
        </div>
        <span className="absolute left-1/2 -translate-x-1/2 rounded-full bg-muted px-9 py-1 text-[0.5rem] text-muted-foreground">
          app.captagov.com.br/editais
        </span>
      </div>

      <div className="p-5">
        <div className="flex items-center">
          <CaptaBrandLogo
            alt=""
            aria-hidden="true"
            className="-ml-2.5 w-[5.5rem]"
            height={22}
            variant="black"
            width={88}
          />
        </div>

        <div className="pt-5">
          <h3 className="text-sm font-semibold text-foreground">{content.heading}</h3>
          <p className="mt-1 text-[0.625rem] text-muted-foreground">{content.selectorDescription}</p>
        </div>

        <div aria-label={content.heading} className="mt-3 max-w-[16.5rem] divide-y divide-border">
          {content.dossiers.map((dossier) => {
            const Icon = dossierIcons[dossier.category]
            const isSelected = dossier.id === selectedDossierId

            return (
              <button
                key={dossier.id}
                id={`dossier-selector-${dossier.id}`}
                type="button"
                aria-controls="opportunity-dossier-summary"
                aria-pressed={isSelected}
                onClick={() => onSelect(dossier.id)}
                className={cn(
                  "group relative flex w-full items-center gap-2.5 rounded-md px-2 py-2.5 text-left outline-none transition-colors duration-200",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isSelected
                    ? "bg-muted text-foreground"
                    : "text-content-secondary hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary transition-opacity",
                    isSelected ? "opacity-100" : "opacity-0",
                  )}
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-card",
                    isSelected ? "text-link" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-3.5" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.6875rem] font-semibold">{dossier.title}</span>
                  <span className="mt-0.5 block truncate text-[0.625rem] text-muted-foreground">
                    {dossier.organization}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className={cn(
                    "size-3 shrink-0 transition-[color,transform] duration-200 group-hover:translate-x-0.5",
                    isSelected ? "text-link" : "text-muted-foreground",
                  )}
                  strokeWidth={1.8}
                />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export { OpportunityPreviewPanel }
export type { OpportunityPreviewPanelProps }
