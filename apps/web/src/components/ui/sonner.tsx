"use client"

import { Toaster as SonnerToaster } from "sonner"
import { LoaderCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { NotificationStatusIcon } from "./notification-status-icon"
import styles from "./sonner.module.css"

function Toaster() {
  const t = useTranslations("common.accessibility")
  const [theme, setTheme] = useState<"dark" | "light">("light")

  useEffect(() => {
    const root = document.documentElement
    const syncTheme = () => setTheme(root.classList.contains("dark") ? "dark" : "light")
    const observer = new MutationObserver(syncTheme)

    syncTheme()
    observer.observe(root, { attributeFilter: ["class"], attributes: true })

    return () => observer.disconnect()
  }, [])

  return (
    <SonnerToaster
      containerAriaLabel={t("notifications")}
      duration={2800}
      gap={12}
      icons={{
        success: <NotificationStatusIcon kind="success" />,
        error: <NotificationStatusIcon kind="error" />,
        warning: <NotificationStatusIcon kind="warning" />,
        info: <NotificationStatusIcon kind="info" />,
        loading: <LoaderCircle aria-hidden="true" className={`${styles.statusIcon} ${styles.iconLoading} animate-spin motion-reduce:animate-none`} />,
      }}
      position="top-right"
      theme={theme}
      toastOptions={{
        classNames: {
          content: styles.content,
          description: styles.description,
          icon: styles.iconWrapper,
          title: styles.title,
          toast: styles.toast,
        },
      }}
    />
  )
}

export { Toaster }
