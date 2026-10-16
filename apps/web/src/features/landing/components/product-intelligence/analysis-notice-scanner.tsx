"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { useRef } from "react"

gsap.registerPlugin(useGSAP)

function AnalysisNoticeScanner() {
  const scope = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const documentCard = scope.current?.querySelector<HTMLElement>("[data-notice-scanner-document]")
      const digitalLayer = scope.current?.querySelector<HTMLElement>("[data-notice-scanner-digital]")
      const scanLine = scope.current?.querySelector<HTMLElement>("[data-notice-scanner-line]")

      if (!documentCard || !digitalLayer || !scanLine) {
        return undefined
      }

      const media = gsap.matchMedia()

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const timeline = gsap.timeline({ repeat: -1, repeatDelay: 0.65 })

        timeline
          .set(documentCard, { rotateY: 0, transformPerspective: 500 })
          .set(digitalLayer, { autoAlpha: 0 })
          .set(scanLine, { autoAlpha: 0, top: "0%" })
          .to(documentCard, { duration: 0.26, ease: "power2.in", rotateY: 90 })
          .to(documentCard, { duration: 0.3, ease: "power2.out", rotateY: 360 })
          .set(documentCard, { rotateY: 0 })
          .to(digitalLayer, { autoAlpha: 0.8, duration: 0.18 })
          .to(scanLine, { autoAlpha: 1, duration: 0.04 })
          .to(scanLine, { duration: 0.7, ease: "none", top: "100%" }, "<")
          .to(digitalLayer, { autoAlpha: 0, duration: 0.1 }, "<0.58")
          .to(scanLine, { autoAlpha: 0, duration: 0.06 })

        return () => timeline.kill()
      })

      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set([documentCard, digitalLayer, scanLine], { clearProps: "all" })
        gsap.set(digitalLayer, { autoAlpha: 0 })
        gsap.set(scanLine, { autoAlpha: 0 })
      })

      return () => media.revert()
    },
    { scope },
  )

  return (
    <div ref={scope} aria-hidden="true" className="flex h-14 items-center justify-start [perspective:500px]">
      <div data-notice-scanner-document className="relative h-13 w-10 overflow-hidden rounded-[2px] border border-capta-border-default bg-capta-surface-card shadow-[var(--shadow-card-analytics)] [transform-style:preserve-3d]">
        <div className="flex h-full flex-col justify-between p-1.5">
          <div className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-capta-text-disabled" />
            <span className="h-1 w-5 rounded-full bg-capta-text-disabled" />
          </div>
          <div className="space-y-1">
            <span className="block h-1 w-full rounded-full bg-capta-text-disabled" />
            <span className="block h-1 w-10/12 rounded-full bg-capta-surface-subtle-hover" />
            <span className="block h-1 w-4/5 rounded-full bg-capta-surface-subtle-hover" />
          </div>
          <span className="ml-auto h-2 w-5 rounded-[1px] bg-capta-text-disabled" />
        </div>
        <div data-notice-scanner-digital className="absolute inset-0 flex flex-col justify-between bg-capta-surface-card p-1.5 font-mono text-[4px] leading-tight text-capta-text-muted opacity-0">
          <span>1 0 1 1 0</span>
          <span># 8 % $ &amp;</span>
          <span>0 1 8 % #</span>
          <span>1 0 # % 8</span>
        </div>
        <span data-notice-scanner-line className="pointer-events-none absolute -left-px z-10 h-px w-[calc(100%+2px)] rounded-full bg-capta-brand-primary shadow-[0_0_5px_var(--color-brand-primary)] opacity-0" />
      </div>
    </div>
  )
}

export { AnalysisNoticeScanner }
