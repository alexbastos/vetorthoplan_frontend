// Exact SVG dimensions from the supplied reference (629 × 427). Preserve the
// layer-local coordinates: panel/photo move -6 SVG units; the veil does not.
const surgicalPreviewGeometry = {
  illustrationTransform: "translate(-6 0)",
  contentTransform: "translate(0 -16)",
  viewport: { width: 629, height: 427, rx: 20 },
  panel: {
    outer: { x: 205, y: 63, width: 408, height: 530, rx: 22 },
    inner: { x: 215, y: 73, width: 388, height: 504, rx: 17.8264 },
    outline: { x: 215.37, y: 73.3696, width: 387.261, height: 503.261, rx: 17.4568 },
    bodyClip: { x: 218.961, y: 126.647, width: 444.967, height: 449.402 },
    avatar: { x: 233.742, y: 84.5156, width: 29.5659, height: 29.5659, rx: 7.39148 },
    avatarClip: { x: 241.875, y: 92.6465, width: 13.3047, height: 13.3047 },
    headerLine: { x: 245.758, y: 93.3398, width: 89.4141, height: 11.9165, rx: 5.95825 },
    badge: { x: 532.63, y: 87.3696, width: 56, height: 23.2609, rx: 11.63 },
    abstractNote: { x: 233.742, y: 142.658, width: 169.398, height: 62.1191, rx: 18 },
    abstractLines: [
      { x: 228.336, y: 158.003, width: 155.953, height: 11.6021, rx: 5.80103 },
      { x: 228.336, y: 177.831, width: 103.136, height: 11.6021, rx: 5.80103 },
    ],
    message: "M562.648 221.5H359.648C351.088 221.5 344.148 228.44 344.148 237V273C344.148 281.56 351.088 288.5 359.648 288.5H574.648C576.581 288.5 578.148 286.933 578.148 285V237L578.144 236.6C577.931 228.224 571.075 221.5 562.648 221.5Z",
  },
  panelVeil: { x: 188.32, y: 303, width: 440.68, height: 124 },
  photo: {
    src: "/images/landing/5443656432312390.avif",
    bounds: { x: 51.5156, y: 42.5879, width: 211.984, height: 211.984, rx: 18 },
    clip: { x: 51.5156, y: 42.5879, width: 211.984, height: 211.984, rx: 22 },
    glow: { x: 49.3516, y: 40.4238, width: 216.312, height: 216.312, rx: 23 },
  },
  note: {
    shape: "M30.2578 155.58C30.2578 150.057 34.735 145.58 40.2578 145.58H107.164C112.687 145.58 117.164 150.057 117.164 155.58V184.865H40.2578C34.735 184.865 30.2578 180.388 30.2578 174.865V155.58Z",
    lines: [
      { x: 40.0156, y: 156.18, width: 60.7031, height: 6, rx: 3 },
      { x: 40.0156, y: 168.266, width: 42.9297, height: 6, rx: 3 },
    ],
  },
} as const

export { surgicalPreviewGeometry }
