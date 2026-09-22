"use client"

import { Toaster as SonnerToaster } from "sonner"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

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
      position="top-right"
      theme={theme}
      toastOptions={{
        classNames: {
          content: "gap-1",
          description: "text-ui !text-[var(--toast-description)]",
      icon: "mt-1 self-start !text-[var(--toast-icon)]",
          title: "text-ui-semibold !text-[var(--toast-title)]",
          toast:
            "!border-[var(--toast-border)] !bg-[var(--toast-surface)] !text-[var(--toast-title)] shadow-[var(--toast-shadow)]",
        },
      }}
    />
  )
}

export { Toaster }
