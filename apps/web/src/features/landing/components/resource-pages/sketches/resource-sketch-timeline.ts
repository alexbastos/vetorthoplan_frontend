import gsap from "gsap"
import { CustomEase } from "gsap/CustomEase"

gsap.registerPlugin(CustomEase)

// Reference data-t/data-d values describe positions within a short scene.
const sceneUnit = 3.6
const ease = CustomEase.create("resource-sketch-lens", ".23,1,.32,1")
type SketchElement = SVGElement & { dataset: DOMStringMap }

function revealAt(timeline: gsap.core.Timeline, element: SketchElement, at: number) {
  // The initial opacity is zero. Reveal only at the declared timestamp, including
  // round stroke caps and traveling points whose movement has not started yet.
  timeline.set(element, { opacity: 1 }, at)
}

function revealWidth(root: HTMLElement, element: SketchElement) {
  const maximum = Number(element.dataset.w ?? element.getAttribute("width") ?? 74)
  const text = element.dataset.text
    ? root.querySelector<SVGTextElement>(`[data-sketch-text="${element.dataset.text}"]`)
    : null
  return text ? Math.min(maximum, text.getComputedTextLength() + 2) : maximum
}

function buildResourceSketchTimeline(root: HTMLElement): gsap.core.Timeline {
  const timeline = gsap.timeline({ paused: true, defaults: { ease } })
  // Measure the source geometry before applying any SVG transforms or clipping.
  const elements = Array.from(root.querySelectorAll<SketchElement>("[data-a]")).map(element => {
    const path = element.dataset.path ? root.querySelector<SVGPathElement>(element.dataset.path) : null
    const pathLength = path?.getTotalLength() ?? 0
    // Explicit polygon vertices augment the normal samples, so the cursor lands
    // on each clicked point rather than interpolating across a sharp corner.
    const stops = (element.dataset.pathStops ?? "").split(",").map(Number)
      .filter(value => Number.isFinite(value) && value > 0 && value < 1)
    const pathProgress = path ? Array.from(new Set([
      ...Array.from({ length: 33 }, (_, index) => index / 32), ...stops,
    ])).sort((a, b) => a - b) : []
    return {
      element,
      length: element.dataset.a === "draw" ? (element as SVGGeometryElement).getTotalLength() : 0,
      width: ["wipe", "caret"].includes(element.dataset.a ?? "") ? revealWidth(root, element) : 0,
      points: path ? pathProgress.map(progress => ({ progress, point: path.getPointAtLength(pathLength * progress) })) : [],
    }
  })

  elements.forEach(({ element, length, width, points }) => {
    const at = Number(element.dataset.t ?? 0) * sceneUnit
    const duration = Number(element.dataset.d ?? .06) * sceneUnit
    gsap.set(element, { opacity: ["click", "wipe", "rotate"].includes(element.dataset.a ?? "") ? 1 : 0 })

    switch (element.dataset.a) {
      case "draw": {
        gsap.set(element, { strokeDasharray: `${length} ${length}`, strokeDashoffset: length })
        revealAt(timeline, element, at)
        timeline.to(element, { strokeDashoffset: 0, duration, ease: element.dataset.ease ?? ease }, at)
        break
      }
      case "fade":
        timeline.to(element, { opacity: 1, duration }, at)
        break
      case "pop":
        gsap.set(element, { scale: .75, transformOrigin: "center center" })
        timeline.to(element, { opacity: 1, scale: 1, duration }, at)
        break
      case "slide":
        gsap.set(element, { x: Number(element.dataset.sx ?? -8) })
        timeline.to(element, { opacity: 1, x: 0, duration }, at)
        break
      case "rotate": {
        // Keep the pivot in the group's local SVG space. CSS/SVG origin
        // conversion can offset a group that already has its final transform.
        const origin = element.dataset.origin ?? "0 0"
        gsap.set(element, { attr: { transform: `rotate(${Number(element.dataset.from ?? 0)} ${origin})` } })
        timeline.to(element, {
          attr: { transform: `rotate(${Number(element.dataset.to ?? 0)} ${origin})` },
          duration, ease: element.dataset.ease ?? ease,
        }, at)
        break
      }
      case "wipe":
        gsap.set(element, { attr: { width: 0 } })
        timeline.to(element, { attr: { width }, duration, ease: "none" }, at)
        break
      case "caret":
        gsap.set(element, { x: 0 })
        revealAt(timeline, element, at)
        timeline.to(element, { x: width, duration, ease: "none" }, at)
        break
      case "click":
        gsap.set(element, { scale: 1, transformOrigin: "center center" })
        timeline.to(element, { scale: .94, duration: duration / 2 }, at)
          .to(element, { scale: 1, duration: duration / 2 }, at + duration / 2)
        break
      case "follow": {
        if (!points.length) break
        gsap.set(element, { x: points[0].point.x, y: points[0].point.y })
        revealAt(timeline, element, at)
        timeline.to(element, {
          keyframes: points.slice(1).map(({ point, progress }, index) => ({
            x: point.x, y: point.y, duration: duration * (progress - points[index].progress), ease: "none",
          })),
          duration, ease: "none",
        }, at)
        break
      }
    }

    if (element.dataset.out !== undefined) {
      timeline.to(element, { opacity: Number(element.dataset.outO ?? 0), duration: .06 * sceneUnit },
        Number(element.dataset.out) * sceneUnit)
    }
  })

  return timeline
}

export { buildResourceSketchTimeline }
