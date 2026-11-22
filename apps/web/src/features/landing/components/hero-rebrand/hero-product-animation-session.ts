import type { AnimationPlaybackControlsWithThen, MotionValue, useAnimate } from "motion/react"
import type { RefObject } from "react"

type HeroAnimate = ReturnType<typeof useAnimate>[1]

// Awaitable Motion animations with one cancellation boundary for the whole script.
function createHeroAnimationSession(animate: HeroAnimate, signal: AbortSignal, visible: RefObject<boolean>) {
  const controls = new Set<AnimationPlaybackControlsWithThen>()
  const abortError = () => new DOMException("Hero choreography cancelled", "AbortError")
  const run = (control: AnimationPlaybackControlsWithThen) => {
    if (signal.aborted) { control.stop(); return Promise.reject(abortError()) }
    controls.add(control)
    if (!visible.current) control.pause()
    return new Promise<void>((resolve, reject) => {
      const aborted = () => { control.stop(); controls.delete(control); reject(abortError()) }
      signal.addEventListener("abort", aborted, { once: true })
      Promise.resolve(control).then(() => {
        signal.removeEventListener("abort", aborted)
        controls.delete(control)
        if (signal.aborted) reject(abortError())
        else resolve()
      }, error => {
        signal.removeEventListener("abort", aborted)
        controls.delete(control)
        reject(error)
      })
    })
  }
  const tween = (value: MotionValue<number>, target: number | number[], duration: number, ease: "linear" | [number, number, number, number] = "linear", delay = 0) =>
    run(animate(value, target, { duration, ease, delay }))
  return { tween, syncVisibility: () => controls.forEach(control => visible.current ? control.play() : control.pause()) }
}

export { createHeroAnimationSession }
export type HeroAnimationSession = ReturnType<typeof createHeroAnimationSession>
