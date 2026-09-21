"use client"

import gsap from "gsap"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef } from "react"

import { getAuthVisualMode, useAuthTransition } from "../../components/shell/auth-transition-provider"

function getBackLinkTargetOffset(backElement: Element, isTargetRecovery: boolean) {
  const stageElement = document.querySelector("[data-auth-stage]")
  const backRect = backElement.getBoundingClientRect()

  if (!isTargetRecovery || !stageElement) {
    return { deltaX: 24 - backRect.left, deltaY: 24 - backRect.top }
  }

  const stageRect = stageElement.getBoundingClientRect()
  const deltaX = stageRect.left + 24 - backRect.left
  const deltaY = stageRect.top + 32 - backRect.top

  return { deltaX, deltaY }
}

function useAuthTransitionNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { beginTransition, navigateTransition, registerMotion } = useAuthTransition()
  const exitTimelineRef = useRef<gsap.core.Timeline | null>(null)
  const unregisterExitMotionRef = useRef<(() => void) | null>(null)

  useEffect(
    () => () => {
      exitTimelineRef.current?.kill()
      unregisterExitMotionRef.current?.()
    },
    [],
  )

  const navigateWithExit = useCallback(
    (href: string) => {
      const formElement = document.querySelector("[data-auth-form]")
      const panelElement = document.querySelector("[data-auth-panel]")
      const stageElement = document.querySelector("[data-auth-stage]")
      const logoElement = document.querySelector("[data-auth-logo]")
      const backElement = document.querySelector("[data-auth-back]")

      if (!formElement) {
        router.push(href)
        return
      }

      if (!beginTransition(href)) {
        return
      }

      exitTimelineRef.current?.kill()
      unregisterExitMotionRef.current?.()

      const isTargetRecovery = getAuthVisualMode(href) === "recovery"
      const isCurrentCentered = getAuthVisualMode(pathname) !== "split"

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        navigateTransition()
        return
      }

      const timeline = gsap.timeline({
        onComplete: () => {
          unregisterExitMotionRef.current?.()
          unregisterExitMotionRef.current = null
          exitTimelineRef.current = null
          navigateTransition()
        },
      })

      exitTimelineRef.current = timeline
      unregisterExitMotionRef.current = registerMotion("route-exit", {
        cancel: () => timeline.kill(),
        settle: () => timeline.progress(1),
      })

      if (logoElement && stageElement) {
        const stageWidth = stageElement.clientWidth
        const logoWidth = logoElement.clientWidth
        const targetX = (stageWidth - logoWidth) / 2 - 24

        if (isTargetRecovery) {
          timeline.to(
            logoElement,
            {
              duration: 0.38,
              ease: "power2.inOut",
              x: targetX,
            },
            0,
          )
        } else if (isCurrentCentered) {
          timeline.to(
            logoElement,
            {
              duration: 0.38,
              ease: "power2.inOut",
              x: 0,
            },
            0,
          )
        }
      }

      if (backElement) {
        const { deltaX, deltaY } = getBackLinkTargetOffset(backElement, isTargetRecovery)

        if (isTargetRecovery || isCurrentCentered) {
          timeline.to(
            backElement,
            {
              duration: 0.38,
              ease: "power2.inOut",
              x: deltaX,
              y: deltaY,
            },
            0,
          )
        }
      }

      if (isTargetRecovery) {
        if (panelElement) {
          timeline.to(
            panelElement,
            {
              duration: 0.22,
              ease: "power2.in",
              opacity: 0,
              x: -16,
            },
            0,
          )
        }

        timeline.to(
          formElement,
          {
            duration: 0.18,
            ease: "power2.in",
            opacity: 0,
            y: -8,
          },
          0,
        )
      } else if (isCurrentCentered) {
        if (panelElement) {
          gsap.set(panelElement, { autoAlpha: 1, x: 0 })
          gsap.set("[data-auth-panel-bg]", { autoAlpha: 0 })
          gsap.set("[data-auth-source]", { autoAlpha: 0, x: -12 })
          gsap.set("[data-auth-showcase]", { autoAlpha: 0, x: 16, y: 8 })
          gsap.set("[data-auth-tagline]", { autoAlpha: 0, y: 10 })

          timeline.to("[data-auth-panel-bg]", { autoAlpha: 1, duration: 0.35, ease: "power2.out" }, 0)
          timeline.to("[data-auth-source]", { autoAlpha: 1, duration: 0.3, ease: "power2.out", x: 0 }, 0.04)
          timeline.to("[data-auth-showcase]", { autoAlpha: 1, duration: 0.35, ease: "power2.out", x: 0, y: 0 }, 0.06)
          timeline.to("[data-auth-tagline]", { autoAlpha: 1, duration: 0.3, ease: "power2.out", y: 0 }, 0.08)
        }

        timeline.to(
          formElement,
          {
            duration: 0.18,
            ease: "power2.in",
            opacity: 0,
            y: -8,
          },
          0,
        )
      } else {
        timeline.to(
          formElement,
          {
            duration: 0.18,
            ease: "power2.in",
            opacity: 0,
            y: -8,
          },
          0,
        )
      }
    },
    [beginTransition, navigateTransition, pathname, registerMotion, router],
  )

  return { navigateWithExit }
}

export { useAuthTransitionNav }
