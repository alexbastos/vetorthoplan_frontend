"use client"

import { useRef, type ReactNode } from "react"

import { useRoutineBenefitsEntrance } from "./use-routine-benefits-entrance"

function RoutineBenefitsEntrance({ children, className }: { children: ReactNode; className: string }) {
  const scope = useRef<HTMLDivElement>(null)
  useRoutineBenefitsEntrance(scope)

  return <div ref={scope} className={className} data-routine-motion="pending">{children}</div>
}

export { RoutineBenefitsEntrance }
