"use client"

import { useEffect, useRef, useState, type RefObject } from "react"

type StoryElement = HTMLElement | null

function useArchitecturalStackActiveStory(storyElementsRef: RefObject<StoryElement[]>) {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeIndexRef = useRef(0)

  useEffect(() => {
    let animationFrameId: number | null = null

    const updateActiveStory = () => {
      animationFrameId = null

      const viewportCenter = window.innerHeight / 2
      let closestIndex = 0
      let closestDistance = Number.POSITIVE_INFINITY

      storyElementsRef.current.forEach((element, index) => {
        if (!element) return

        const bounds = element.getBoundingClientRect()
        const elementCenter = bounds.top + bounds.height / 2
        const distance = Math.abs(elementCenter - viewportCenter)

        if (distance < closestDistance) {
          closestDistance = distance
          closestIndex = index
        }
      })

      if (activeIndexRef.current === closestIndex) return

      activeIndexRef.current = closestIndex
      setActiveIndex(closestIndex)
    }

    const scheduleUpdate = () => {
      if (animationFrameId !== null) return
      animationFrameId = window.requestAnimationFrame(updateActiveStory)
    }

    updateActiveStory()
    window.addEventListener("scroll", scheduleUpdate, { passive: true })
    window.addEventListener("resize", scheduleUpdate)

    return () => {
      window.removeEventListener("scroll", scheduleUpdate)
      window.removeEventListener("resize", scheduleUpdate)

      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId)
      }
    }
  }, [storyElementsRef])

  return activeIndex
}

export { useArchitecturalStackActiveStory }
