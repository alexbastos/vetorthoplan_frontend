"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { useEffect, useRef, type RefObject } from "react"

gsap.registerPlugin(useGSAP)

const SOURCE_CYCLE_DURATION = 3
const SOURCE_TRANSITION_DURATION = 0.6

type AuthSourceCycleRefs = {
  details: RefObject<HTMLDivElement[]>
  icons: RefObject<HTMLDivElement[]>
  progress: RefObject<HTMLSpanElement[]>
  scope: RefObject<HTMLDivElement | null>
  tile: RefObject<HTMLDivElement | null>
}

function useAuthSourceCycle({ details, icons, progress, scope, tile }: AuthSourceCycleRefs, isEnabled: boolean) {
  const timelineRef = useRef<gsap.core.Timeline | null>(null)

  useEffect(() => {
    const syncVisibility = () => {
      if (document.visibilityState === "hidden") {
        timelineRef.current?.pause()
        return
      }

      timelineRef.current?.resume()
    }

    document.addEventListener("visibilitychange", syncVisibility)
    return () => document.removeEventListener("visibilitychange", syncVisibility)
  }, [])

  useGSAP(
    () => {
      if (!isEnabled) {
        return
      }

      const media = gsap.matchMedia()

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const iconElements = icons.current
        const detailsElements = details.current
        const progressElements = progress.current
        const timeline = gsap.timeline({ repeat: -1 })
        timelineRef.current = timeline

        if (document.visibilityState === "hidden") {
          timeline.pause()
        }

        gsap.set([...iconElements.slice(1), ...detailsElements.slice(1)], { autoAlpha: 0 })
        gsap.set(progressElements, { scaleX: 0 })
        gsap.set([tile.current, iconElements[0], detailsElements[0]], { autoAlpha: 1 })

        iconElements.forEach((_, index) => {
          const nextIndex = (index + 1) % iconElements.length

          timeline
            .set(progressElements[index], { scaleX: 0 })
            .to(progressElements[index], { duration: SOURCE_CYCLE_DURATION, ease: "none", scaleX: 1 })
            .to(
              [iconElements[index], detailsElements[index]],
              { autoAlpha: 0, duration: SOURCE_TRANSITION_DURATION, ease: "power2.inOut" },
              `>-${SOURCE_TRANSITION_DURATION}`,
            )
            .to(
              [iconElements[nextIndex], detailsElements[nextIndex]],
              { autoAlpha: 1, duration: SOURCE_TRANSITION_DURATION, ease: "power2.out" },
              "<",
            )
        })

        return () => {
          timeline.kill()
          if (timelineRef.current === timeline) {
            timelineRef.current = null
          }
        }
      })

      return () => media.revert()
    },
    { dependencies: [isEnabled], scope },
  )
}

export { useAuthSourceCycle }
