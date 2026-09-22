"use client"

import gsap from "gsap"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef } from "react"

import { useAuthTransition } from "../../components/shell/auth-transition-provider"

function useAuthTransitionNav() {
  const router = useRouter()
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

      if (!formElement) {
        router.push(href)
        return
      }

      if (!beginTransition(href)) {
        return
      }

      exitTimelineRef.current?.kill()
      unregisterExitMotionRef.current?.()

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

      timeline.to(formElement, {
        duration: 0.18,
        ease: "power2.in",
        opacity: 0,
        y: -8,
      })
    },
    [beginTransition, navigateTransition, registerMotion, router],
  )

  return { navigateWithExit }
}

export { useAuthTransitionNav }
