"use client"

import gsap from "gsap"
import { useEffect, useRef, useState } from "react"

import type { LoginHandoffPhase } from "./login-handoff-provider"

type UseLoginHandoffAnimationOptions = {
  messageCount: number
  onDismissComplete: () => void
  onLoaderExitComplete: () => void
  state: LoginHandoffPhase
}

function useLoginHandoffAnimation({
  messageCount,
  onDismissComplete,
  onLoaderExitComplete,
  state,
}: UseLoginHandoffAnimationOptions) {
  const overlayRef = useRef<HTMLElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const messageRef = useRef<HTMLParagraphElement | null>(null)
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    if (state === "idle") {
      setMessageIndex(0)
    }
  }, [state])

  useEffect(() => {
    const message = messageRef.current

    if (!message) {
      return undefined
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (state !== "authenticating" || reducedMotion || messageCount < 2) {
      gsap.set(message, { autoAlpha: 1, y: 0 })
      return undefined
    }

    const isLastMessage = messageIndex === messageCount - 1
    const messageAnimation = message.animate(
      isLastMessage
        ? [
            { easing: "cubic-bezier(0.22, 1, 0.36, 1)", offset: 0, opacity: 0, transform: "translateY(2px)" },
            { easing: "cubic-bezier(0.22, 1, 0.36, 1)", offset: 1, opacity: 1, transform: "translateY(0)" },
          ]
        : [
            { easing: "cubic-bezier(0.22, 1, 0.36, 1)", offset: 0, opacity: 0, transform: "translateY(2px)" },
            { easing: "cubic-bezier(0.22, 1, 0.36, 1)", offset: 0.107, opacity: 1, transform: "translateY(0)" },
            { easing: "cubic-bezier(0.7, 0, 0.84, 0)", offset: 0.893, opacity: 1, transform: "translateY(0)" },
            { easing: "cubic-bezier(0.22, 1, 0.36, 1)", offset: 1, opacity: 0, transform: "translateY(-2px)" },
          ],
      { duration: isLastMessage ? 160 : 1500, fill: "both" },
    )

    if (!isLastMessage) {
      void messageAnimation.finished
        .then(() => {
          setMessageIndex((currentIndex) => (
            currentIndex === messageIndex ? currentIndex + 1 : currentIndex
          ))
        })
        .catch(() => undefined)
    }

    return () => {
      messageAnimation.cancel()
    }
  }, [messageCount, messageIndex, state])

  useEffect(() => {
    const overlay = overlayRef.current
    const content = contentRef.current
    const message = messageRef.current

    if (!overlay || !content || !message) {
      return undefined
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (state === "authenticating") {
      if (reducedMotion) {
        gsap.set(overlay, { autoAlpha: 1, y: 0 })
        gsap.set(content, { autoAlpha: 1, y: 0 })
        gsap.set(message, { autoAlpha: 1, y: 0 })
        return undefined
      }

      gsap.set(content, { autoAlpha: 1, y: 0 })
      const entrance = gsap.fromTo(overlay, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 })

      return () => entrance.kill()
    }

    if (state === "awaiting-destination") {
      gsap.set(overlay, { autoAlpha: 1, y: 0 })
      gsap.set(content, { autoAlpha: 1, y: 0 })
      gsap.set(message, { autoAlpha: 1, y: 0 })
      return undefined
    }

    if (state === "exiting-loader") {
      if (reducedMotion) {
        gsap.set(content, { autoAlpha: 0, y: 0 })
        onLoaderExitComplete()
        return undefined
      }

      const tween = gsap.to(content, {
        autoAlpha: 0,
        duration: 0.3,
        ease: "power2.in",
        onComplete: onLoaderExitComplete,
        y: -4,
      })

      return () => {
        tween.kill()
      }
    }

    if (state === "entering-destination") {
      gsap.set(content, { autoAlpha: 0, y: -4 })

      if (reducedMotion) {
        gsap.set(overlay, { autoAlpha: 0, y: 0 })
        return undefined
      }

      const tween = gsap.to(overlay, {
        autoAlpha: 0,
        duration: 0.1,
        ease: "power1.out",
        y: 0,
      })

      return () => tween.kill()
    }

    if (state === "dismissing") {
      if (reducedMotion) {
        gsap.set(overlay, { autoAlpha: 0, y: 0 })
        onDismissComplete()
        return undefined
      }

      const tween = gsap.to(overlay, {
        autoAlpha: 0,
        duration: 0.28,
        ease: "power2.inOut",
        onComplete: onDismissComplete,
        y: -4,
      })

      return () => tween.kill()
    }

    return undefined
  }, [onDismissComplete, onLoaderExitComplete, state])

  return { contentRef, messageIndex, messageRef, overlayRef }
}

export { useLoginHandoffAnimation }
