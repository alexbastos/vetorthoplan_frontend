// Decorative preview coordinates, independent of the authenticated image viewer.
const radiograph = {
  src: "/images/landing/img_lp_mck_1.avif",
  x: 81, y: 76, height: 236, width: 236 * 1046 / 1504,
} as const
const imagePoint = (x: number, y: number) => ({
  x: radiograph.x + x * radiograph.width,
  y: radiograph.y + y * radiograph.height,
})

const measurementPreviewGeometry = {
  viewer: { x: 34, y: 34, width: 332, height: 308, rx: 12 },
  canvas: { x: 46, y: 72, width: 308, height: 244, rx: 7 },
  panel: { x: 289, y: 89, width: 300, height: 237, rx: 14 },
  detailsDividerY: 234.5,
  radiograph,
  // A single illustrative distance along the tibial shaft stays left of the panel.
  annotation: { start: imagePoint(.51, .36), end: imagePoint(.49, .69) },
} as const

const measurementPreviewExample = { millimeters: 42.6, points: 2 } as const

export { measurementPreviewGeometry, measurementPreviewExample }
