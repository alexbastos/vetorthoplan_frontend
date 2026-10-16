"use client"

import type { MouseEvent, ReactNode } from "react"

import { cn } from "@/lib/utils"
import { useAuthTransitionNav } from "../../hooks/animations/use-auth-transition-nav"
import { useAuthTransition } from "../shell/auth-transition-provider"

type AuthNavLinkProps = {
  children: ReactNode
  className?: string
  href: string
}

export function AuthNavLink({ children, className, href }: AuthNavLinkProps) {
  const { navigateWithExit } = useAuthTransitionNav()
  const { isTransitioning } = useAuthTransition()

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()

    if (isTransitioning) {
      return
    }

    navigateWithExit(href)
  }

  return (
    <a
      className={cn(
        "motion-interactive rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-capta-border-focus focus-visible:ring-offset-2 aria-disabled:pointer-events-none aria-disabled:cursor-wait",
        className,
      )}
      aria-disabled={isTransitioning}
      href={href}
      onClick={handleClick}
      tabIndex={isTransitioning ? -1 : undefined}
    >
      {children}
    </a>
  )
}
