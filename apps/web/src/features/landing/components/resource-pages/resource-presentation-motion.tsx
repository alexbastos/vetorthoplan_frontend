"use client"

import { useRef, type ReactNode } from "react"

import { useResourcePresentationEntrance } from "./animations/use-resource-presentation-entrance"

function ResourcePresentationMotion({ children, className, hasVisual }: {
  children: ReactNode; className: string; hasVisual: boolean
}) {
  const scope = useRef<HTMLElement>(null)
  useResourcePresentationEntrance(scope)

  return (
    <header ref={scope} className={className} data-has-visual={hasVisual} data-resource-motion="pending">
      {children}
    </header>
  )
}

export { ResourcePresentationMotion }
