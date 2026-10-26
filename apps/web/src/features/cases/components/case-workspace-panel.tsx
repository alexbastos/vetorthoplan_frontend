"use client"

import { Camera, Ruler, Stethoscope } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useRef, type ReactNode } from "react"

import { PatientDetailsIcon } from "@/components/ui/patient-details-icon"
import { ImageLibraryIcon } from "@/components/ui/image-library-icon"
import { CalibrationIcon } from "@/components/ui/calibration-icon"

type WorkspacePanelSection = "case" | "images" | "calibration"

type CaseWorkspacePanelProps = {
  activeSection: WorkspacePanelSection
  calibrationAvailable: boolean
  calibrationUnavailableReason?: string
  caseContext: ReactNode
  imageList: ReactNode
  imageActions?: ReactNode
  calibrationActions?: ReactNode
  children?: ReactNode
  onSectionChange: (section: WorkspacePanelSection) => void
}

function CaseWorkspacePanel({ activeSection, calibrationAvailable, calibrationUnavailableReason, caseContext, imageList, imageActions, calibrationActions, children, onSectionChange }: CaseWorkspacePanelProps) {
  const t = useTranslations("cases.workspace.panel")
  const tWorkspace = useTranslations("cases.workspace")
  const headingRef = useRef<HTMLHeadingElement>(null)
  const previousSection = useRef(activeSection)

  useEffect(() => {
    if (previousSection.current === activeSection) return
    previousSection.current = activeSection
    headingRef.current?.focus()
  }, [activeSection])

  const title = activeSection === "case" ? tWorkspace("caseDetails.heading")
    : activeSection === "images" ? tWorkspace("images.title") : tWorkspace("calibration.title")

  return (
    <aside aria-label={t("region")} className="order-1 flex min-w-0 flex-col gap-2 lg:col-start-1 lg:row-start-1 lg:min-h-0 lg:flex-row">
      <nav aria-label={t("navigation")} className="flex shrink-0 gap-1.5 lg:flex-col lg:pt-2">
        <RailButton active={activeSection === "case"} icon={<Stethoscope aria-hidden="true" strokeWidth={1.5} />} label={tWorkspace("sidebar.title")} onClick={() => onSectionChange("case")} />
        <RailButton active={activeSection === "images"} icon={<Camera aria-hidden="true" strokeWidth={1.5} />} label={tWorkspace("images.title")} onClick={() => onSectionChange("images")} />
        <RailButton active={activeSection === "calibration"} disabled={!calibrationAvailable} icon={<Ruler aria-hidden="true" strokeWidth={1.5} />} label={tWorkspace("calibration.title")} title={calibrationAvailable ? undefined : calibrationUnavailableReason} onClick={() => onSectionChange("calibration")} />
      </nav>
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto rounded-[var(--radius-token-md)] border border-border bg-card">
        <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
          <h2 className="flex min-w-0 items-center gap-2 text-[13px] font-semibold outline-none" ref={headingRef} tabIndex={-1}>
            {activeSection === "case" ? <PatientDetailsIcon aria-hidden="true" className="size-5 shrink-0 text-icon-active" />
              : activeSection === "images" ? <ImageLibraryIcon aria-hidden="true" className="size-5 shrink-0 text-icon-active" /> : <CalibrationIcon aria-hidden="true" className="size-5 shrink-0 text-icon-active" />}
            <span className="truncate">{title}</span>
          </h2>
          {activeSection === "images" ? imageActions : activeSection === "calibration" ? calibrationActions : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col px-4 py-4">
          {activeSection === "case" ? caseContext : activeSection === "images" ? imageList : children}
        </div>
      </section>
    </aside>
  )
}

function RailButton({ active, disabled, icon, label, title, onClick }: { active: boolean; disabled?: boolean; icon: ReactNode; label: string; title?: string; onClick: () => void }) {
  return (
    <button aria-label={label} aria-pressed={active} className={`flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-token-md)] border border-border bg-card outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-[1.125rem] [&_svg]:shrink-0 ${active ? "text-[var(--case-progress-label-active)]" : "text-muted-foreground hover:bg-muted hover:text-foreground"} disabled:cursor-not-allowed disabled:opacity-40`} disabled={disabled} onClick={onClick} title={title ?? label} type="button">
      {icon}
    </button>
  )
}

export { CaseWorkspacePanel }
export type { WorkspacePanelSection }
