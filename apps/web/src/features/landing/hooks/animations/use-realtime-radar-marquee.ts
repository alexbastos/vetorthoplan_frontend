"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { useCallback, useEffect, useRef, type RefObject } from "react"

gsap.registerPlugin(useGSAP)

const MARQUEE_DURATION_SECONDS = 36

function useRealtimeRadarMarquee(
  scope: RefObject<HTMLDivElement | null>,
  isActive: boolean,
) {
  const animationsRef = useRef<gsap.core.Animation[]>([])
  const isActiveRef = useRef(isActive)
  const isInViewRef = useRef(true)

  const syncPlayback = useCallback(() => {
    const shouldPlay = isActiveRef.current
      && isInViewRef.current
      && document.visibilityState === "visible"

    animationsRef.current.forEach((animation) => {
      if (shouldPlay) {
        animation.resume()
      } else {
        animation.pause()
      }
    })
  }, [])

  useEffect(() => {
    isActiveRef.current = isActive
    syncPlayback()
  }, [isActive, syncPlayback])

  useGSAP(
    () => {
      const root = scope.current

      if (!root) {
        return undefined
      }

      const tracks = gsap.utils.toArray<HTMLElement>("[data-radar-marquee-track]", root)
      const scannerPulse = root.querySelector<HTMLElement>("[data-radar-scanner-pulse]")
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

      if (prefersReducedMotion) {
        gsap.set(tracks, { yPercent: 0 })
        gsap.set(scannerPulse, { autoAlpha: 1, scaleX: 1 })
        return undefined
      }

      const marqueeTweens = tracks.map((track, index) => {
        const movesDown = track.dataset.radarMarqueeDirection === "down"
        const tween = gsap.fromTo(
          track,
          { yPercent: movesDown ? -50 : 0 },
          {
            duration: MARQUEE_DURATION_SECONDS,
            ease: "none",
            repeat: -1,
            yPercent: movesDown ? 0 : -50,
          },
        )

        if (index > 0) {
          tween.progress(0.5)
        }

        return tween
      })

      const scannerTween = scannerPulse
        ? gsap.fromTo(
            scannerPulse,
            { autoAlpha: 0.2, scaleX: 0.84 },
            {
              autoAlpha: 0.55,
              duration: 1.35,
              ease: "sine.inOut",
              repeat: -1,
              scaleX: 1,
              transformOrigin: "center",
              yoyo: true,
            },
          )
        : null

      const animations: gsap.core.Animation[] = [...marqueeTweens]
      if (scannerTween) {
        animations.push(scannerTween)
      }

      animationsRef.current = animations

      const observer = new IntersectionObserver(
        ([entry]) => {
          isInViewRef.current = entry?.isIntersecting ?? false
          syncPlayback()
        },
        { threshold: 0.15 },
      )

      observer.observe(root)
      document.addEventListener("visibilitychange", syncPlayback)
      syncPlayback()

      return () => {
        observer.disconnect()
        document.removeEventListener("visibilitychange", syncPlayback)
        animations.forEach((animation) => animation.kill())
        animationsRef.current = []
      }
    },
    {
      dependencies: [],
      scope,
    },
  )
}

export { useRealtimeRadarMarquee }
