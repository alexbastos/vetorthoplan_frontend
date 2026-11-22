import Image from "next/image"
import { getTranslations } from "next-intl/server"
import type { ReactNode } from "react"

import { CasesNavigationIcon } from "@/components/shared/app-shell/app-navigation-icons"
import {
  AddFileSidebarIcon,
  CalibrationSidebarIcon,
  DocumentFileSidebarIcon,
  ImagesSidebarIcon,
  MeasurementsSidebarIcon,
  SidebarCheckIcon,
  SidebarChevronIcon,
  SimulationSidebarIcon,
} from "../hero/marketing-sidebar-icons"
import { workflowRadiographs } from "../hero/workflow-radiographs"
import styles from "./hero-product-sidebar.module.css"
import { HeroDemoSidebarItem } from "./hero-product-demo-elements"

type SidebarStatus = "context" | "completed" | "active" | "pending" | "action"

const planningItems = [
  { key: "images", icon: ImagesSidebarIcon, status: "completed" },
  { key: "calibration", icon: CalibrationSidebarIcon, status: "completed" },
  { key: "measurements", icon: MeasurementsSidebarIcon, status: "context" },
  { key: "simulation", icon: SimulationSidebarIcon, status: "pending" },
] as const

async function HeroProductSidebar() {
  const [t, workflow] = await Promise.all([
    getTranslations("orthovetLanding.marketingMockup"),
    getTranslations("orthovetLanding.workflow.ui"),
  ])

  return (
    <div className={styles.content}>
      <SidebarProfile clinicName={t("clinicName")} name={t("profileName")} />

      <div aria-label={t("navigationLabel")} className={styles.groups}>
        <SidebarGroup label={t("caseGroup")}>
          <SidebarItem icon={CasesNavigationIcon} label={workflow("caseId")} status="context" />
        </SidebarGroup>

        <SidebarGroup label={t("planningGroup")}>
          {planningItems.map(({ key, icon, status }) => (
            <SidebarItem icon={icon} key={key} label={t(key)} name={key} status={status} />
          ))}
        </SidebarGroup>

        <SidebarGroup label={t("filesGroup")}>
          <SidebarItem icon={AddFileSidebarIcon} label={t("addFile")} status="action" />
          <SidebarFile label={t("lateralFile")} src={workflowRadiographs.lateral.src} />
          <SidebarFile label={t("cranialFile")} src={workflowRadiographs.craniocaudal.src} />
          <SidebarFile label={t("examsFile")} />
        </SidebarGroup>

        <SidebarGroup label={t("outputGroup")}>
          <SidebarItem icon={DocumentFileSidebarIcon} label={t("report")} name="report" status="pending" />
        </SidebarGroup>
      </div>
    </div>
  )
}

function SidebarProfile({ clinicName, name }: { clinicName: string; name: string }) {
  return (
    <div className={styles.profile}>
      <span className={styles.avatar}>
        <Image alt="" height={30} src="/images/landing/img_doutor_hero.avif" width={30} />
      </span>
      <span className={styles.profileText}>
        <span className={styles.profileName}>{name}</span>
        <span className={styles.clinicName}>{clinicName}</span>
      </span>
      <SidebarChevronIcon className={styles.profileChevron} height={9.5} width={9.5} />
    </div>
  )
}

function SidebarGroup({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section className={styles.group}>
      <p className={styles.groupLabel}>{label}</p>
      <ul className={styles.items}>{children}</ul>
    </section>
  )
}

function SidebarItem({ icon: Icon, label, name, status }: { icon: typeof CasesNavigationIcon; label: string; name?: string; status: SidebarStatus }) {
  return (
    <HeroDemoSidebarItem className={styles.item} name={name} status={status}>
      <Icon className={styles.itemIcon} height={13.217} strokeWidth={1.5} width={13.217} />
      <span className={styles.label}>{label}</span>
      <span className={styles.itemEnd}>
        {status === "completed" || name === "measurements" ? <SidebarCheckIcon className={styles.statusCheck} height={8} width={8} /> : null}
      </span>
    </HeroDemoSidebarItem>
  )
}

function SidebarFile({ label, src }: { label: string; src?: string }) {
  return (
    <li className={`${styles.item} ${styles.file}`}>
      <span className={styles.filePreview} data-kind={src ? "image" : "document"}>
        {src ? <Image alt="" fill sizes="22px" src={src} /> : <Image alt="" height={15} src="/icons/pdf-file-svgrepo.svg" width={15} />}
      </span>
      <span className={styles.label}>{label}</span>
      <span className={styles.itemEnd} />
    </li>
  )
}

export { HeroProductSidebar }
