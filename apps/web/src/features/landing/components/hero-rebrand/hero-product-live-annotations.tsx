"use client"

import { motion, useTransform, type MotionValue } from "motion/react"

import { heroRadiograph } from "./hero-product-measurements"
import { useHeroDemo } from "./hero-product-motion"
import { heroAnnotationScale, heroTpaConstruction, heroTpaColors, heroTpaPoints, type HeroTpaConstruction } from "./hero-product-tpa"
import styles from "./hero-product-workspace.module.css"

function TpaSegment({ kind, construction, pixel }: { kind: "plateau" | "axis" | "reference"; construction: MotionValue<HeroTpaConstruction>; pixel: MotionValue<number> }) {
  const x1 = useTransform(construction, value => (value.segments[kind]?.start.x ?? 0) * heroRadiograph.widthPx)
  const y1 = useTransform(construction, value => (value.segments[kind]?.start.y ?? 0) * heroRadiograph.heightPx)
  const x2 = useTransform(construction, value => (value.segments[kind]?.end.x ?? 0) * heroRadiograph.widthPx)
  const y2 = useTransform(construction, value => (value.segments[kind]?.end.y ?? 0) * heroRadiograph.heightPx)
  const opacity = useTransform(construction, value => value.segments[kind]?.visible ? 1 : 0)
  const dash = useTransform(() => construction.get().segments[kind]?.preview ? `${4 * pixel.get()} ${3 * pixel.get()}` : "none")
  const strokeWidth = useTransform(pixel, value => (kind === "reference" ? 1.5 : 2) * value)
  return <motion.line data-tpa-segment={kind} fill="none" opacity={opacity} stroke={kind === "reference" ? heroTpaColors.reference : heroTpaColors.line}
    strokeDasharray={dash} strokeWidth={strokeWidth} x1={x1} x2={x2} y1={y1} y2={y2} />
}

function HeroProductLiveAnnotations({ locale }: { locale: string }) {
  const { state, values } = useHeroDemo()
  const pixel = useTransform(values.geometry, geometry => geometry.image.width > 0 ? heroRadiograph.widthPx / geometry.image.width : 1 / heroAnnotationScale)
  const construction = useTransform(() => {
    const { image } = values.geometry.get(), point = values.cursor.position.get()
    return heroTpaConstruction(state.points, { x: (point.x - image.x) / image.width, y: (point.y - image.y) / image.height }, 1 / pixel.get(), locale)
  })
  const arc = useTransform(construction, value => value.angle?.path ?? "")
  const arcOpacity = useTransform(construction, value => value.angle ? 1 : 0)
  const labelOpacity = useTransform(construction, value => value.angle?.label ? 1 : 0)
  const label = useTransform(construction, value => value.angle?.value ?? "")
  const labelX = useTransform(construction, value => value.angle?.label?.x ?? 0)
  const labelY = useTransform(construction, value => value.angle?.label?.y ?? 0)
  const previewX = useTransform(construction, value => (value.previewPoint?.x ?? 0) * heroRadiograph.widthPx)
  const previewY = useTransform(construction, value => (value.previewPoint?.y ?? 0) * heroRadiograph.heightPx)
  const previewOpacity = useTransform(construction, value => value.previewPoint ? 0.65 : 0)
  const strokeWidth = useTransform(pixel, value => 1.5 * value)
  const fontSize = useTransform(pixel, value => 11 * value)
  const pointRadius = useTransform(pixel, value => 3 * value)
  const previewRadius = useTransform(pixel, value => 4.5 * value)
  return <svg aria-hidden="true" className={styles.annotations} data-hero-tpa-overlay="viewer" preserveAspectRatio="xMidYMid meet"
    viewBox={`0 0 ${heroRadiograph.widthPx} ${heroRadiograph.heightPx}`}>
    {(["plateau", "axis", "reference"] as const).map(kind => <TpaSegment construction={construction} key={kind} kind={kind} pixel={pixel} />)}
    <motion.path d={arc} data-tpa-arc fill="none" opacity={arcOpacity} stroke={heroTpaColors.angle} strokeOpacity={0.72} strokeWidth={strokeWidth} />
    <motion.text data-tpa-label dominantBaseline="middle" fill={heroTpaColors.angle} fontFamily="var(--font-data), monospace"
      x={labelX} y={labelY} fontSize={fontSize} opacity={labelOpacity} textAnchor="middle">{label}</motion.text>
    {heroTpaPoints.map((point, index) => <motion.circle cx={point.x * heroRadiograph.widthPx} cy={point.y * heroRadiograph.heightPx}
      data-tpa-point={index} fill={heroTpaColors.line} key={index} opacity={state.points > index ? 1 : 0} r={pointRadius} />)}
    <motion.circle cx={previewX} cy={previewY} data-tpa-preview fill="none" opacity={previewOpacity} r={previewRadius} stroke={heroTpaColors.line} strokeWidth={strokeWidth} />
  </svg>
}

export { HeroProductLiveAnnotations }
