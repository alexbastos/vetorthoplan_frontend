import { CheckCircle2, MoreHorizontal } from "lucide-react"
import Image from "next/image"

import { CasesNavigationIcon } from "@/components/shared/app-shell/app-navigation-icons"
import { WorkflowPlanningStage } from "./workflow-planning-stage"
import { workflowRadiographs } from "./workflow-radiographs"
import type { WorkflowWorkspaceCopy } from "./workflow-workspace-types"

import {
  AddFileSidebarIcon,
  CalibrationSidebarIcon,
  DocumentFileSidebarIcon,
  ImagesSidebarIcon,
  MeasurementsSidebarIcon,
  SidebarCheckIcon,
  SidebarChevronIcon,
  SimulationSidebarIcon,
} from "./marketing-sidebar-icons"
import styles from "./marketing-product-mockup.module.css"

const stageOrder = ["images", "calibration", "measurements", "simulation", "report"] as const

type MarketingStage = (typeof stageOrder)[number] | "planningComplete"
type SidebarStatus = "pending" | "active" | "completed"
type SidebarIcon = typeof CasesNavigationIcon

type MarketingSidebarCopy = {
  navigationLabel: string
  profileName: string
  clinicName: string
  caseGroup: string
  planningGroup: string
  filesGroup: string
  outputGroup: string
  images: string
  calibration: string
  measurements: string
  simulation: string
  addFile: string
  lateralFile: string
  cranialFile: string
  examsFile: string
  report: string
}

type MarketingProductMockupProps = {
  activeStage?: MarketingStage
  copy: WorkflowWorkspaceCopy
  showProductPanel?: boolean
  sidebarCopy: MarketingSidebarCopy
}

const planningItems: readonly { icon: SidebarIcon; key: (typeof stageOrder)[number] }[] = [
  { icon: ImagesSidebarIcon, key: "images" },
  { icon: CalibrationSidebarIcon, key: "calibration" },
  { icon: MeasurementsSidebarIcon, key: "measurements" },
  { icon: SimulationSidebarIcon, key: "simulation" },
]

function MarketingProductMockup({ activeStage = "measurements", copy, showProductPanel = true, sidebarCopy }: MarketingProductMockupProps) {
  return (
    <div aria-label={copy.label} className={styles.mockup} role="group">
      <MarketingSidebar activeStage={activeStage} caseId={copy.caseId} copy={sidebarCopy} />

      <div aria-hidden={!showProductPanel} className={styles.productPanel} data-hidden={!showProductPanel}>
        {showProductPanel ? (
          <>
            <header className={styles.productHeader}>
              <p className={styles.caseIdentifier}>
                <span aria-hidden="true" className={styles.caseSeparator}>/</span>
                {copy.caseId.toUpperCase()}
              </p>
              <div className={styles.productHeaderActions}>
                <span className={styles.calibrationStatus}>
                  <CheckCircle2 aria-hidden="true" size={12} />
                  {copy.calibration}
                </span>
                <span className={styles.moreIcon}>
                  <MoreHorizontal aria-hidden="true" size={16} />
                </span>
              </div>
            </header>

            <WorkflowPlanningStage activeStep={2} copy={copy} />
          </>
        ) : null}
      </div>
    </div>
  )
}

function MarketingSidebar({ activeStage, caseId, copy }: { activeStage: MarketingStage; caseId: string; copy: MarketingSidebarCopy }) {
  const activeIndex = activeStage === "planningComplete" ? stageOrder.length : stageOrder.indexOf(activeStage)
  const statusFor = (stage: (typeof stageOrder)[number]): SidebarStatus => {
    if (activeStage === "planningComplete") return stage === "report" ? "pending" : "completed"
    const index = stageOrder.indexOf(stage)
    return index < activeIndex ? "completed" : index === activeIndex ? "active" : "pending"
  }

  return (
    <aside className={styles.sidebar}>
      <SidebarProfile clinicName={copy.clinicName} name={copy.profileName} />

      <div aria-label={copy.navigationLabel} className={styles.sidebarGroups}>
        <SidebarGroup label={copy.caseGroup}>
          <SidebarItem icon={CasesNavigationIcon} label={caseId} status="context" />
        </SidebarGroup>

        <SidebarGroup label={copy.planningGroup}>
          {planningItems.map(({ icon, key }) => (
            <SidebarItem icon={icon} key={key} label={copy[key]} status={statusFor(key)} />
          ))}
        </SidebarGroup>

        <SidebarFiles copy={copy} />

        <SidebarGroup label={copy.outputGroup}>
          <SidebarItem icon={DocumentFileSidebarIcon} label={copy.report} status={statusFor("report")} />
        </SidebarGroup>
      </div>
    </aside>
  )
}

function SidebarProfile({ clinicName, name }: { clinicName: string; name: string }) {
  return (
    <div className={styles.profile}>
      <span aria-hidden="true" className={styles.profileAvatar}>
        <Image alt="" height={20} src="/images/landing/img_doutor_hero.avif" width={20} />
      </span>
      <span className={styles.profileText}>
        <span className={styles.profileName}>{name}</span>
        <span className={styles.profileClinic}>{clinicName}</span>
      </span>
      <SidebarChevronIcon aria-hidden="true" className={styles.profileChevron} height={12} width={12} />
    </div>
  )
}

function SidebarFiles({ copy }: { copy: MarketingSidebarCopy }) {
  return (
    <SidebarGroup label={copy.filesGroup}>
      <SidebarItem icon={AddFileSidebarIcon} label={copy.addFile} status="action" />
      <SidebarFileItem label={copy.lateralFile} previewSrc={workflowRadiographs.lateral.src} status="default" />
      <SidebarFileItem label={copy.cranialFile} previewSrc={workflowRadiographs.craniocaudal.src} status="default" />
      <SidebarFileItem label={copy.examsFile} status="default" />
    </SidebarGroup>
  )
}

function SidebarGroup({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <section className={styles.group}>
      <p className={styles.groupLabel}>{label}</p>
      <ul className={styles.itemList}>{children}</ul>
    </section>
  )
}

function SidebarItem({ icon: Icon, label, status }: { icon: SidebarIcon; label: string; status: SidebarStatus | "context" | "action" }) {
  return (
    <li aria-current={status === "active" ? "step" : undefined} className={styles.item} data-status={status}>
      <Icon aria-hidden="true" className={styles.itemIcon} height={16} strokeWidth={1.5} width={16} />
      <span className={styles.itemLabel}>{label}</span>
      <span aria-hidden="true" className={styles.itemEnd}>
        {status === "completed" ? <SidebarCheckIcon height={11} width={11} /> : null}
      </span>
    </li>
  )
}

function SidebarFileItem({ label, previewSrc, status }: { label: string; previewSrc?: string; status: "default" | "active" }) {
  return (
    <li className={`${styles.item} ${styles.fileItem}`} data-file-status={status}>
      <span aria-hidden="true" className={styles.filePreview} data-kind={previewSrc ? "image" : "document"}>
        {previewSrc ? <Image alt="" fill sizes="28px" src={previewSrc} /> : <Image alt="" height={20} src="/icons/pdf-file-svgrepo.svg" width={20} />}
      </span>
      <span className={styles.itemLabel}>{label}</span>
      <span aria-hidden="true" className={styles.itemEnd} />
    </li>
  )
}

export { MarketingProductMockup }
export type { MarketingSidebarCopy, MarketingStage }
