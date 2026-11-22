"use client"

import { useLayoutEffect, useState, type RefObject } from "react"

import { heroRadiograph } from "./hero-product-measurements"
import type { HeroMotionValues, HeroSurfaceValues } from "./hero-product-motion-values"

// Only measures layout. React owns presentation, and Motion owns animated values.
function useHeroProductGeometry(rootRef: RefObject<HTMLDivElement | null>, values: HeroMotionValues) {
  const [imageReady, setImageReady] = useState(false)
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const find = (selector: string) => root.querySelector<HTMLElement>(selector)
    const dashboard = find("[data-hero-dashboard]"), radiograph = find("[data-hero-radiograph]")
    const cases = find("[data-hero-cases-scene]"), viewer = find("[data-hero-viewer-scene]"), report = find("[data-hero-report]")
    const menu = find("[data-hero-tools-panel]"), confirm = find("[data-hero-confirm-markings]")
    const tool = find('[data-hero-tool="tpa"]'), openCase = find("[data-hero-open-case]"), conclude = find("[data-hero-conclude]")
    const measurements = find('[data-hero-nav="measurements"]'), reportRow = find('[data-hero-nav="report"]')
    if (!dashboard || !radiograph || !cases || !viewer || !report || !tool || !openCase || !conclude || !confirm || !measurements || !reportRow) return
    let disposed = false
    const measure = () => {
      const frame = dashboard.getBoundingClientRect(), scale = frame.width / dashboard.offsetWidth
      if (!scale) return
      const center = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect()
        return { x: (rect.left + rect.width / 2 - frame.left) / scale, y: (rect.top + rect.height / 2 - frame.top) / scale }
      }
      const atRest = (element: HTMLElement, scene: HTMLElement, motion: HeroSurfaceValues) => {
        const origin = center(scene), point = center(element), ownScale = motion.scale.get()
        return { x: origin.x + (point.x - origin.x) / ownScale,
          y: origin.y - motion.y.get() + (point.y - origin.y) / ownScale }
      }
      const toolTarget = atRest(tool, viewer, values.scenes.viewer)
      toolTarget.y -= values.menu.y.get()
      const confirmTarget = atRest(confirm, viewer, values.scenes.viewer)
      confirmTarget.y -= values.save.y.get()
      const imageCenter = atRest(radiograph, viewer, values.scenes.viewer), box = radiograph.getBoundingClientRect()
      const fit = Math.min(box.width / (scale * values.scenes.viewer.scale.get() * heroRadiograph.widthPx),
        box.height / (scale * values.scenes.viewer.scale.get() * heroRadiograph.heightPx))
      const width = fit * heroRadiograph.widthPx, height = fit * heroRadiograph.heightPx
      values.geometry.set({ targets: { start: { x: dashboard.offsetWidth * 0.58, y: dashboard.offsetHeight * 0.48 },
        openCase: atRest(openCase, cases, values.scenes.cases), measurements: center(measurements),
        approach: { x: toolTarget.x - 42, y: toolTarget.y - 46 }, tool: toolTarget, confirm: confirmTarget,
        report: center(reportRow), conclude: atRest(conclude, report, values.scenes.report) },
      image: { x: imageCenter.x - width / 2, y: imageCenter.y - height / 2, width, height } })
    }
    const image = radiograph.querySelector("img")
    const loaded = () => { if (!disposed) { measure(); setImageReady(true) } }
    measure()
    if (!image || image.complete) loaded()
    image?.addEventListener("load", loaded)
    image?.addEventListener("error", loaded)
    const resize = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure)
    for (const target of [root, dashboard, radiograph, menu, confirm, openCase, conclude]) if (target) resize?.observe(target)
    if (!resize) window.addEventListener("resize", measure)
    void document.fonts.ready.then(() => { if (!disposed) measure() })
    return () => {
      disposed = true
      resize?.disconnect()
      window.removeEventListener("resize", measure)
      image?.removeEventListener("load", loaded)
      image?.removeEventListener("error", loaded)
    }
  }, [rootRef, values])
  return imageReady
}

export { useHeroProductGeometry }
