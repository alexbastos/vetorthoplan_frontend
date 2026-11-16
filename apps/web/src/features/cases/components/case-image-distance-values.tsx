"use client"

import { ChevronDown } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { useId, useState } from "react"

import { formatAngleDegrees } from "../lib/angle-format"
import { formatDistanceLength } from "../lib/distance-format"
import type { DistanceIntersection } from "../lib/distance-placement"
import type { SavedDistance } from "../lib/distance-result"
import type { DistancePreview } from "../lib/distance-preview"
import { segmentMeasureFor, type SegmentMeasure } from "../lib/segment-measure"

const valueRow = "flex min-h-8 w-full items-center justify-between gap-2 rounded-[var(--radius-token-sm)] px-2 font-data text-xs font-medium tabular-nums"

const intersectionBatchSize = 8

function ValuesDisclosure({ open, controls, label, onToggle }: { open: boolean; controls: string; label: string; onToggle: () => void }) {
  return <button type="button" aria-expanded={open} aria-controls={controls} aria-label={label}
    className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-token-sm)] hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
    onClick={onToggle}>
    <ChevronDown aria-hidden="true" className={`size-3.5 ${open ? "rotate-180" : ""}`} />
  </button>
}

function CaseImageDistanceValues({ distances, selectedId, selectionDisabled, onSelect, dirtyId, preview, intersections, measures, showLineNames }: {
  distances: readonly SavedDistance[]; selectedId: string | null; selectionDisabled: boolean; onSelect: (id: string) => void
  dirtyId?: string | null; preview?: DistancePreview | null; intersections: readonly DistanceIntersection[]
  measures?: Readonly<Record<string, SegmentMeasure>>
  showLineNames: boolean
}) {
  const t = useTranslations("cases.workspace.distance"), format = useFormatter(), id = useId()
  const [linesOpen, setLinesOpen] = useState(false)
  const [anglesOpen, setAnglesOpen] = useState(false)
  const [visibleIntersections, setVisibleIntersections] = useState(intersectionBatchSize)
  const newPreview = preview && !distances.some(({ line }) => line.id === preview.id) ? preview : null
  const showNames = showLineNames || distances.length > 1 || Boolean(newPreview && distances.length)
  const lineNumbers = new Map(distances.map(({ line }, index) => [line.id, index + 1]))
  if (newPreview) lineNumbers.set(newPreview.id, distances.length + 1)
  const selectedLine = distances.find(({ line }) => line.id === selectedId)
  const firstLineId = newPreview?.id ?? selectedLine?.line.id ?? distances[0]?.line.id
  const orderedDistances = !newPreview && selectedLine
    ? [selectedLine, ...distances.filter(item => item !== selectedLine)]
    : distances
  const lineCount = lineNumbers.size
  const linesDisclosure = lineCount > 1 ? <ValuesDisclosure open={linesOpen} controls={`${id}-lines`}
    label={t(linesOpen ? "collapseLengths" : "expandLengths")} onToggle={() => setLinesOpen(open => !open)} /> : null
  return <div className="min-w-0 text-white">
    <ul id={`${id}-lines`} aria-label={t("list")} className="flex w-full min-w-0 flex-col">
      {newPreview ? <li className="flex min-w-0 items-center" data-distance-preview>
        <div className={`${valueRow} min-w-0 flex-1 bg-white/15`}>
          <span>{showNames ? t("lineLabel", { index: distances.length + 1 }) : t("previewLabel")}</span>
          <span className="sr-only">{t("previewValue")}</span>
          <span className="shrink-0">{formatDistanceLength(newPreview.lengthMm, format.number)}</span>
        </div>
        {linesDisclosure}
      </li> : null}
      {orderedDistances.map(({ line, result }) => {
        const first = line.id === firstLineId
        if (!linesOpen && !first) return null
        const index = lineNumbers.get(line.id) ?? 1
        const dirty = line.id === dirtyId, isPreview = preview?.id === line.id
        const measure = segmentMeasureFor(line.id, measures)
        const value = isPreview ? formatDistanceLength(preview.lengthMm, format.number)
          : !dirty && result.status === "available" ? formatDistanceLength(result.lengthMm, format.number) : "—"
        const description = isPreview ? t("previewValue") : dirty ? t("unsavedChanges") : result.status === "unavailable"
          ? `${t("unavailable")}. ${t(`unavailableReasons.${result.reason}`)}` : null
        const savedName = line.label?.trim() || t("defaultName", { index })
        return <li key={line.id} className="flex min-w-0 items-center">
          <button aria-pressed={line.id === selectedId} aria-labelledby={`${id}-${index}-name ${id}-${index}-value`}
            aria-describedby={description ? `${id}-${index}-reason` : undefined} data-distance-row={line.id} data-distance-preview={isPreview || undefined}
            className={`${valueRow} group min-w-0 flex-1 text-left outline-none enabled:hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed ${showNames ? "aria-pressed:bg-white/20" : ""}`}
            disabled={selectionDisabled} onClick={() => { if (line.id !== selectedId) onSelect(line.id) }}
            title={`${savedName}: ${value}`} type="button">
            <span className={showNames ? "truncate group-disabled:text-white/60" : "sr-only"} id={`${id}-${index}-name`}>
              {showNames ? t("lineLabel", { index }) : savedName}
              {showNames ? <span className="sr-only"> ({savedName})</span> : null}
            </span>
            <span className="shrink-0" id={`${id}-${index}-value`}>
              {measure !== "length" ? <><span className="sr-only">{t(`measureModes.${measure}`)} </span><span aria-hidden="true">{t(`measureSymbols.${measure}`)} </span></> : null}{value}
            </span>
            {description ? <span className="sr-only" id={`${id}-${index}-reason`}>{description}</span> : null}
          </button>
          {first ? linesDisclosure : lineCount > 1 ? <span aria-hidden="true" className="size-8 shrink-0" /> : null}
        </li>
      })}
    </ul>
    {intersections.length ? <>
      <p className="px-2 pt-2 font-data text-[10px] text-white/70">{t("comparisonLabel")}</p>
      <ul id={`${id}-angles`} aria-label={t("comparison")}>
        {intersections.slice(0, anglesOpen ? visibleIntersections : 1).map(({ firstId, secondId, degrees }, index) => {
          const a = lineNumbers.get(firstId), b = lineNumbers.get(secondId)
          if (a === undefined || b === undefined) return null
          const first = Math.min(a, b), second = Math.max(a, b)
          return <li key={`${firstId}:${secondId}`} className="flex min-w-0 items-center">
            <div className={`${valueRow} min-w-0 flex-1`}>
              <span aria-hidden="true">{t("comparisonPair", { first, second })}</span>
              <span className="sr-only">{t("comparisonPairName", { first, second })}</span>
              <span className="shrink-0">{formatAngleDegrees(degrees, format.number)}</span>
            </div>
            {intersections.length > 1 ? index === 0 ? <ValuesDisclosure open={anglesOpen} controls={`${id}-angles`}
              label={t(anglesOpen ? "collapseAngles" : "expandAngles")} onToggle={() => setAnglesOpen(open => !open)} />
              : <span aria-hidden="true" className="size-8 shrink-0" /> : null}
          </li>
        })}
        {anglesOpen && intersections.length > visibleIntersections ? <li>
          <button type="button" className={`${valueRow} cursor-pointer text-left hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70`}
            onClick={() => setVisibleIntersections(count => count + intersectionBatchSize)}>{t("moreComparisons")}</button>
        </li> : null}
      </ul>
    </> : null}
  </div>
}

export { CaseImageDistanceValues }
