"use client"

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

import { LandingLightField } from "../landing-light-field"
import { PatientProfileScene } from "./patient-profile-scene"
import { PlanningWorkspaceScene } from "./planning-workspace-scene"
import { SavedPlanScene } from "./saved-plan-scene"
import { ReferenceStepOne } from "./reference-step-one"
import styles from "./clinical-case-story.module.css"

gsap.registerPlugin(useGSAP, ScrollTrigger)

type StoryMoment = { label: string; title: string; description: string }
type StoryLabels = {
  case: string
  patientName: string
  secondPatientName: string
  patientMeta: string
  secondPatientMeta: string
  professionalName: string
  responsible: string
  activeStatus: string
  draftStatus: string
  completedStatus: string
  casesTab: string
  professionalsTab: string
  search: string
  casePlanning: string
  lateral: string
  calibrate: string
  scale: string
  planning: string
  axis: string
  measure: string
  simulation: string
  review: string
  report: string
  saved: string
}

function ClinicalCaseStoryScroll({ moments, labels, scrollLabel }: { moments: StoryMoment[]; labels: StoryLabels; scrollLabel: string }) {
  const scope = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const root = scope.current
    if (!root) return

    const media = gsap.matchMedia()
    media.add("(min-width: 1100px) and (prefers-reduced-motion: no-preference)", () => {
      const track = root.querySelector<HTMLElement>("[data-story-track]")
      const card = root.querySelector<HTMLElement>("[data-story-card]")
      const line = root.querySelector<HTMLElement>("[data-story-line]")
      const traveler = root.querySelector<HTMLElement>("[data-story-traveler]")
      const stages = Array.from(root.querySelectorAll<HTMLElement>("[data-story-stage]"))
      const scrollHint = root.querySelector<HTMLElement>("[data-story-scroll-hint]")
      if (!track || !card || !line || !traveler || stages.length !== 4) return

      root.dataset.storyMotion = "ready"
      const visibilityObserver = new IntersectionObserver(([entry]) => {
        root.dataset.storyVisible = String(entry.isIntersecting)
        root.style.setProperty("--play", entry.isIntersecting ? "running" : "paused")
      }, { rootMargin: "400px 0px" })
      visibilityObserver.observe(track)
      let activeStep = 0
      gsap.set(stages, { autoAlpha: 0 })
      gsap.set(stages[0], { autoAlpha: 1, y: 0 })

      const activateStep = (nextStep: number) => {
        if (nextStep === activeStep) return
        const outgoing = stages[activeStep]
        const incoming = stages[nextStep]
        activeStep = nextStep
        stages.forEach((stage, index) => stage.setAttribute("aria-current", index === nextStep ? "step" : "false"))
        gsap.to(outgoing, { autoAlpha: 0, duration: 0.5, ease: "power3.out", overwrite: true })
        gsap.fromTo(incoming, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: "power3.out", overwrite: true })
      }

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: track,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.2,
          invalidateOnRefresh: true,
          onUpdate: (self) => activateStep(Math.min(3, Math.floor(self.progress * 4 * 0.999))),
        },
      })
      timeline.fromTo(card, { scale: 0.81 }, { scale: 1, duration: 0.22, ease: "none" }, 0)
      timeline.fromTo(traveler, { y: 0 }, { y: () => line.clientHeight, duration: 1, ease: "none" }, 0)

      if (scrollHint) gsap.to(scrollHint, { y: 4, duration: 0.75, ease: "sine.inOut", repeat: -1, yoyo: true })

      return () => {
        delete root.dataset.storyMotion
        delete root.dataset.storyVisible
        root.style.removeProperty("--play")
        visibilityObserver.disconnect()
        timeline.scrollTrigger?.kill()
      }
    })

    return () => media.revert()
  }, { scope })

  return (
    <div className={styles.scrollRoot} ref={scope}>
      <div className={styles.scrollTrack} data-story-track>
        <div className={styles.stickyViewport}>
          <div className={styles.storyCard} data-story-card>
            <LandingLightField idPrefix="clinical-story" />


            <div aria-hidden="true" className={styles.timeline}>
              <span className={styles.timelineLine} data-story-line />
              {Array.from({ length: 26 }, (_, index) => (
                <span className={styles.tick} key={index} style={{ top: `${(index / 25) * 100}%` }} />
              ))}
              <span className={styles.traveler} data-story-traveler />
            </div>

            <div className={styles.stages}>
              {moments.map((moment, index) => (
                <article aria-current={index === 0 ? "step" : "false"} className={styles.stage} data-story-stage key={index}>
                  <div className={styles.stageCopy}>
                    <p className={styles.stageLabel}>{moment.label}</p>
                    <h3>{moment.title}</h3>
                    <p className={styles.stageDescription}>{moment.description}</p>
                  </div>
                  <div aria-hidden="true" className={styles.scene}>
                    {index === 0 ? <ReferenceStepOne labels={labels} /> : null}
                    {index === 1 ? <PatientProfileScene /> : null}
                    {index === 2 ? <PlanningWorkspaceScene /> : null}
                    {index === 3 ? <SavedPlanScene /> : null}
                  </div>
                </article>
              ))}
            </div>

            <div aria-hidden="true" className={styles.scrollHint} data-story-scroll-hint>
              <span className={styles.scrollIcon}><i /><i /></span>
              <span>{scrollLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { ClinicalCaseStoryScroll }
