import { useTranslations } from "next-intl"

import { LoginHandoffPawLoader } from "@/components/shared/login-handoff/login-handoff-paw-loader"
import styles from "@/components/shared/login-handoff/login-handoff-overlay.module.css"

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
            <span className={styles.statusLabel}>{t("created")}</span>
            <StatusDots />
          </p>
          <p className={`${styles.message} opacity-0`} data-auth-registration-status-sent>
            <span className={styles.statusLabel}>{t("confirmationSent")}</span>
            <StatusDots />
          </p>
        </div>
      </div>
    </section>
  )
}

function StatusDots() {
  return (
    <svg aria-hidden="true" className={styles.statusDots} fill="none" viewBox="0 0 18 6">
      <circle className={styles.statusDot} cx="3" cy="3" r="1.25" />
      <circle className={styles.statusDot} cx="9" cy="3" r="1.25" />
      <circle className={styles.statusDot} cx="15" cy="3" r="1.25" />
    </svg>
  )
}

export { RegistrationCreationLoader }
