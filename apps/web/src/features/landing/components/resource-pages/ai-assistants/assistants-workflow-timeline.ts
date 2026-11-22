import gsap from "gsap"

import { assistantsWorkflowEdges, assistantsWorkflowNodes, assistantsWorkflowTiming as timing } from "./assistants-workflow-data"

function buildAssistantsWorkflowTimeline(root: SVGGElement) {
  // Measure each fixed SVG edge before any writes. Paths and nodes never remount.
  const edges = assistantsWorkflowEdges.flatMap(edge => {
    const path = root.querySelector<SVGPathElement>(`[data-workflow-edge="${edge.id}"]`)
    return path ? [{ ...edge, path, length: path.getTotalLength() }] : []
  })
  const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-workflow-node]"))
  const active = Array.from(root.querySelectorAll<HTMLElement>("[data-workflow-active]"))
  const pending = Array.from(root.querySelectorAll<HTMLElement>("[data-workflow-pending]"))
  const done = Array.from(root.querySelectorAll<SVGElement>("[data-workflow-done]"))
  const spinners = Array.from(root.querySelectorAll<SVGElement>("[data-workflow-spinner]"))
  const action = root.querySelector<HTMLElement>("[data-workflow-action]")
  const timeline = gsap.timeline({ paused: true, repeat: -1, repeatDelay: timing.repeatDelay })

  const initial = { opacity: .64 }
  gsap.set(cards, initial)
  gsap.set([...active, ...done, ...spinners, action], { autoAlpha: 0 })
  gsap.set(pending, { autoAlpha: 1 })
  // Explicit resets at zero make the repeat deterministic without replacing DOM.
  timeline.set(cards, initial, 0)
    .set([...active, ...done, ...spinners, action], { autoAlpha: 0 }, 0)
    .set(pending, { autoAlpha: 1 }, 0)

  edges.forEach(({ path, length, start }) => {
    gsap.set(path, { strokeDasharray: `${length} ${length}`, strokeDashoffset: length, opacity: 0 })
    timeline.set(path, { strokeDashoffset: length, opacity: 0 }, 0)
      .set(path, { opacity: 1 }, start)
      .to(path, { strokeDashoffset: 0, duration: timing.edge, ease: "none" }, start)
  })

  assistantsWorkflowNodes.forEach(node => {
    const card = root.querySelector<HTMLElement>(`[data-workflow-node="${node.id}"]`)
    if (!card) return
    const outline = card.querySelector<HTMLElement>("[data-workflow-active]")
    const spinner = card.querySelector<SVGElement>("[data-workflow-spinner]")
    const waiting = card.querySelector<HTMLElement>("[data-workflow-pending]")
    const check = card.querySelector<SVGElement>("[data-workflow-done]")
    const end = node.start + node.run

    timeline.to(card, { opacity: 1, duration: .18, ease: "power2.out" }, node.start)
      .to(outline, { autoAlpha: 1, duration: .14 }, node.start)
      .set(waiting, { autoAlpha: 0 }, node.start)
      .set(spinner, { autoAlpha: 1, rotation: 0, transformOrigin: "50% 50%" }, node.start)
      .to(spinner, { rotation: 360 * node.run / .7, duration: node.run, ease: "none" }, node.start)
      .set(spinner, { autoAlpha: 0 }, end)

    if (node.kind === "review") {
      // End at the professional's invitation; never auto-publish or auto-approve.
      timeline.to(action, { autoAlpha: 1, duration: .24, ease: "power2.out" }, timing.reviewAt)
    } else {
      timeline.to(check, { autoAlpha: 1, duration: .16 }, end)
        .to(outline, { autoAlpha: 0, duration: .2 }, end)
    }
  })

  timeline.to(cards, { opacity: .64, duration: timing.resetDuration, ease: "power2.inOut" }, timing.resetAt)
    .to([...done, ...active, action], { autoAlpha: 0, duration: timing.resetDuration }, timing.resetAt)
    .to(edges.map(edge => edge.path), { opacity: 0, duration: timing.resetDuration }, timing.resetAt)

  return timeline
}

export { buildAssistantsWorkflowTimeline }
