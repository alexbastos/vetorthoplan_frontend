// One uniform scale for the supplied HTML scene. Only the table's vertical
// framing is lifted to fit the existing 447px card and its caption.
const simulationPreviewGeometry = {
  stage: { width: 616, height: 503, maxScale: 1.25 },
  paper: { x: 108.418, y: 61.311, width: 399.163, minHeight: 640.139 },
  table: {
    x: -491.194, y: 228.898, width: 1070.51, radius: 22.645,
    padding: 20.587, rowHeight: 57.643, lift: 49.898,
  },
} as const

type SimulationPreviewPlan = { radius: number; fragmentPoints: number; rotation: number }

export { simulationPreviewGeometry }
export type { SimulationPreviewPlan }
