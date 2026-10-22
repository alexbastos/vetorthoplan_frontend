"use client"

import { useTranslations } from "next-intl"
import Link from "next/link"
import { useState } from "react"

import { getCaseWorkspaceHref } from "../lib/case-workspace-route"
import type { CaseListItem, CaseListStatus } from "../services/case-list-api"

type CaseCardProps = {
  caseSummary: CaseListItem
  dateFormatter: Intl.DateTimeFormat
}

const statusClassNames: Record<CaseListStatus, string> = {
  ARCHIVED: "border-border bg-background/90 text-description",
  READY: "border-success/25 bg-success/90 text-white",
  DRAFT: "border-border bg-background/90 text-content-secondary",
  IN_PLANNING: "border-info/25 bg-info/90 text-white",
}

const columnLabelClassName =
  "text-[10px] leading-[1.4] font-medium tracking-wide text-description uppercase"

function CaseCard({ caseSummary, dateFormatter }: CaseCardProps) {
  const t = useTranslations("cases.list")
  const breed = caseSummary.patient.breed ?? t("notInformed")

  return (
    <article
      className="group flex w-full items-start gap-4 py-3 transition-colors duration-200 hover:bg-muted/35 sm:items-center sm:gap-5"
      data-case-id={caseSummary.id}
    >
      <CasePreview
        alt={t("thumbnailAlt", { title: caseSummary.title })}
        key="preview-unavailable"
        label={t("previewUnavailable")}
      />

      <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1.1fr)_6.5rem_7.5rem] sm:items-center sm:gap-5">
        <div className="min-w-0">
          <p className={columnLabelClassName}>{t("columns.case")}</p>
          <h3 className="mt-0.5 truncate text-[14px] leading-[1.4] font-bold text-foreground">
            <Link className="rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring" href={getCaseWorkspaceHref(caseSummary.id)}>
              {caseSummary.title}
            </Link>
          </h3>
        </div>

        <div className="min-w-0">
          <p className={columnLabelClassName}>{t("columns.patient")}</p>
          <p className="mt-0.5 truncate text-[13px] leading-[1.4] text-content-secondary">
            {caseSummary.patient.name}
          </p>
        </div>

        <div className="min-w-0">
          <p className={columnLabelClassName}>{t("columns.profile")}</p>
          <p className="mt-0.5 truncate text-[13px] leading-[1.4] text-content-secondary">
            {caseSummary.patient.species} · {breed}
          </p>
        </div>

        <div className="min-w-0">
          <p className={columnLabelClassName}>{t("columns.status")}</p>
          <div className="mt-1">
            <CaseStatusBadge label={t(`status.${caseSummary.status}`)} status={caseSummary.status} />
          </div>
        </div>

        <div className="min-w-0 sm:text-right">
          <p className={columnLabelClassName}>{t("columns.updatedAt")}</p>
          <time
            className="mt-0.5 block font-data text-[11px] leading-[1.4] text-content-secondary tabular-nums"
            dateTime={caseSummary.updatedAt}
          >
            {dateFormatter.format(new Date(caseSummary.updatedAt))}
          </time>
        </div>
      </div>
    </article>
  )
}

type CasePreviewProps = {
  alt: string
  label: string
  thumbnailUrl?: string | null
}

type PreviewState = "loading" | "ready" | "unavailable"

function CasePreview({ alt, label, thumbnailUrl }: CasePreviewProps) {
  const [previewState, setPreviewState] = useState<PreviewState>(
    thumbnailUrl ? "loading" : "unavailable",
  )

  return (
    <div className="relative aspect-[4/3] w-20 shrink-0 overflow-hidden border border-border bg-neutral-950">
      {previewState === "unavailable" ? <CasePreviewFallback label={label} /> : null}

      {thumbnailUrl && previewState !== "unavailable" ? (
        <img
          alt={alt}
          className={`absolute inset-0 size-full object-contain transition-[opacity,transform] duration-300 group-hover:scale-[1.015] ${previewState === "ready" ? "opacity-100" : "opacity-0"}`}
          decoding="async"
          loading="lazy"
          onError={() => setPreviewState("unavailable")}
          onLoad={(event) => {
            const image = event.currentTarget
            setPreviewState(image.naturalWidth > 0 && image.naturalHeight > 0 ? "ready" : "unavailable")
          }}
          src={thumbnailUrl}
        />
      ) : null}
    </div>
  )
}

function CasePreviewFallback({ label }: { label: string }) {
  return (
    <span className="absolute inset-0 flex items-center justify-center px-2 text-center text-[8px] leading-[1.25] font-medium text-neutral-300">
      {label}
    </span>
  )
}

function CaseStatusBadge({ label, status }: { label: string; status: CaseListStatus }) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[11px] leading-none font-bold ${statusClassNames[status]}`}
    >
      {label}
    </span>
  )
}

export { CaseCard }
