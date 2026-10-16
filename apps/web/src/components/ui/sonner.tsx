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
          description: "text-ui !text-capta-text-secondary",
          icon: "mt-0.5 self-start !text-capta-text-primary",
          title: "text-ui-semibold !text-capta-text-primary",
          toast:
            "!border-capta-border-default !bg-capta-surface-card !text-capta-text-primary shadow-[var(--card-base-shadow)]",
        },
      }}
    />
  )
}

export { Toaster }
