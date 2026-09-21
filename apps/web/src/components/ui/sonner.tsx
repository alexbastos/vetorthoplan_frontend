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
          description: "text-ui !text-content-secondary",
          icon: "mt-0.5 self-start !text-foreground",
          title: "text-ui-semibold !text-foreground",
          toast:
            "!border-border !bg-card !text-foreground shadow-[var(--shadow-elevated)]",
        },
      }}
    />
  )
}

export { Toaster }
