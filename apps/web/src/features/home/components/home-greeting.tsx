"use client"

import Image from "next/image"
import { useTranslations } from "next-intl"

import { useAppTheme, useAppUser } from "@/components/shared/app-shell"
import { AppUserAvatar } from "@/components/shared/app-shell/app-user-avatar"

import styles from "./home-page.module.css"

function HomeGreeting() {
  const t = useTranslations("home")
  const { avatarUrl, initials, name } = useAppUser()
  const { resolvedTheme } = useAppTheme()
  const firstName = name.trim().split(/\s+/).filter(Boolean)[0] ?? ""

  return (
    <header className={styles.greeting} data-home-greeting>
      <span className={styles.greetingAvatarFrame} data-home-greeting-avatar>
        <AppUserAvatar avatarUrl={avatarUrl} className={styles.greetingAvatar} initials={initials} />
      </span>
      <div className={styles.greetingCopy}>
        <p className={styles.greetingSalutation} data-home-greeting-salutation>{t("greeting", { firstName })}</p>
        <h1 className={styles.greetingTitle} data-home-greeting-title>
          <span>{t("welcome")}</span>
          <span className={styles.greetingLogoFrame}>
            <Image
              alt="Orthovet"
              className={styles.greetingLogo}
              height={28}
              src={resolvedTheme === "dark" ? "/brand/logo_vet_v2_white_spaced.svg" : "/brand/logo_vet_v2_black_spaced.svg"}
              width={140}
            />
          </span>
        </h1>
      </div>
    </header>
  )
}

export { HomeGreeting }
