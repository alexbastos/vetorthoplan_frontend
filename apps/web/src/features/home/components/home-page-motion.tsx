"use client"

import { type ReactNode, useRef } from "react"

import { useLoginHandoff } from "@/components/shared/login-handoff/login-handoff-provider"

import { useHomePageEntrance } from "../hooks/animations/use-home-page-entrance"

function HomePageMotion({ children }: { children: ReactNode }) {
  const pageRef = useRef<HTMLDivElement>(null)
  const { notifyDestinationReady } = useLoginHandoff()

  useHomePageEntrance(pageRef, notifyDestinationReady)

  return (
    <div ref={pageRef} data-home-page className="flex w-full flex-1 flex-col px-6 py-8 sm:px-8 sm:py-10">
      {children}
    </div>
  )
}

export { HomePageMotion }
