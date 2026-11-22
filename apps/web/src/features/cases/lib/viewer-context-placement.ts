type ScreenPoint = { x: number; y: number }

// Conservative screen-space bounds for the compact confirm/cancel toolbar.
const WIDTH = 80, HEIGHT = 40, MARGIN = 12, CLEARANCE = 48

function viewerContextPlacement(anchor: ScreenPoint, viewport: { width: number; height: number }, minLeft: number,
  avoidPoints: readonly ScreenPoint[] = []) {
  const clamp = ({ left, top }: { left: number; top: number }) => ({
    left: Math.max(minLeft, Math.min(viewport.width - WIDTH - MARGIN, left)),
    top: Math.max(MARGIN, Math.min(viewport.height - HEIGHT - MARGIN, top)),
  })
  if (!avoidPoints.length) return clamp({
    left: anchor.x + 104 < viewport.width ? anchor.x + 24 : anchor.x - 104, top: anchor.y + 24,
  })
  const left = Math.min(...avoidPoints.map(point => point.x)) - CLEARANCE
  const right = Math.max(...avoidPoints.map(point => point.x)) + CLEARANCE
  const top = Math.min(...avoidPoints.map(point => point.y)) - CLEARANCE
  const bottom = Math.max(...avoidPoints.map(point => point.y)) + CLEARANCE
  const candidates = [
    { left: right, top: anchor.y - HEIGHT / 2 },
    { left: left - WIDTH, top: anchor.y - HEIGHT / 2 },
    { left: anchor.x - WIDTH / 2, top: bottom },
    { left: anchor.x - WIDTH / 2, top: top - HEIGHT },
  ].map(clamp)
  const overlap = (candidate: { left: number; top: number }) =>
    Math.max(0, Math.min(candidate.left + WIDTH, right) - Math.max(candidate.left, left))
    * Math.max(0, Math.min(candidate.top + HEIGHT, bottom) - Math.max(candidate.top, top))
  // Prefer a free side. If a zoomed contour fills the viewport, keep actions
  // reachable inside it and choose the smallest overlap with the protected area.
  return candidates.reduce((best, candidate) => overlap(candidate) < overlap(best) ? candidate : best)
}

export { viewerContextPlacement }
