"use client"

import { useMotionValue, useTransform, type MotionValue } from "motion/react"
import { useMemo } from "react"

import { heroBezierPoint, type Point } from "./hero-product-motion-math"
import { imagePointToDashboard, type HeroImageRect } from "./hero-product-measurements"
import { heroTpaPoints } from "./hero-product-tpa"

type HeroTarget = "start" | "openCase" | "measurements" | "approach" | "tool" | "confirm" | "report" | "conclude" | `point${0 | 1 | 2 | 3}`
type HeroCurve = "case" | "sidebar" | "approach" | "tool" | "annotation"
type HeroPath = { from: HeroTarget; to: HeroTarget; curve: HeroCurve }
type HeroGeometry = { targets: Record<Exclude<HeroTarget, `point${number}`>, Point>; image: HeroImageRect }
type HeroSurfaceValues = { opacity: MotionValue<number>; y: MotionValue<number>; scale: MotionValue<number> }

const initialGeometry: HeroGeometry = {
  targets: { start: { x: 530, y: 270 }, openCase: { x: 330, y: 220 }, measurements: { x: 90, y: 220 },
    approach: { x: 540, y: 500 }, tool: { x: 580, y: 540 }, confirm: { x: 565, y: 505 }, report: { x: 90, y: 450 }, conclude: { x: 810, y: 550 } },
  image: { x: 420, y: 130, width: 265, height: 382 },
}

function targetPoint(target: HeroTarget, geometry: HeroGeometry): Point {
  return target.startsWith("point")
    ? imagePointToDashboard(heroTpaPoints[Number(target.slice(5))], geometry.image)
    : geometry.targets[target as keyof HeroGeometry["targets"]]
}

function pathPoint(path: HeroPath, geometry: HeroGeometry, progress: number): Point {
  const from = targetPoint(path.from, geometry), to = targetPoint(path.to, geometry)
  const control = path.curve === "case" ? { x: to.x + 140, y: to.y - 60 }
    : path.curve === "sidebar" ? { x: to.x + 180, y: to.y - 90 }
    : path.curve === "approach" ? { x: from.x + 120, y: to.y - 100 }
    : path.curve === "tool" ? { x: to.x - 8, y: from.y + 8 }
    : { x: (from.x + to.x) / 2 + 30, y: Math.min(from.y, to.y) - 36 }
  return heroBezierPoint(from, control, to, progress)
}

function useSurfaceValues(opacity: number, y = 0, scale = 1): HeroSurfaceValues {
  const opacityValue = useMotionValue(opacity), yValue = useMotionValue(y), scaleValue = useMotionValue(scale)
  return useMemo(() => ({ opacity: opacityValue, y: yValue, scale: scaleValue }), [opacityValue, yValue, scaleValue])
}

function useHeroMotionValues() {
  const cases = useSurfaceValues(1), viewer = useSurfaceValues(0, 18, 0.985), report = useSurfaceValues(0, 18, 0.985)
  const menu = useSurfaceValues(0, 8), save = useSurfaceValues(0, 6), toast = useSurfaceValues(0, -8)
  const geometry = useMotionValue(initialGeometry)
  const path = useMotionValue<HeroPath>({ from: "start", to: "openCase", curve: "case" })
  const progress = useMotionValue(0), opacity = useMotionValue(0), scale = useMotionValue(1), hold = useMotionValue(0)
  const position = useTransform(() => pathPoint(path.get(), geometry.get(), progress.get()))
  const x = useTransform(position, point => point.x), y = useTransform(position, point => point.y)
  return useMemo(() => ({ scenes: { cases, viewer, report }, menu, save, toast, geometry, hold,
    cursor: { path, progress, opacity, scale, position, x, y } }),
  [cases, viewer, report, menu, save, toast, geometry, hold, path, progress, opacity, scale, position, x, y])
}

export { useHeroMotionValues }
export type { HeroGeometry, HeroTarget, HeroCurve, HeroSurfaceValues }
export type HeroMotionValues = ReturnType<typeof useHeroMotionValues>
