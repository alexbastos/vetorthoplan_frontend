"use client"

import { motion } from "motion/react"
import type { ReactNode } from "react"

import { useHeroDemo } from "./hero-product-motion"

type Content = { children: ReactNode; className?: string }
const sceneAttributes = {
  cases: { "data-hero-cases-scene": true }, viewer: { "data-hero-viewer-scene": true }, report: { "data-hero-report": true },
}

function HeroDemoScene({ name, children, className, label }: Content & { name: "cases" | "viewer" | "report"; label?: string }) {
  const { values, presentation } = useHeroDemo(), visible = presentation[name]
  return <motion.section {...sceneAttributes[name]} aria-label={label} className={className} data-visible={visible}
    style={{ ...values.scenes[name], visibility: visible ? "visible" : "hidden" }}>{children}</motion.section>
}

function HeroDemoPanel({ kind, children, className, label }: Content & { kind: "menu" | "save" | "toast"; label?: string }) {
  const { state, values, presentation } = useHeroDemo()
  const visible = kind === "menu" ? presentation.tools : kind === "save" ? presentation.saveActions : presentation.toast
  const attributes = kind === "menu" ? { "data-hero-tools-panel": true } : kind === "save" ? { "data-hero-save-actions": true } : { "data-hero-saved-toast": true }
  return <motion.div {...attributes} aria-busy={kind === "save" ? state.phase === "saving" : undefined} aria-label={label} className={className}
    data-visible={visible} role={kind === "menu" ? "group" : undefined}
    style={{ ...values[kind], x: kind === "toast" ? undefined : "-50%", visibility: visible ? "visible" : "hidden" }}>{children}</motion.div>
}

function HeroDemoSidebarItem({ name, status: initialStatus, children, className }: Content & { name?: string; status: string }) {
  const { presentation } = useHeroDemo()
  const status = name === "measurements" ? presentation.measurementsStatus : name === "report" ? presentation.reportStatus : initialStatus
  return <li aria-current={status === "active" ? "step" : undefined} className={className} data-hero-nav={name} data-status={status}>{children}</li>
}

function HeroDemoCaseRow({ primary, children, className }: Content & { primary: boolean }) {
  const { state, presentation } = useHeroDemo()
  return <li className={className} data-completed={primary && presentation.completed}
    data-hero-primary-case={primary ? "true" : undefined} data-hovered={primary && state.hovered === "openCase" && !presentation.completed}>{children}</li>
}

function HeroDemoCaseCount({ filter, children }: { filter: string; children: ReactNode }) {
  const { presentation } = useHeroDemo()
  return <span data-hero-case-count={filter}>{presentation.completed && filter === "READY" ? 2 : presentation.completed && filter === "IN_PLANNING" ? 1 : children}</span>
}

function HeroDemoTitle({ list, detail, className }: { list: string; detail: string; className?: string }) {
  const { presentation } = useHeroDemo()
  return <h2 className={className}>{presentation.cases ? list : detail}</h2>
}

function HeroDemoTool({ name, title, children, className }: Content & { name: string; title: string }) {
  const { presentation } = useHeroDemo()
  return <span className={className} data-active={name === "tpa" && presentation.selected} data-hero-tool={name} title={title}>{children}</span>
}

function HeroDemoButton({ name, title, children, className }: Content & { name: "confirm" | "cancel" | "conclude"; title: string }) {
  const { state } = useHeroDemo()
  const attributes = name === "confirm" ? { "data-hero-confirm-markings": true } : name === "cancel" ? { "data-hero-cancel-markings": true } : { "data-hero-conclude": true }
  return <button {...attributes} aria-label={title} className={className} data-pressed={state.pressed === name} title={title} type="button">{children}</button>
}

export { HeroDemoScene, HeroDemoPanel, HeroDemoSidebarItem, HeroDemoCaseRow, HeroDemoCaseCount, HeroDemoTitle, HeroDemoTool, HeroDemoButton }
