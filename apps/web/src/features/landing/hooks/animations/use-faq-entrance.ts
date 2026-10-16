import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import type { RefObject } from "react"

gsap.registerPlugin(useGSAP, ScrollTrigger)

function useFaqEntrance(scope: RefObject<HTMLDivElement | null>) {
  useGSAP(() => {
    const root = scope.current
    if (!root) return

    const intro = root.querySelector<HTMLElement>("[data-landing-faq-intro]")
    const questions = gsap.utils.toArray<HTMLElement>("[data-landing-faq-question]", root)
    const decorations = gsap.utils.toArray<SVGSVGElement>("[data-landing-faq-decoration-volume]", root)
    if (!intro || questions.length === 0) return

    const media = gsap.matchMedia()
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const timeline = gsap.timeline({
        defaults: { ease: "power2.out", overwrite: "auto" },
        scrollTrigger: {
          trigger: root,
          start: "top 75%",
          once: true,
        },
      })

      timeline.fromTo(intro, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.45 }, 0)
      decorations.forEach((decoration, index) => {
        timeline.fromTo(
          decoration,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.45 },
          index * 0.1,
        )
      })
      timeline.fromTo(
        questions,
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.08 },
        0.3,
      )
    })

    media.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set([intro, ...questions, ...decorations], { clearProps: "all" })
    })

    return () => media.revert()
  }, { scope, dependencies: [scope], revertOnUpdate: true })
}

export { useFaqEntrance }
