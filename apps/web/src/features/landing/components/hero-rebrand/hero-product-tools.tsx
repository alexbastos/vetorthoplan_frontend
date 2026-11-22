import { Circle, Crosshair, MoveHorizontal, Scissors, TriangleRight, type LucideIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"

import styles from "./hero-product-workspace.module.css"
import { HeroDemoPanel, HeroDemoTool } from "./hero-product-demo-elements"

async function HeroProductTools() {
  const t = await getTranslations("cases.workspace")

  return (
    <HeroDemoPanel className={styles.measurementDock} kind="menu" label={t("tools.measurements")}>
      <ToolChoice icon={MoveHorizontal} label={t("distance.title")} name="distance" />
      <ToolChoice icon={TriangleRight} label={t("tools.catalog.angle")} name="angle" />
      <ToolChoice icon={Circle} label={t("tools.catalog.circle")} name="circle" />
      <span aria-hidden="true" className={styles.measurementDivider} />
      <ToolChoice icon={Crosshair} label={t("landmarks.entryTitle")} name="tpa" />
      <ToolChoice icon={Scissors} label={t("tools.catalog.simulation")} name="simulation" />
    </HeroDemoPanel>
  )
}

function ToolChoice({ icon: Icon, label, name }: { icon: LucideIcon; label: string; name: string }) {
  return (
    <HeroDemoTool className={styles.measurementAction} name={name} title={label}>
      <Icon aria-hidden="true" size={13.217} strokeWidth={1.5} />
      <span className="sr-only">{label}</span>
    </HeroDemoTool>
  )
}

export { HeroProductTools }
