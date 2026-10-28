import { useTranslations } from "next-intl"

import { LoginHandoffPawLoader } from "@/components/shared/login-handoff/login-handoff-paw-loader"
import styles from "@/components/shared/login-handoff/login-handoff-overlay.module.css"
import { LoginHandoffStatusText } from "@/components/shared/login-handoff/login-handoff-status-text"

import type { RegistrationConfirmationState } from "../shell/auth-transition-provider"

function RegistrationCreationLoader({ state }: { state: RegistrationConfirmationState }) {
  const t = useTranslations("auth.registration")

  return (
    <section
      aria-atomic="true"
      aria-busy="true"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center bg-workspace px-6 text-center opacity-0"
      data-auth-registration-loader
      role="status"
    >
      <div className={styles.content}>
        <LoginHandoffPawLoader settle={state === "exiting"} size={104} />
        <div className={styles.status}>
          <p className={styles.message} data-auth-registration-status-creating>
            <LoginHandoffStatusText>{t("created")}</LoginHandoffStatusText>
          </p>
          <p className={`${styles.message} opacity-0`} data-auth-registration-status-sent>
            <LoginHandoffStatusText>{t("confirmationSent")}</LoginHandoffStatusText>
          </p>
        </div>
      </div>
    </section>
  )
}

export { RegistrationCreationLoader }
