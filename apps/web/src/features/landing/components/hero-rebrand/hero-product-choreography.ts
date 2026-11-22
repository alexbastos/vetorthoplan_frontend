import type { Dispatch } from "react"

import type { HeroAnimationSession } from "./hero-product-animation-session"
import type { HeroDemoAction, HeroDemoPhase } from "./hero-product-demo-state"
import type { HeroMotionValues, HeroTarget, HeroCurve, HeroSurfaceValues } from "./hero-product-motion-values"

const sceneEase: [number, number, number, number] = [0.22, 1, 0.36, 1]
const pointTravel = [0.8, 0.65, 0.65, 0.85] as const
const pointHold = [0.363, 0.363, 0.363, 0.18] as const

// Relative, awaitable steps: editing a scene doesn't require shifting later timestamps.
async function playHeroChoreography(values: HeroMotionValues, session: HeroAnimationSession, dispatch: Dispatch<HeroDemoAction>, signal: AbortSignal) {
  const { tween } = session, cursor = values.cursor
  let lastTarget: HeroTarget = "start"
  const phase = (next: HeroDemoPhase) => dispatch({ type: "phase", phase: next })
  const background = (animation: Promise<void>) => { void animation.catch(error => { if (!signal.aborted) console.error("Hero animation failed", error) }) }
  const wait = (duration: number) => { values.hold.set(0); return tween(values.hold, 1, duration) }
  const move = async (to: HeroTarget, duration = 0.935, curve: HeroCurve = "annotation", from = lastTarget) => {
    dispatch({ type: "pointer", hand: false })
    cursor.progress.set(0)
    cursor.path.set({ from, to, curve })
    background(tween(cursor.opacity, 1, 0.14))
    await tween(cursor.progress, 1, duration)
    lastTarget = to
  }
  const hover = async (target?: string) => {
    dispatch({ type: "pointer", hand: Boolean(target), hovered: target })
    await wait(0.187)
  }
  const click = (target?: string) => {
    dispatch({ type: "press", target })
    background(tween(cursor.scale, [1, 0.84, 1], 0.16).then(() => { if (!signal.aborted) dispatch({ type: "press" }) }))
    background(tween(cursor.opacity, 0, 0.133, "linear", 0.08))
  }
  const surface = (value: HeroSurfaceValues, opacity: number, y: number, scale: number, duration: number) => Promise.all([
    tween(value.opacity, opacity, duration, sceneEase), tween(value.y, y, duration, sceneEase), tween(value.scale, scale, duration, sceneEase),
  ])
  const enter = (value: HeroSurfaceValues) => { value.opacity.set(0); value.y.set(18); value.scale.set(0.985); return surface(value, 1, 0, 1, 0.38) }
  const exit = (value: HeroSurfaceValues) => surface(value, 0, -18, 0.985, 0.32)
  const reveal = (value: HeroSurfaceValues, duration: number) => surface(value, 1, 0, 1, duration)

  await wait(0.7)
  await move("openCase", 0.935, "case")
  await hover("openCase"); click("openCase")
  phase("opening-case")
  await exit(values.scenes.cases)
  phase("case")
  await enter(values.scenes.viewer)
  await wait(0.32)

  await move("measurements", 0.935, "sidebar", "start")
  await hover("measurements"); click("measurements")
  phase("measurements")
  background(reveal(values.menu, 0.38).then(() => {}))
  await wait(0.408)
  await move("approach", 0.7, "approach")
  await move("tool", 0.32, "tool")
  await hover("tool"); click("tool")
  phase("tpa")
  await wait(0.413)

  for (const [index, duration] of pointTravel.entries()) {
    await move(`point${index as 0 | 1 | 2 | 3}`, duration)
    await hover(); click()
    dispatch({ type: "point", count: index + 1 })
    await wait(pointHold[index])
  }

  phase("confirm")
  await reveal(values.save, 0.22)
  await wait(0.1)
  await move("confirm")
  await hover("confirm"); click("confirm")
  phase("saving")
  background(tween(values.save.opacity, 0, 0.18))
  await wait(0.36)
  phase("saved")
  await reveal(values.toast, 0.18)
  await wait(2.44)
  await surface(values.toast, 0, -4, 1, 0.18)
  await wait(0.2)

  await move("report")
  await hover("report"); click("report")
  phase("report-opening")
  await exit(values.scenes.viewer)
  phase("report")
  await enter(values.scenes.report)
  await wait(2.5)
  await move("conclude")
  await hover("conclude"); click("conclude")
  phase("concluding")
  await exit(values.scenes.report)
  phase("returning")
  await enter(values.scenes.cases)
  await wait(1.2)
  dispatch({ type: "pointer", hand: false })
  phase("complete")
}

export { playHeroChoreography }
