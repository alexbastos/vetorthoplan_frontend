"use client"

import { createContext, useContext, useRef, useState, type ReactNode } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

import { addResourceHeadingEntrance } from "../resource-pages/animations/resource-heading-entrance"
import styles from "./hero-section.module.css"

gsap.registerPlugin(useGSAP, ScrollTrigger)

// Consumers outside this entrance boundary keep their existing playback behavior.
const HeroEntranceContext = createContext(true)
const useHeroEntranceReady = () => useContext(HeroEntranceContext)

function HeroEntrance({ children, className, intro }: { children: ReactNode; className: string; intro?: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null)
  const completed = useRef(false)
  const [ready, setReady] = useState(false)

  useGSAP(() => {
    const root = scope.current
    if (!root) return
    const media = gsap.matchMedia()

    media.add({ motion: "(prefers-reduced-motion: no-preference)", reduced: "(prefers-reduced-motion: reduce)" }, (context) => {
      if (context.conditions?.reduced || completed.current) {
        completed.current = true
        root.dataset.heroEntrance = "complete"
        setReady(true)
        return
      }

      const nav = root.querySelectorAll<HTMLElement>("[data-hero-header-item]")
      const title = root.querySelector<HTMLElement>("[data-hero-entrance-title]")
      const icons = root.querySelectorAll<HTMLElement>("[data-hero-entrance-icon]")
      const description = root.querySelector<HTMLElement>("[data-hero-entrance-description]")
      const action = root.querySelector<HTMLElement>("[data-hero-entrance-action]")
      const frame = root.querySelector<HTMLElement>("[data-hero-entrance-frame]")
      const introSection = root.querySelector<HTMLElement>("[data-hero-intro]")
      const introItems = root.querySelectorAll<HTMLElement>("[data-hero-intro-item]")
      const copy = [description, action].filter((element): element is HTMLElement => Boolean(element))

      gsap.set(nav, { autoAlpha: 0, y: -8 })
      gsap.set(icons, { autoAlpha: 0, y: ".18em" })
      gsap.set(copy, { autoAlpha: 0, y: 12 })
      if (frame) gsap.set(frame, { autoAlpha: 0, y: 18 })
      gsap.set(introItems, { autoAlpha: 0, y: 12 })

      // Join the final entrance cue when visible, or wait for the mobile viewport.
      let introCueReached = false
      let introInView = false
      const introTimeline = gsap.timeline({ paused: true })
      introTimeline.to(introItems, {
        autoAlpha: 1, y: 0, duration: .65, stagger: .12, ease: "power2.out",
        clearProps: "opacity,visibility,transform",
      })
      const playIntro = () => { if (introCueReached && introInView) introTimeline.play() }
      if (introSection) ScrollTrigger.create({
        trigger: introSection, start: "top 92%", once: true,
        onEnter: () => { introInView = true; playIntro() },
      })

      const timeline = gsap.timeline({
        defaults: { ease: "power2.out", clearProps: "opacity,visibility,transform" },
        scrollTrigger: { trigger: root.querySelector("section"), start: "top 85%", once: true },
        onComplete: () => {
          completed.current = true
          root.dataset.heroEntrance = "complete"
          setReady(true)
        },
      })

      timeline.to(nav, { autoAlpha: 1, y: 0, duration: .45, stagger: .07 }, 0)
      addResourceHeadingEntrance(timeline, title, .12)
      timeline.to(icons, { autoAlpha: 1, y: 0, duration: .65 }, .12)
      if (description) timeline.to(description, { autoAlpha: 1, y: 0, duration: .65 }, .45)
      if (action) timeline.to(action, { autoAlpha: 1, y: 0, duration: .55 }, .62)
      if (frame) timeline.to(frame, { autoAlpha: 1, y: 0, duration: .8 }, .3)
      timeline.call(() => { introCueReached = true; playIntro() }, [], .95)

      // Release the SSR guard after every entrance target has its initial state.
      root.dataset.heroEntrance = "ready"
    })

    return () => media.revert()
  }, { scope })

  return (
    <HeroEntranceContext.Provider value={ready}>
      <div className={styles.entranceSequence} data-hero-sequence data-hero-entrance="pending" ref={scope}>
        <section aria-labelledby="orthovet-hero-title" className={className}>
          {children}
        </section>
        {intro}
      </div>
    </HeroEntranceContext.Provider>
  )
}

export { HeroEntrance, useHeroEntranceReady }
