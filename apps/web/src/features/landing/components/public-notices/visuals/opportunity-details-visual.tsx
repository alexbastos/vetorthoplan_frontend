"use client"

import { useMemo, useState } from "react"

import type { OpportunityDetailsVisualContent } from "../types"
import { OpportunityDossierCard } from "./opportunity-dossier-card"
import { OpportunityPreviewPanel } from "./opportunity-preview-panel"

type OpportunityDetailsVisualProps = {
  content: OpportunityDetailsVisualContent
  isActive: boolean
  onInteraction?: () => void
}

function OpportunityDetailsVisual({ content, isActive, onInteraction }: OpportunityDetailsVisualProps) {
  const [selectedDossierId, setSelectedDossierId] = useState(content.dossiers[0]?.id ?? "")
  const selectedDossier = useMemo(
    () => content.dossiers.find((dossier) => dossier.id === selectedDossierId) ?? content.dossiers[0],
    [content.dossiers, selectedDossierId],
  )

  if (!selectedDossier) {
    return null
  }

  const handleSelect = (dossierId: string) => {
    onInteraction?.()
    setSelectedDossierId(dossierId)
  }

  return (
    <div
      role="group"
      aria-label={content.accessibleLabel}
      className="flex h-full items-center justify-center overflow-hidden px-4 py-5 sm:px-10 sm:py-7"
    >
      <div className="relative mx-auto size-full max-w-[40.625rem]">
        <div className="absolute top-1/2 left-0 hidden h-[23rem] w-[21rem] -translate-y-1/2 [mask-image:linear-gradient(to_bottom,black_88%,transparent_100%)] sm:block">
          <OpportunityPreviewPanel
            content={content}
            onSelect={handleSelect}
            selectedDossierId={selectedDossier.id}
          />
        </div>

        <div className="absolute top-1/2 right-1/2 origin-center -translate-y-1/2 translate-x-1/2 scale-50 sm:right-0 sm:origin-right sm:translate-x-0 sm:scale-75">
          <OpportunityDossierCard content={content} dossier={selectedDossier} isActive={isActive} />
        </div>
      </div>
    </div>
  )
}

export { OpportunityDetailsVisual }
export type { OpportunityDetailsVisualProps }
