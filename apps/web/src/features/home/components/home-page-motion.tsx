"use client"

import { type ReactNode, useRef } from "react"

import { useLoginHandoff } from "@/components/shared/login-handoff/login-handoff-provider"

import { useHomePageEntrance } from "../hooks/animations/use-home-page-entrance"
import styles from "./home-page.module.css"

function HomePageMotion({ children }: { children: ReactNode }) {
  const pageRef = useRef<HTMLDivElement>(null)
  const { isDestinationHandoffActive } = useLoginHandoff()

  useHomePageEntrance(pageRef, isDestinationHandoffActive)

  return (
    <div ref={pageRef} className={styles.page} data-home-entrance="pending" data-home-page>
      {children}
    </div>
  )
}

export { HomePageMotion }
