"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { useLayoutEffect, useRef, type RefObject } from "react"

import type { PublicNoticesFeatureId } from "../../components/public-notices/types"

gsap.registerPlugin(useGSAP)

const PANEL_ENTER_DURATION_SECONDS = 0.34
const PANEL_EXIT_DELAY_SECONDS = 0.12
const PANEL_EXIT_DURATION_SECONDS = 0.18
const PANEL_OFFSET_PX = 12

function usePublicNoticesPanelTransition(
  scope: RefObject<HTMLDivElement | null>,
  activeFeatureId: PublicNoticesFeatureId,
) {
  const currentPanelRef = useRef<HTMLElement | null>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const transitionToRef = useRef<(featureId: PublicNoticesFeatureId) => void>(() => undefined)

  useGSAP(
    () => {
      const root = scope.current

      if (!root) {
        return undefined
      }

      const panels = gsap.utils.toArray<HTMLElement>("[data-public-notices-panel]", root)
      const initialPanel = panels.find(
        (panel) => panel.dataset.publicNoticesPanel === activeFeatureId,
      )
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

      gsap.set(panels, {
        autoAlpha: 0,
        pointerEvents: "none",
        y: prefersReducedMotion ? 0 : PANEL_OFFSET_PX,
        zIndex: 0,
      })

      if (initialPanel) {
        gsap.set(initialPanel, {
          autoAlpha: 1,
          pointerEvents: "auto",
          y: 0,
          zIndex: 10,
        })
        currentPanelRef.current = initialPanel
      }

      transitionToRef.current = (nextFeatureId) => {
        const nextPanel = panels.find(
          (panel) => panel.dataset.publicNoticesPanel === nextFeatureId,
        )
        const previousPanel = currentPanelRef.current

        if (!nextPanel || nextPanel === previousPanel) {
          return
        }

        timelineRef.current?.kill()
        gsap.killTweensOf(panels)

        panels.forEach((panel) => {
          if (panel !== previousPanel && panel !== nextPanel) {
            gsap.set(panel, {
              autoAlpha: 0,
              pointerEvents: "none",
              y: prefersReducedMotion ? 0 : PANEL_OFFSET_PX,
              zIndex: 0,
            })
          }
        })

        if (prefersReducedMotion) {
          if (previousPanel) {
            gsap.set(previousPanel, { autoAlpha: 0, pointerEvents: "none", zIndex: 0 })
          }

          gsap.set(nextPanel, {
            autoAlpha: 1,
            pointerEvents: "auto",
            y: 0,
            zIndex: 10,
          })
          currentPanelRef.current = nextPanel
          return
        }

        if (previousPanel) {
          gsap.set(previousPanel, {
            pointerEvents: "none",
            zIndex: 5,
          })
        }

        gsap.set(nextPanel, {
          pointerEvents: "auto",
          visibility: "visible",
          zIndex: 10,
        })

        currentPanelRef.current = nextPanel

        const timeline = gsap.timeline({ defaults: { overwrite: "auto" } })

        timeline.to(
          nextPanel,
          {
            autoAlpha: 1,
            duration: PANEL_ENTER_DURATION_SECONDS,
            ease: "power2.out",
            y: 0,
          },
          0,
        )

        if (previousPanel) {
          timeline.to(
            previousPanel,
            {
              autoAlpha: 0,
              duration: PANEL_EXIT_DURATION_SECONDS,
              ease: "power1.out",
              onComplete: () => {
                gsap.set(previousPanel, { y: PANEL_OFFSET_PX, zIndex: 0 })
              },
              y: PANEL_OFFSET_PX,
            },
            PANEL_EXIT_DELAY_SECONDS,
          )
        }

        timelineRef.current = timeline
      }

      return () => {
        timelineRef.current?.kill()
        timelineRef.current = null
        transitionToRef.current = () => undefined
        currentPanelRef.current = null
        gsap.killTweensOf(panels)
      }
    },
    { scope },
  )

  useLayoutEffect(() => {
    transitionToRef.current(activeFeatureId)
  }, [activeFeatureId])
}

export { usePublicNoticesPanelTransition }
