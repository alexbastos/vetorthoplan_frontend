"use client"

import { useAnimate, useInView, useReducedMotion } from "motion/react"
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react"

import { createHeroAnimationSession, type HeroAnimationSession } from "./hero-product-animation-session"
import { playHeroChoreography } from "./hero-product-choreography"
import { heroDemoPresentation, heroDemoReducer, initialHeroDemoState, type HeroDemoState } from "./hero-product-demo-state"
import { useHeroMotionValues, type HeroMotionValues } from "./hero-product-motion-values"
import { useHeroProductGeometry } from "./use-hero-product-geometry"
import { useHeroEntranceReady } from "./hero-entrance"

const HeroDemoContext = createContext<{ state: HeroDemoState; values: HeroMotionValues } | null>(null)

function useHeroDemo() {
  const demo = useContext(HeroDemoContext)
  if (!demo) throw new Error("Hero demo elements must be inside HeroProductMotion")
  return { ...demo, presentation: heroDemoPresentation(demo.state) }
}

function HeroProductMotion({ children, className }: { children: ReactNode; className: string }) {
  const entranceReady = useHeroEntranceReady()
  const [scope, animate] = useAnimate<HTMLDivElement>()
  const [state, dispatch] = useReducer(heroDemoReducer, initialHeroDemoState)
  const values = useHeroMotionValues()
  const imageReady = useHeroProductGeometry(scope, values)
  const entered = useInView(scope, { amount: 0.45, once: true })
  const inView = useInView(scope)
  const reduced = useReducedMotion()
  const active = useRef(true)
  const sessionRef = useRef<HeroAnimationSession | null>(null)

  useEffect(() => {
    const sync = () => { active.current = inView && !document.hidden; sessionRef.current?.syncVisibility() }
    sync()
    document.addEventListener("visibilitychange", sync)
    return () => document.removeEventListener("visibilitychange", sync)
  }, [inView])

  useEffect(() => {
    if (reduced) {
      values.cursor.opacity.set(0)
      values.scenes.report.opacity.set(1); values.scenes.report.y.set(0); values.scenes.report.scale.set(1)
      dispatch({ type: "reduced" })
      return
    }
    if (reduced === null || !entranceReady || !entered || !imageReady) return
    const abort = new AbortController()
    const session = createHeroAnimationSession(animate, abort.signal, active)
    sessionRef.current = session
    values.scenes.cases.opacity.set(1); values.scenes.cases.y.set(0); values.scenes.cases.scale.set(1)
    values.menu.opacity.set(0); values.menu.y.set(8)
    values.save.opacity.set(0); values.save.y.set(6)
    values.toast.opacity.set(0); values.toast.y.set(-8)
    values.cursor.opacity.set(0); values.cursor.scale.set(1)
    dispatch({ type: "reset" })
    void playHeroChoreography(values, session, dispatch, abort.signal).catch(error => {
      if (!abort.signal.aborted) console.error("Hero choreography failed", error)
    })
    return () => { abort.abort(); sessionRef.current = null }
  }, [animate, entranceReady, entered, imageReady, reduced, values])

  const context = useMemo(() => ({ state, values }), [state, values])
  return <HeroDemoContext.Provider value={context}>
    <div aria-hidden="true" className={className} data-hero-phase={state.phase} data-markings-saved={state.saved} inert ref={scope}>{children}</div>
  </HeroDemoContext.Provider>
}

export { HeroProductMotion, useHeroDemo }
