type HeroDemoPhase = "cases" | "opening-case" | "case" | "measurements" | "tpa" | "confirm" | "saving" | "saved" | "report-opening" | "report" | "concluding" | "returning" | "complete"
type HeroDemoState = { phase: HeroDemoPhase; points: number; hand: boolean; hovered?: string; pressed?: string; saved: boolean }
type HeroDemoAction =
  | { type: "phase"; phase: HeroDemoPhase }
  | { type: "point"; count: number }
  | { type: "pointer"; hand: boolean; hovered?: string }
  | { type: "press"; target?: string }
  | { type: "reset" | "reduced" }

const initialHeroDemoState: HeroDemoState = { phase: "cases", points: 0, hand: false, saved: false }

function heroDemoReducer(state: HeroDemoState, action: HeroDemoAction): HeroDemoState {
  switch (action.type) {
    case "reset": return initialHeroDemoState
    case "reduced": return { phase: "report", points: 4, hand: false, saved: true }
    case "point": return { ...state, points: action.count }
    case "pointer": return { ...state, hand: action.hand, hovered: action.hovered }
    case "press": return { ...state, pressed: action.target }
    case "phase": return { ...state, phase: action.phase,
      points: action.phase === "returning" ? 0 : state.points,
      saved: action.phase === "saved" ? true : action.phase === "returning" ? false : state.saved }
  }
}

function heroDemoPresentation(state: HeroDemoState) {
  const { phase } = state
  const cases = ["cases", "opening-case", "returning", "complete"].includes(phase)
  const report = phase === "report" || phase === "concluding"
  const measurements = ["measurements", "tpa", "confirm", "saving", "saved", "report-opening"].includes(phase)
  return {
    cases, report, viewer: !cases && !report,
    completed: phase === "returning" || phase === "complete",
    measurementsStatus: report || phase === "report-opening" ? "completed" : measurements ? "active" : "context",
    reportStatus: report || phase === "report-opening" ? "active" : "pending",
    tools: measurements, selected: measurements && phase !== "measurements",
    saveActions: phase === "confirm" || phase === "saving", toast: phase === "saved",
  } as const
}

export { initialHeroDemoState, heroDemoReducer, heroDemoPresentation }
export type { HeroDemoPhase, HeroDemoState, HeroDemoAction }
