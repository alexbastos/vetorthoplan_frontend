"use client"

import gsap from "gsap"
import { useEffect, useRef } from "react"

import type { LoginHandoffState } from "./login-handoff-provider"

type UseLoginHandoffAnimationOptions = {
  onExitComplete: () => void
  state: LoginHandoffState
}

function useLoginHandoffAnimation({ onExitComplete, state }: UseLoginHandoffAnimationOptions) {
  const overlayRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const overlay = overlayRef.current

    if (!overlay) {
      return undefined
    }

    const messages = Array.from(overlay.querySelectorAll<HTMLElement>("[data-login-handoff-status]"))
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const setActiveMessage = (index: number) => {
      overlay.dataset.activeHandoffStatus = String(index)
    }

    if (state === "authenticating") {
      if (reducedMotion) {
        gsap.set(overlay, { autoAlpha: 1, y: 0 })
        gsap.set(messages, { autoAlpha: 0, y: 0 })
        gsap.set(messages[0], { autoAlpha: 1, y: 0 })
        return undefined
      }

      const statusTimeline = gsap.timeline({
        defaults: { ease: "power2.out" },
        repeat: -1,
      })

      gsap.set(messages, { autoAlpha: 0, y: 0 })
      gsap.set(messages[0], { autoAlpha: 1, y: 0 })
      setActiveMessage(0)

      const entrance = gsap.fromTo(overlay, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 })

      statusTimeline
        .to(messages[0], { autoAlpha: 0, duration: 0.16, ease: "power1.in", y: -2 }, 0.9)
        .call(() => setActiveMessage(1))
        .to(messages[1], { autoAlpha: 1, duration: 0.16, y: 0 }, ">")
        .to(messages[1], { autoAlpha: 0, duration: 0.16, ease: "power1.in", y: -2 }, "+=0.9")
        .call(() => setActiveMessage(2))
        .to(messages[2], { autoAlpha: 1, duration: 0.16, y: 0 }, ">")
        .to(messages[2], { autoAlpha: 0, duration: 0.16, ease: "power1.in", y: -2 }, "+=0.9")
        .call(() => setActiveMessage(0))
        .to(messages[0], { autoAlpha: 1, duration: 0.16, y: 0 }, ">")

      return () => {
        entrance.kill()
        statusTimeline.kill()
      }
    }

    if (state === "awaiting-destination") {
      gsap.set(overlay, { autoAlpha: 1, y: 0 })
      const activeMessageIndex = Number(overlay.dataset.activeHandoffStatus ?? "0")
      const activeMessage = messages[activeMessageIndex] ?? messages[0]
      gsap.set(messages, { autoAlpha: 0, y: 0 })
      gsap.set(activeMessage, { autoAlpha: 1, y: 0 })
      return undefined
    }

    if (state === "exiting") {
      if (reducedMotion) {
        gsap.set(overlay, { autoAlpha: 0, y: 0 })
        onExitComplete()
        return undefined
      }

      const tween = gsap.to(overlay, {
        autoAlpha: 0,
        duration: 0.28,
        ease: "power2.inOut",
        onComplete: onExitComplete,
        y: -4,
      })

      return () => {
        tween.kill()
      }
    }

    return undefined
  }, [onExitComplete, state])

  return overlayRef
}

export { useLoginHandoffAnimation }
