import gsap from "gsap"
import { CustomEase } from "gsap/CustomEase"

import type { SimulationPreviewSelection } from "../simulation-preview-copy"
import { simulationPreviewTiming as timing } from "./simulation-preview-timing"

gsap.registerPlugin(CustomEase)
const lens = CustomEase.create("simulation-preview-lens", timing.lensCurve)
const rowEase = CustomEase.create("simulation-preview-rows", timing.rowCurve)

function buildSimulationPreviewTimeline(root: HTMLElement, select: (selection: SimulationPreviewSelection) => void) {
  const papers = Array.from(root.querySelectorAll<HTMLElement>("[data-simulation-paper]"))
  const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-simulation-row]"))
  if (papers.length < 2 || rows.length !== papers.length * 2) return null
  const sheets = papers.map(paper => ({ paper,
    shadows: Array.from(paper.querySelectorAll<HTMLElement>("[data-simulation-shadow]")) }))
  const records = rows.flatMap(row => {
    const open = row.querySelector<HTMLElement>("[data-simulation-open]")
    const saved = row.querySelector<HTMLElement>("[data-simulation-saved]")
    return open && saved ? [{ row, open, saved }] : []
  })
  if (records.length !== rows.length) return null
  const rowHeight = Number.parseFloat(getComputedStyle(root).getPropertyValue("--row-h"))
  if (!Number.isFinite(rowHeight)) return null
  const saveAt = timing.editHold
  const swapAt = saveAt + timing.savedHold
  const transitionDuration = Math.max(timing.paperHideDelay, timing.paperDelay + timing.paperShadowDuration,
    timing.paperDelay + timing.rowDuration)
  const period = swapAt + transitionDuration
  const timeline = gsap.timeline({ paused: true, repeat: -1 })

  gsap.set(papers, { autoAlpha: 0, y: 0, zIndex: 1 })
  records.forEach((record, sequence) => {
    const slot = (records.length - sequence) % records.length
    gsap.set(record.row, { autoAlpha: slot < 3 ? 1 : 0, y: slot < 3 ? slot * rowHeight : -rowHeight, force3D: false })
    gsap.set(record.open, { autoAlpha: sequence === 0 ? 1 : 0, y: sequence === 0 ? 0 : -4, scale: sequence === 0 ? 1 : .96 })
    gsap.set(record.saved, { autoAlpha: sequence === 0 ? 0 : 1, y: sequence === 0 ? 4 : 0 })
  })
  gsap.set(papers[0], { autoAlpha: 1, clearProps: "transform" })

  // Six fixed row instances form a closed ring: the returning Toti row is a
  // distinct node while the preceding Toti occurrence is still leaving below.
  records.forEach((current, step) => {
    const index = step % papers.length
    const nextStep = (step + 1) % records.length
    const nextIndex = nextStep % papers.length
    const currentSheet = sheets[index]
    const nextSheet = sheets[nextIndex]
    const next = records[nextStep]
    const history = [0, 1, 2].map(offset => records[(step - offset + records.length) % records.length])
    const base = step * period
    const save = base + saveAt
    const swap = base + swapAt
    const enter = swap + timing.paperDelay

    timeline.call(() => select({ index, step, phase: "editing" }), [], base)
      .set(currentSheet.paper, { autoAlpha: 1, y: 0, zIndex: 1, clearProps: "transform" }, base)
      .set(current.row, { autoAlpha: 1, y: 0, force3D: false }, base)
      .set(current.open, { autoAlpha: 1, y: 0, scale: 1 }, base)
      .set(current.saved, { autoAlpha: 0, y: 4, scale: 1 }, base)
      .to(current.open, { autoAlpha: 0, scale: .96, y: -4, duration: timing.saveDuration, ease: lens }, save)
      .to(current.saved, { autoAlpha: 1, y: 0, duration: timing.saveDuration, ease: lens }, save)
      .call(() => select({ index, step, phase: "saved" }), [], save)
      .set(next.row, { autoAlpha: 0, y: -rowHeight, willChange: "transform, opacity", force3D: false }, swap)
      .set(next.open, { autoAlpha: 1, scale: 1, y: 0 }, swap)
      .set(next.saved, { autoAlpha: 0, scale: 1, y: 4 }, swap)
      .call(() => select({ index: nextIndex, step: nextStep, phase: "editing" }), [], swap)
      .to(next.row, { y: 0, duration: timing.rowDuration, ease: rowEase, force3D: false }, swap)
      .to(next.row, { autoAlpha: 1, duration: timing.rowFadeDuration, ease: lens }, swap)
      .set(next.row, { clearProps: "willChange" }, swap + timing.rowDuration)
      .set(currentSheet.paper, { zIndex: 1 }, swap)
      .set(nextSheet.paper, { autoAlpha: 1, y: timing.paperOffset, zIndex: 2, willChange: "transform" }, enter)
      .set(nextSheet.shadows, { opacity: 0 }, enter)
      .to(nextSheet.paper, { y: 0, duration: timing.paperDuration, ease: lens }, enter)
      .to(nextSheet.shadows, { opacity: 1, duration: timing.paperShadowDuration, ease: "none" }, enter)
      // The old sheet never descends: hide it only after the new one covers it.
      .set(currentSheet.paper, { autoAlpha: 0 }, swap + timing.paperHideDelay)
      .set(nextSheet.paper, { clearProps: "transform,willChange" }, enter + timing.paperDuration)

    history.forEach((record, slot) => {
      // These are the previous insertion's settled positions, including at the
      // ring boundary. Restore them explicitly without replacing any row node.
      timeline.set(record.row, { autoAlpha: 1, y: slot * rowHeight, force3D: false }, base)
      if (slot > 0) {
        timeline.set(record.open, { autoAlpha: 0, y: -4, scale: .96 }, base)
          .set(record.saved, { autoAlpha: 1, y: 0 }, base)
      }
      timeline.set(record.row, { willChange: "transform" }, swap)
        .to(record.row, { y: (slot + 1) * rowHeight, duration: timing.rowDuration, ease: rowEase, force3D: false }, swap)
        .set(record.row, { clearProps: "willChange" }, swap + timing.rowDuration)
    })
    // Only the bottom row leaves, already beyond the clipped three-slot viewport.
    timeline.set(history[2].row, { autoAlpha: 0 }, swap + timing.rowDuration)
  })

  return timeline
}

export { buildSimulationPreviewTimeline }
