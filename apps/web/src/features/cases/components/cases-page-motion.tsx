"use client"

import { type ReactNode, useRef } from "react"

import { useLoginHandoff } from "@/components/shared/login-handoff/login-handoff-provider"
import { cn } from "@/lib/utils"

import { useCasesPageEntrance } from "../hooks/animations/use-cases-page-entrance"
import styles from "./cases-motion.module.css"

function CasesPageMotion({ children }: { children: ReactNode }) {
  const pageRef = useRef<HTMLDivElement>(null)
  const { isDestinationHandoffActive } = useLoginHandoff()

  useCasesPageEntrance(pageRef, isDestinationHandoffActive)

  return (
    <div
      ref={pageRef}
      className={cn(styles.entrance, "flex w-full flex-1 flex-col px-6 py-8 sm:px-8 sm:py-10")}
      data-cases-entrance="pending"
      data-cases-page
    >
      {children}
    </div>
  )
}

export { CasesPageMotion }
