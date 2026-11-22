"use client"

import { useRef, type ReactNode } from "react"

import { useResourceOverviewEntrance } from "./animations/use-resource-overview-entrance"

function ResourceOverviewMotion({ children, className }: { children: ReactNode; className: string }) {
  const scope = useRef<HTMLElement>(null)
  useResourceOverviewEntrance(scope)

  return (
    <section ref={scope} aria-labelledby="resource-overview-title" className={className} data-resource-motion="pending">
      {children}
    </section>
  )
}

export { ResourceOverviewMotion }
