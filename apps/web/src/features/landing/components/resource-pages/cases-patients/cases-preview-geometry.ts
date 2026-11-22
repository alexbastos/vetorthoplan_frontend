// Fixed SVG coordinates supplied by the reference. Adapt copy inside these
// boundaries; do not resize or reposition the modules to accommodate content.
const casesPreviewGeometry = {
  panel: { x: 211, y: 35, width: 380, height: 452, rx: 16 },
  panelOutline: { x: 210, y: 34, width: 382, height: 454, rx: 17 },
  patient: { x: 40, y: 68, width: 383, height: 117, rx: 14 },
  patientOutline: { x: 40.5, y: 68.5, width: 382, height: 116, rx: 13.5 },
  patientDivider: { x1: 40, x2: 423, y1: 112.553, y2: 112.553 },
  patientBadge: { x: 190.42, y: 146.798, width: 38.48, height: 21.3, rx: 6 },
  // Width/radius are retained from the existing preview: not supplied in TXT.
  progress: { x: 442.05, y: 68.18, width: 126, height: 116.06, rx: 18 },
  // Only the summary's origin is specified; retain its existing size/radius.
  summary: { x: 240.8, y: 203.97, width: 320, height: 154, rx: 18 },
  glowBlur: 40.05,
  glowCapsules: [
    { x: 254.84, y: 22.88, width: 77.17, height: 36, rx: 18, fill: "#FFAA78", fillOpacity: .95 },
    { x: 316.05, y: 30.08, width: 93.7, height: 52.8, rx: 26.4, fill: "#FF78CD", fillOpacity: 1 },
    { x: 362.89, y: 39.68, width: 110.24, height: 72, rx: 36, fill: "#B99BFF", fillOpacity: .85 },
    { x: 426.25, y: 30.08, width: 93.7, height: 52.8, rx: 26.4, fill: "#8CB9FF", fillOpacity: .9 },
    { x: 503.99, y: 22.88, width: 77.17, height: 36, rx: 18, fill: "#8CB9FF", fillOpacity: .9 },
  ],
} as const

export { casesPreviewGeometry }
