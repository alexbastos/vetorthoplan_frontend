// Same 629 × 427 reference space as the other previews. The platform surface
// grows to the right (the simulation table grows to the left); text is not flipped.
const communityPreviewGeometry = {
  panel: { x: 156, y: 72, width: 568, height: 400, rx: 22.645 },
  screen: { x: 166, y: 82, width: 548, height: 380, rx: 14 },
  screenSrc: "/images/landing/5454875482823.avif",
  photoTransform: "translate(-6 0)",
  photo: {
    src: "/images/landing/5443656432312391.avif",
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

export { communityPreviewGeometry }
