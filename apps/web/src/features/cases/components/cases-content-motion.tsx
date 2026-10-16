"use client"

import { type ReactNode, useRef } from "react"

import { useLoginHandoff } from "@/components/shared/login-handoff/login-handoff-provider"
import { cn } from "@/lib/utils"

import { useCasesContentEntrance, type CasesContentEntranceVariant } from "../hooks/animations/use-cases-content-entrance"
import styles from "./cases-motion.module.css"

type CasesContentMotionProps = {
  children: ReactNode
  className?: string
  variant: CasesContentEntranceVariant
}

/** Mount alongside the resolved content, including content inside Suspense. */
function CasesContentMotion({ children, className, variant }: CasesContentMotionProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const { isDestinationHandoffActive } = useLoginHandoff()

  useCasesContentEntrance(contentRef, variant, isDestinationHandoffActive)

  return (
    <div
      ref={contentRef}
      className={cn(styles.entrance, "w-full", className)}
      data-cases-content={variant}
      data-cases-entrance="pending"
    >
      {children}
    </div>
  )
}

export { CasesContentMotion }
