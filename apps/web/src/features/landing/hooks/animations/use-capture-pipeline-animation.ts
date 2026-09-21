"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { useCallback, useLayoutEffect, useRef, type RefObject } from "react"

gsap.registerPlugin(useGSAP)

function useCapturePipelineAnimation(
  scope: RefObject<HTMLDivElement | null>,
  isActive: boolean,
) {
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const isActiveRef = useRef(isActive)
  const wasActiveRef = useRef(isActive)
  const isInViewRef = useRef(true)

  const syncPlayback = useCallback(() => {
    const timeline = timelineRef.current

    if (!timeline) {
      return
    }

    const shouldPlay = isActiveRef.current
      && isInViewRef.current
      && document.visibilityState === "visible"

    if (shouldPlay) {
      timeline.resume()
    } else {
      timeline.pause()
    }
  }, [])

  useLayoutEffect(() => {
    const becameActive = isActive && !wasActiveRef.current

    isActiveRef.current = isActive
    wasActiveRef.current = isActive

    if (becameActive && timelineRef.current) {
      timelineRef.current.restart()
      syncPlayback()
      return
    }

    syncPlayback()
  }, [isActive, syncPlayback])

  useGSAP(
    () => {
      const root = scope.current

      if (!root) {
        return undefined
      }

      const featuredCard = root.querySelector<HTMLElement>("[data-pipeline-featured-card]")
      const featuredCardItems = gsap.utils.toArray<HTMLElement>("[data-pipeline-featured-card-item]", root)
      const loadingSpinners = gsap.utils.toArray<HTMLElement>("[data-pipeline-loading-spinner]", root)
      const progressTracks = gsap.utils.toArray<HTMLElement>("[data-pipeline-progress-track]", root)
      const progressFills = gsap.utils.toArray<HTMLElement>("[data-pipeline-progress-fill]", root)
      const statusGroups = [0, 1, 2].map((statusIndex) => (
        gsap.utils.toArray<HTMLElement>(`[data-pipeline-card-status="${statusIndex}"]`, root)
      ))
      const statuses = statusGroups.flat()
      const markers = gsap.utils.toArray<HTMLElement>("[data-pipeline-stage-marker]", root)
      const stageLabels = gsap.utils.toArray<HTMLElement>("[data-pipeline-stage-label]", root)
      const stageColumns = gsap.utils.toArray<HTMLElement>("[data-pipeline-stage-column]", root)

      if (
        !featuredCard
        || featuredCardItems.length < 1
        || loadingSpinners.length !== featuredCardItems.length
        || progressTracks.length < 2
        || progressFills.length < 2
        || statusGroups.some((group) => group.length !== featuredCardItems.length)
        || markers.length < 3
        || stageLabels.length < 3
        || stageColumns.length < 3
      ) {
        return undefined
      }

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      const inactiveMarkerColor = "var(--color-border-default)"
      const activeMarkerColor = "var(--color-feedback-success)"
      let activeOpportunityIndex = 0
      const getStageOffset = (stageIndex: number) => (
        (stageColumns[stageIndex]?.offsetLeft ?? 0) - (stageColumns[0]?.offsetLeft ?? 0)
      )
      const getMarkerCenter = (marker: HTMLElement) => {
        const rect = marker.getBoundingClientRect()

        return rect.left + (rect.width / 2)
      }
      const syncTrackGeometry = () => {
        const trackParent = progressTracks[0].offsetParent

        if (!(trackParent instanceof HTMLElement)) {
          return
        }

        const parentRect = trackParent.getBoundingClientRect()
        const trackGap = 8

        progressTracks.forEach((track, index) => {
          const sourceLabelRect = stageLabels[index].getBoundingClientRect()
          const trackStart = sourceLabelRect.right + trackGap - parentRect.left
          const trackEnd = getMarkerCenter(markers[index + 1]) - parentRect.left

          gsap.set(track, {
            left: trackStart,
            width: Math.max(0, trackEnd - trackStart),
          })
        })
      }

      const setStage = (stageIndex: number) => {
        gsap.set(markers, {
          backgroundColor: inactiveMarkerColor,
          scale: 0.78,
        })
        gsap.set(markers[stageIndex], {
          backgroundColor: activeMarkerColor,
          scale: 1,
        })
      }

      const setStatus = (statusIndex: number) => {
        gsap.set(statuses, { autoAlpha: 0 })
        gsap.set(statusGroups[statusIndex], { autoAlpha: 1 })
      }

      const showOpportunity = (opportunityIndex: number) => {
        gsap.set(featuredCardItems, { autoAlpha: 0 })
        gsap.set(featuredCardItems[opportunityIndex], { autoAlpha: 1 })
      }

      const showNextOpportunity = () => {
        activeOpportunityIndex = (activeOpportunityIndex + 1) % featuredCardItems.length
        showOpportunity(activeOpportunityIndex)
      }

      if (prefersReducedMotion) {
        const syncReducedLayout = () => {
          syncTrackGeometry()
          gsap.set(featuredCard, { x: getStageOffset(2) })
        }

        syncReducedLayout()
        gsap.set(featuredCard, { autoAlpha: 1, y: 0 })
        gsap.set(loadingSpinners, { rotation: 0, transformOrigin: "center" })
        gsap.set(progressFills, { scaleX: 1, transformOrigin: "left center" })
        showOpportunity(0)
        setStage(2)
        setStatus(2)

        const resizeObserver = new ResizeObserver(syncReducedLayout)
        stageColumns.forEach((column) => resizeObserver.observe(column))
        stageLabels.forEach((label) => resizeObserver.observe(label))

        return () => resizeObserver.disconnect()
      }

      syncTrackGeometry()
      gsap.set(featuredCard, { autoAlpha: 1, x: 0, y: 0 })
      gsap.set(loadingSpinners, { rotation: 0, transformOrigin: "center" })
      gsap.set(progressFills, { scaleX: 0, transformOrigin: "left center" })
      showOpportunity(0)
      setStage(0)
      setStatus(0)

      const timeline = gsap.timeline({
        paused: true,
        repeat: -1,
        repeatDelay: 0.35,
        repeatRefresh: true,
      })

      timeline
        .to({}, { duration: 0.55 })
        .add("toPreparation")
        .to(featuredCard, {
          duration: 0.72,
          ease: "power2.inOut",
          x: () => getStageOffset(1),
        }, "toPreparation")
        .to(progressFills[0], {
          duration: 0.72,
          ease: "power2.inOut",
          scaleX: 1,
        }, "toPreparation")
        .set(markers[0], {
          backgroundColor: inactiveMarkerColor,
          scale: 0.78,
        })
        .set(markers[1], {
          backgroundColor: activeMarkerColor,
          scale: 0.78,
        }, "<")
        .to(markers[1], {
          duration: 0.16,
          ease: "power1.out",
          scale: 1,
        })
        .to(statusGroups[0], { autoAlpha: 0, duration: 0.14 }, "<")
        .to(statusGroups[1], { autoAlpha: 1, duration: 0.2 }, "<0.08")
        .add("preparingSpin", "+=0.18")
        .to(loadingSpinners, {
          duration: 1.94,
          ease: "none",
          rotation: 720,
        }, "preparingSpin")
        .add("toReady", "preparingSpin+=1.22")
        .to(featuredCard, {
          duration: 0.72,
          ease: "power2.inOut",
          x: () => getStageOffset(2),
        }, "toReady")
        .to(progressFills[1], {
          duration: 0.72,
          ease: "power2.inOut",
          scaleX: 1,
        }, "toReady")
        .set(markers[1], {
          backgroundColor: inactiveMarkerColor,
          scale: 0.78,
        })
        .set(markers[2], {
          backgroundColor: "var(--color-feedback-success)",
          scale: 0.78,
        }, "<")
        .to(markers[2], {
          duration: 0.16,
          ease: "power1.out",
          scale: 1,
        })
        .to(statusGroups[1], { autoAlpha: 0, duration: 0.14 }, "<")
        .to(statusGroups[2], { autoAlpha: 1, duration: 0.2 }, "<0.08")
        .to({}, { duration: 1.45 })
        .to(featuredCard, {
          autoAlpha: 0,
          duration: 0.22,
          ease: "power1.in",
          y: -6,
        })
        .set(featuredCard, { x: 0, y: 6 })
        .set(loadingSpinners, { rotation: 0 })
        .set(progressFills, { scaleX: 0 })
        .set(statuses, { autoAlpha: 0 })
        .set(statusGroups[0], { autoAlpha: 1 })
        .set(markers, { backgroundColor: inactiveMarkerColor, scale: 0.78 })
        .set(markers[0], { backgroundColor: activeMarkerColor, scale: 1 })
        .call(showNextOpportunity)
        .to(featuredCard, {
          autoAlpha: 1,
          duration: 0.28,
          ease: "power1.out",
          y: 0,
        })

      timelineRef.current = timeline

      const intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          isInViewRef.current = entry?.isIntersecting ?? false
          syncPlayback()
        },
        { threshold: 0.15 },
      )
      const resizeObserver = new ResizeObserver(() => {
        syncTrackGeometry()
        timeline.invalidate()
      })

      intersectionObserver.observe(root)
      stageColumns.forEach((column) => resizeObserver.observe(column))
      stageLabels.forEach((label) => resizeObserver.observe(label))
      document.addEventListener("visibilitychange", syncPlayback)
      syncPlayback()

      return () => {
        intersectionObserver.disconnect()
        resizeObserver.disconnect()
        document.removeEventListener("visibilitychange", syncPlayback)
        timeline.kill()
        timelineRef.current = null
      }
    },
    { scope },
  )
}

export { useCapturePipelineAnimation }
