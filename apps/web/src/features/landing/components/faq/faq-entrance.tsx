"use client"

import { useRef, type ReactNode } from "react"

import { useFaqEntrance } from "@/features/landing/hooks/animations/use-faq-entrance"

type FaqEntranceProps = {
  children: ReactNode
}

function FaqEntrance({ children }: FaqEntranceProps) {
  const scope = useRef<HTMLDivElement>(null)
  useFaqEntrance(scope)

  return <div ref={scope}>{children}</div>
}

export { FaqEntrance }
