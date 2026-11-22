"use client"

import { useRef, type ReactNode } from "react"

import { useFaqEntrance } from "./use-faq-entrance"

// Server-rendered content crosses one client boundary for the shared entrance.
// Native details/summary continue to own all accordion interaction.
function FaqEntrance({ children, className }: { children: ReactNode; className: string }) {
  const scope = useRef<HTMLDivElement>(null)
  useFaqEntrance(scope)

  return (
    <div ref={scope} className={className} data-faq-motion="pending">
      {children}
    </div>
  )
}

export { FaqEntrance }
