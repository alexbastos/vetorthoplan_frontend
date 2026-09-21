"use client"

import { type ReactNode, useRef } from "react"

import { useSettingsPageEntrance } from "../hooks/animations/use-settings-page-entrance"

function SettingsPageMotion({ children }: { children: ReactNode }) {
  const pageRef = useRef<HTMLDivElement>(null)

  useSettingsPageEntrance(pageRef)

  return (
    <div ref={pageRef} data-settings-page className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-8 sm:px-8 sm:py-10">
      {children}
    </div>
  )
}

export { SettingsPageMotion }
