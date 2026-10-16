import type { CalibrationMarker, ImagePoint, ImageRendering, PixelSpacing } from "../types/case-workspace"

/** Calcula a escala nos pixels da imagem canônica; transformações do visualizador não entram aqui. */
function calculateManualPixelSpacing(
  rendering: ImageRendering,
  marker: CalibrationMarker,
  referenceSizeMm: number,
): PixelSpacing | null {
  if (rendering.status !== "ready" || !isPositiveFinite(referenceSizeMm)) return null

  const { widthPx, heightPx, pixelAspectRatio } = rendering
  if (!isPositiveFinite(widthPx) || !isPositiveFinite(heightPx) || !isPositiveFinite(pixelAspectRatio)) {
    return null
  }

  let lengthInColumnPixels: number

  if (marker.kind === "line") {
    if (!isPointInsideImage(marker.start, widthPx, heightPx)
      || !isPointInsideImage(marker.end, widthPx, heightPx)) return null

    const deltaX = marker.end.x - marker.start.x
    const deltaY = marker.end.y - marker.start.y
    lengthInColumnPixels = Math.hypot(deltaX, deltaY * pixelAspectRatio)
  } else {
    // Um marcador circular em pixels só representa um círculo físico com pixels quadrados.
    if (Math.abs(pixelAspectRatio - 1) > 1e-6
      || !isPointInsideImage(marker.center, widthPx, heightPx)
      || !isPositiveFinite(marker.radiusPx)
      || marker.center.x - marker.radiusPx < 0
      || marker.center.y - marker.radiusPx < 0
      || marker.center.x + marker.radiusPx > widthPx - 1
      || marker.center.y + marker.radiusPx > heightPx - 1) return null

    lengthInColumnPixels = 2 * marker.radiusPx
  }

  if (lengthInColumnPixels < 2) return null

  const columnMm = referenceSizeMm / lengthInColumnPixels
  const rowMm = columnMm * pixelAspectRatio
  if (!isPositiveFinite(columnMm) || !isPositiveFinite(rowMm)) return null

  return { rowMm, columnMm }
}

function isPointInsideImage(point: ImagePoint, widthPx: number, heightPx: number): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y)
    && point.x >= 0 && point.x <= widthPx - 1
    && point.y >= 0 && point.y <= heightPx - 1
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

export { calculateManualPixelSpacing }
