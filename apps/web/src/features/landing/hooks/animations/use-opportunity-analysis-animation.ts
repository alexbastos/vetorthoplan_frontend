"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import type { RefObject } from "react"

gsap.registerPlugin(useGSAP)

function useOpportunityAnalysisAnimation(scope: RefObject<HTMLDivElement | null>) {
  useGSAP(
    () => {
      const root = scope.current

      if (!root) {
        return undefined
      }

      const stages = gsap.utils.toArray<HTMLElement>("[data-analysis-stage]", root)
      const reasonings = gsap.utils.toArray<HTMLElement>("[data-analysis-reasoning]", root)
      const connectors = gsap.utils.toArray<HTMLElement>("[data-analysis-connector]", root)
      const media = gsap.matchMedia()

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const shimmerTweens: gsap.core.Tween[] = []
        const spinnerTweens: gsap.core.Tween[] = []
        let timeline: gsap.core.Timeline | null = null

        const reasoningHeaders = root.querySelectorAll<HTMLElement>("[data-analysis-reasoning-trigger]")
        const reasoningRunningLabels = root.querySelectorAll<HTMLElement>("[data-analysis-reasoning-running-label]")
        const reasoningDoneLabels = root.querySelectorAll<HTMLElement>("[data-analysis-reasoning-done-label]")
        const reasoningRunningContents = root.querySelectorAll<HTMLElement>("[data-analysis-reasoning-running-content]")
        const reasoningDoneContents = root.querySelectorAll<HTMLElement>("[data-analysis-reasoning-done-content]")
        const successFlashes = root.querySelectorAll<HTMLElement>("[data-analysis-success-flash]")

        gsap.set(reasoningHeaders, { attr: { "aria-disabled": "true" }, autoAlpha: 0, tabIndex: -1 })
        gsap.set([reasoningRunningLabels, reasoningRunningContents, reasoningDoneLabels, reasoningDoneContents], { autoAlpha: 0 })
        gsap.set(successFlashes, { autoAlpha: 0 })
        gsap.set(connectors, { scaleY: 0, transformOrigin: "top center" })

        const runSequence = () => {
          timeline = gsap.timeline({ defaults: { ease: "power2.out" } })

          stages.forEach((stage, index) => {
            const stageSpinnerTweens: gsap.core.Tween[] = []
            const card = stage.querySelector<HTMLElement>("[data-analysis-card]")
            const orbit = stage.querySelector<HTMLElement>("[data-analysis-orbit]")
            const successFlash = stage.querySelector<HTMLElement>("[data-analysis-success-flash]")
            const statusSpinner = stage.querySelector<HTMLElement>("[data-analysis-status-spinner]")
            const pending = stage.querySelector<HTMLElement>('[data-analysis-status="pending"]')
            const running = stage.querySelector<HTMLElement>('[data-analysis-status="running"]')
            const success = stage.querySelector<HTMLElement>('[data-analysis-status="success"]')
            const reasoning = reasonings[index]
            const reasoningHeader = reasoning?.querySelector<HTMLElement>("[data-analysis-reasoning-trigger]")
            const reasoningRunningLabel = reasoning?.querySelector<HTMLElement>("[data-analysis-reasoning-running-label]")
            const reasoningDoneLabel = reasoning?.querySelector<HTMLElement>("[data-analysis-reasoning-done-label]")
            const reasoningRunningContent = reasoning?.querySelector<HTMLElement>("[data-analysis-reasoning-running-content]")
            const reasoningDoneContent = reasoning?.querySelector<HTMLElement>("[data-analysis-reasoning-done-content]")
            const reasoningShimmer = reasoning?.querySelector<HTMLElement>("[data-analysis-reasoning-shimmer]")

            timeline
              ?.to(pending, { autoAlpha: 0, duration: 0.15 })
              .to(running, { autoAlpha: 1, duration: 0.2 }, "<")
              .to(orbit, { autoAlpha: 1, duration: 0.2 }, "<")
              .to(card, { borderColor: "var(--color-brand-accent)", duration: 0.2 }, "<")
              .to(reasoningHeader, { autoAlpha: 1, duration: 0.25 }, "<0.05")
              .to([reasoningRunningLabel, reasoningRunningContent], { autoAlpha: 1, duration: 0.25 }, "<")
              .call(() => {
                if (orbit) {
                  const orbitTween = gsap.fromTo(orbit, { "--analysis-angle": "0deg" }, { "--analysis-angle": "360deg", duration: 1.4, ease: "none", repeat: -1 })
                  spinnerTweens.push(orbitTween)
                  stageSpinnerTweens.push(orbitTween)
                }
                if (statusSpinner) {
                  const statusSpinnerTween = gsap.to(statusSpinner, { duration: 0.9, ease: "none", repeat: -1, rotation: 360, transformOrigin: "center" })
                  spinnerTweens.push(statusSpinnerTween)
                  stageSpinnerTweens.push(statusSpinnerTween)
                }
                if (reasoningShimmer) {
                  shimmerTweens.push(gsap.fromTo(reasoningShimmer, { backgroundPosition: "180% 0" }, { backgroundPosition: "-80% 0", duration: 1.8, ease: "none", repeat: -1 }))
                }
              })
              .to({}, { duration: 1.8 })
              .call(() => {
                stageSpinnerTweens.forEach((tween) => tween.kill())
                shimmerTweens.at(-1)?.kill()
              })
              .to([running, orbit], { autoAlpha: 0, duration: 0.18 })
              .to([reasoningRunningLabel, reasoningRunningContent], { autoAlpha: 0, duration: 0.18 }, "<")
              .to(success, { autoAlpha: 1, duration: 0.22 }, "<")
              .to(card, { borderColor: "var(--color-border-default)", duration: 0.18 }, "<")
              .to(successFlash, { autoAlpha: 1, duration: 0.3, ease: "power1.inOut" }, "<")
              .to([reasoningDoneLabel, reasoningDoneContent], { autoAlpha: 1, duration: 0.3 }, "<0.05")
              .set(reasoningHeader, { attr: { "aria-disabled": "false" }, tabIndex: 0 }, "<")
              .to({}, { duration: 0.35 })
              .to(successFlash, { autoAlpha: 0, duration: 0.3, ease: "power1.inOut" })

            if (index < connectors.length) {
              timeline?.to(connectors[index], { duration: 0.32, ease: "power1.inOut", scaleY: 1 })
            }
          })
        }

        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry?.isIntersecting) {
              runSequence()
              observer.disconnect()
            }
          },
          { threshold: 0.4 },
        )

        observer.observe(root)

        const syncVisibility = () => {
          if (document.visibilityState === "hidden") {
            timeline?.pause()
            shimmerTweens.forEach((tween) => tween.pause())
            spinnerTweens.forEach((tween) => tween.pause())
            return
          }

          timeline?.resume()
          shimmerTweens.forEach((tween) => tween.resume())
          spinnerTweens.forEach((tween) => tween.resume())
        }

        document.addEventListener("visibilitychange", syncVisibility)

        return () => {
          observer.disconnect()
          document.removeEventListener("visibilitychange", syncVisibility)
          timeline?.kill()
          shimmerTweens.forEach((tween) => tween.kill())
          spinnerTweens.forEach((tween) => tween.kill())
        }
      })

      media.add("(prefers-reduced-motion: reduce)", () => {
        const pendingAndRunning = root.querySelectorAll<HTMLElement>('[data-analysis-status="pending"], [data-analysis-status="running"], [data-analysis-orbit], [data-analysis-reasoning-running-label], [data-analysis-reasoning-running-content]')
        const success = root.querySelectorAll<HTMLElement>('[data-analysis-status="success"]')
        const cards = root.querySelectorAll<HTMLElement>("[data-analysis-card]")
        const successFlashes = root.querySelectorAll<HTMLElement>("[data-analysis-success-flash]")
        const reasoningHeaders = root.querySelectorAll<HTMLElement>("[data-analysis-reasoning-trigger]")
        const reasoningDone = root.querySelectorAll<HTMLElement>("[data-analysis-reasoning-done-label], [data-analysis-reasoning-done-content]")

        gsap.set(pendingAndRunning, { autoAlpha: 0 })
        gsap.set(success, { autoAlpha: 1 })
        gsap.set(cards, { borderColor: "var(--color-border-default)" })
        gsap.set(successFlashes, { autoAlpha: 0 })
        gsap.set(reasoningHeaders, { attr: { "aria-disabled": "false" }, autoAlpha: 1, tabIndex: 0 })
        gsap.set(reasoningDone, { autoAlpha: 1 })
        gsap.set(connectors, { scaleY: 1, transformOrigin: "top center" })
      })

      return () => media.revert()
    },
    { scope },
  )
}

export { useOpportunityAnalysisAnimation }
