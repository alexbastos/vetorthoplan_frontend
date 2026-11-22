import { Check, X } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { NotificationStatusIcon } from "@/components/ui/notification-status-icon"
import styles from "./hero-product-save-feedback.module.css"
import { HeroDemoButton, HeroDemoPanel } from "./hero-product-demo-elements"

async function HeroProductSaveActions() {
  const t = await getTranslations("cases.workspace.landmarks")
  return (
    <HeroDemoPanel className={styles.actions} kind="save" label={t("editActions")}>
      <HeroDemoButton className={`${styles.action} ${styles.cancel}`} name="cancel" title={t("cancelEditing")}>
        <X aria-hidden="true" size={13.217} strokeWidth={1.5} />
      </HeroDemoButton>
      <HeroDemoButton className={`${styles.action} ${styles.confirm}`} name="confirm" title={t("save")}>
        <Check aria-hidden="true" size={13.217} strokeWidth={1.5} />
      </HeroDemoButton>
    </HeroDemoPanel>
  )
}

async function HeroProductSavedToast() {
  const t = await getTranslations("orthovetLanding.heroRebrand.saveFeedback")
  return (
    <HeroDemoPanel className={styles.notification} kind="toast">
      <NotificationStatusIcon kind="success" />
      <div className={styles.content}>
        <p className={styles.title}>{t("title")}</p>
        <p className={styles.description}>{t("description")}</p>
      </div>
    </HeroDemoPanel>
  )
}

export { HeroProductSaveActions, HeroProductSavedToast }
