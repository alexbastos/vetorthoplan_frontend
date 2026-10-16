"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { useCallback, useEffect, useRef, useState, type RefObject } from "react"

import type { PublicNoticesFeatureId } from "../../components/public-notices/types"

gsap.registerPlugin(useGSAP)

const AUTO_PLAY_DURATION_SECONDS = 5
const AUTO_PLAY_DURATION_MILLISECONDS = AUTO_PLAY_DURATION_SECONDS * 1000

function usePublicNoticesTabsAutoplay(
  scope: RefObject<HTMLDivElement | null>,
  featureIds: readonly PublicNoticesFeatureId[],
) {
  const [activeTab, setActiveTab] = useState(0)
  const [isAutoPlay, setIsAutoPlay] = useState(true)
  const intervalRef = useRef<number | null>(null)
  const featureOrder = featureIds.join("|")
  const activeFeatureId = featureIds[activeTab] ?? featureIds[0] ?? "realtime"

  const clearAutoPlayInterval = useCallback(() => {
    if (intervalRef.current === null) {
      return
    }

    window.clearInterval(intervalRef.current)
    intervalRef.current = null
  }, [])

  const stopAutoPlay = useCallback(() => {
    clearAutoPlayInterval()
    setIsAutoPlay(false)
  }, [clearAutoPlayInterval])

  const handleValueChange = useCallback((value: string) => {
    const nextTab = featureIds.indexOf(value as PublicNoticesFeatureId)

    if (nextTab < 0) {
      return
    }

    stopAutoPlay()
    setActiveTab(nextTab)
  }, [featureIds, stopAutoPlay])

  useEffect(() => {
    clearAutoPlayInterval()

    if (!isAutoPlay || featureIds.length === 0) {
      return undefined
    }

    intervalRef.current = window.setInterval(() => {
      setActiveTab((currentTab) => (currentTab + 1) % featureIds.length)
    }, AUTO_PLAY_DURATION_MILLISECONDS)

    return clearAutoPlayInterval
  }, [clearAutoPlayInterval, featureIds, isAutoPlay])

  useGSAP(
    () => {
      const root = scope.current

      if (!root || featureIds.length === 0) {
        return undefined
      }

      const progressBars = root.querySelectorAll<HTMLElement>("[data-public-notices-tab-progress]")
      const activeProgressBar = root.querySelector<HTMLElement>(
        `[data-public-notices-tab-progress="${activeFeatureId}"]`,
      )

      gsap.set(progressBars, { autoAlpha: 0, yPercent: -100 })

      if (!activeProgressBar) {
        return undefined
      }

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

      if (!isAutoPlay || prefersReducedMotion) {
        gsap.set(activeProgressBar, { autoAlpha: 1, yPercent: 0 })
        return undefined
      }

      gsap.fromTo(
        activeProgressBar,
        { autoAlpha: 1, yPercent: -100 },
        {
          duration: AUTO_PLAY_DURATION_SECONDS,
          ease: "none",
          overwrite: true,
          yPercent: 0,
        },
      )

      return undefined
    },
    {
      dependencies: [activeTab, featureOrder, isAutoPlay],
      revertOnUpdate: true,
      scope,
    },
  )

  return {
    activeFeatureId,
    handleValueChange,
    stopAutoPlay,
  }
}

export { AUTO_PLAY_DURATION_SECONDS, usePublicNoticesTabsAutoplay }
