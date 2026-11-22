"use client"

import { createElement, useRef, type ReactNode } from "react"

import { useResourceReveal } from "./animations/use-resource-reveal"

type ResourceRevealProps = {
  as?: "div" | "header" | "li"
  children: ReactNode
  className?: string
  delay?: number
}

// The content stays server-rendered; only its viewport entrance needs a client boundary.
function ResourceReveal({ as = "div", children, className, delay = 0 }: ResourceRevealProps) {
  const scope = useRef<HTMLElement>(null)
  useResourceReveal(scope, delay)

  return createElement(as, { ref: scope, className, "data-resource-motion": "pending" }, children)
}

export { ResourceReveal }
