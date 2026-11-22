"use client"

import { useRef, type ReactNode } from "react"

import { useFooterEntrance } from "./use-footer-entrance"

function FooterEntrance({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null)
  useFooterEntrance(scope)

  return <div className="universal-footer__content" data-footer-motion="pending" ref={scope}>{children}</div>
}

export { FooterEntrance }
