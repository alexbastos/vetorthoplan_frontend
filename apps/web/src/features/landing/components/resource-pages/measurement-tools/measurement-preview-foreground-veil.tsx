import { measurementPreviewGeometry as geometry } from "./measurement-preview-geometry"

// Each veil paints immediately after its own window, preserving the next layer.
function MeasurementPreviewForegroundVeil({ idPrefix, surface }: {
  idPrefix: string
  surface: "viewer" | "panel"
}) {
  const canvasBottom = geometry.canvas.y + geometry.canvas.height
  const panelBottom = geometry.panel.y + geometry.panel.height
  const startY = surface === "viewer" ? canvasBottom - 24 : panelBottom - 14
  const endY = surface === "viewer" ? canvasBottom : panelBottom + 14
  const gradientId = `${idPrefix}-${surface}-veil`

  return (
    <>
      <defs>
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="314.5" y1={startY} x2="314.5" y2={endY}>
          <stop stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset=".35" stopColor="#FFFFFF" stopOpacity=".1" />
          <stop offset=".7" stopColor="#FFFFFF" stopOpacity=".58" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect x="0" y={startY} width="629" height={427 - startY} fill={`url(#${gradientId})`} />
    </>
  )
}

export { MeasurementPreviewForegroundVeil }
