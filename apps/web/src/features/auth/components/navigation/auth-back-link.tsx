"use client"

import { usePathname } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

import { useAuthTransitionNav } from "../../hooks/animations/use-auth-transition-nav"
import { useAuthTransition } from "../shell/auth-transition-provider"

type AuthBackLinkProps = {
  className?: string
}

function AuthBackLink({ className }: AuthBackLinkProps) {
  const t = useTranslations("auth.shell")
  const pathname = usePathname()
  const { navigateWithExit } = useAuthTransitionNav()
  const { isTransitioning } = useAuthTransition()
  const href = pathname === "/login" ? "/" : "/login"

  return (
    <button
      className={cn(
        "motion-interactive absolute z-30 inline-flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-ui-semibold text-capta-text-primary outline-none transition-colors duration-200 hover:bg-capta-surface-card focus-visible:ring-2 focus-visible:ring-capta-border-focus focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-wait",
        className ?? "top-6 left-6",
      )}
      data-auth-back
      disabled={isTransitioning}
      onClick={() => navigateWithExit(href)}
      type="button"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {t("back")}
    </button>
  )
}

export { AuthBackLink }
