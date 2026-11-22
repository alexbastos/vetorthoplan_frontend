// Reference timing: trigger 300ms, edges 240ms, parallel tasks 700/1000ms,
// report 820ms. The final review is a visual invitation, not auto-approval.
const assistantsWorkflowNodes = [
  { id: "case", x: 38, y: 156, width: 104, height: 64, start: 0, run: .3, kind: "case" },
  { id: "context", x: 188, y: 104, width: 118, height: 64, start: .54, run: .7, kind: "agent", agent: "chat", color: "#1f7cf2" },
  { id: "notes", x: 188, y: 208, width: 118, height: 64, start: .54, run: 1, kind: "agent", agent: "cat", color: "#f8a01c" },
  { id: "draft", x: 350, y: 156, width: 118, height: 64, start: 1.78, run: .82, kind: "agent", agent: "bunny", color: "#ec4899" },
  { id: "review", x: 502, y: 141, width: 108, height: 94, start: 2.84, run: .64, kind: "review" },
] as const

const assistantsWorkflowEdges = [
  { id: "case-context", path: "M142 188C165 188 165 136 188 136", start: .3 },
  { id: "case-notes", path: "M142 188C165 188 165 240 188 240", start: .3 },
  { id: "context-draft", path: "M306 136C328 136 328 188 350 188", start: 1.24 },
  { id: "notes-draft", path: "M306 240C328 240 328 188 350 188", start: 1.54 },
  { id: "draft-review", path: "M468 188H502", start: 2.6 },
] as const

const assistantsWorkflowTiming = {
  edge: .24,
  reviewAt: 3.48,
  resetAt: 5.8,
  resetDuration: .35,
  repeatDelay: .45,
} as const

type AssistantsWorkflowNode = typeof assistantsWorkflowNodes[number]
type AssistantsWorkflowCopy = Record<AssistantsWorkflowNode["id"], { title: string; description: string }> & { action: string }

export { assistantsWorkflowNodes, assistantsWorkflowEdges, assistantsWorkflowTiming }
export type { AssistantsWorkflowNode, AssistantsWorkflowCopy }
