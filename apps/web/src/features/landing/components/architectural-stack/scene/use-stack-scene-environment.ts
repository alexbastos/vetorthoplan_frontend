import { useEffect, useState, type RefObject } from "react"

import type { StackScenePalette } from "./stack-scene-config"

function readPalette(root: HTMLElement): StackScenePalette {
  const style = getComputedStyle(root)
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 1
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Cannot resolve architectural stack colors.")
  const probe = document.createElement("span")
  probe.style.display = "none"
  root.appendChild(probe)

  const color = (token: string) => {
    // A computed CSS property resolves nested variables before conversion to sRGB.
    probe.style.color = `var(${token})`
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = getComputedStyle(probe).color
    context.fillRect(0, 0, 1, 1)
    const [red, green, blue] = context.getImageData(0, 0, 1, 1).data
    return `rgb(${red},${green},${blue})`
  }

  try {
    return {
      surface: color("--color-surface-card"),
      inverse: color("--color-surface-inverse"),
      text: color("--color-text-primary"),
      secondary: color("--color-text-secondary"),
      accent: color("--color-brand-secondary"),
      fontFamily: style.fontFamily,
    }
  } finally {
    probe.remove()
  }
}

function useStackSceneEnvironment(scope: RefObject<HTMLDivElement | null>) {
  const [eligible, setEligible] = useState(false)
  const [nearby, setNearby] = useState(false)
  const [visible, setVisible] = useState(false)
  const [fontsReady, setFontsReady] = useState(false)
  const [palette, setPalette] = useState<StackScenePalette | null>(null)

  useEffect(() => {
    const root = scope.current
    if (!root) return
    let disposed = false
    const media = window.matchMedia("(min-width: 1024px) and (min-height: 600px) and (prefers-reduced-motion: no-preference)")
    const updateEligibility = () => setEligible(media.matches)
    const updatePalette = () => {
      try {
        const nextPalette = readPalette(root)
        setPalette((current) => JSON.stringify(current) === JSON.stringify(nextPalette) ? current : nextPalette)
      } catch {
        setPalette(null)
      }
    }

    updateEligibility()
    updatePalette()
    media.addEventListener("change", updateEligibility)
    const themeObserver = new MutationObserver(updatePalette)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] })

    if (typeof IntersectionObserver === "undefined") {
      setNearby(true)
      setVisible(true)
    }
    const loadObserver = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([entry]) => {
        if (entry?.isIntersecting) {
          setNearby(true)
          loadObserver?.disconnect()
        }
      }, { rootMargin: "240px" })
      : null
    const visibilityObserver = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false))
      : null
    loadObserver?.observe(root)
    visibilityObserver?.observe(root)

    void document.fonts.ready.then(() => {
      if (!disposed) setFontsReady(true)
    })

    return () => {
      disposed = true
      media.removeEventListener("change", updateEligibility)
      themeObserver.disconnect()
      loadObserver?.disconnect()
      visibilityObserver?.disconnect()
    }
  }, [scope])

  return { enabled: eligible && nearby && fontsReady && palette !== null, visible, palette }
}

export { useStackSceneEnvironment }
