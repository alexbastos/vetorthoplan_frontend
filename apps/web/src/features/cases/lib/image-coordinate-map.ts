import type { ImagePoint } from "../types/case-workspace"

type ImageRect = Readonly<{ left: number; top: number; width: number; height: number }>

/** Usa o retângulo já transformado pelo navegador para converter um gesto em pixels da imagem. */
function mapClientPointToImage(
  clientX: number,
  clientY: number,
  rect: ImageRect,
  widthPx: number,
  heightPx: number,
): ImagePoint | null {
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)
    || !Number.isFinite(rect.width) || !Number.isFinite(rect.height)
    || rect.width <= 0 || rect.height <= 0 || widthPx <= 0 || heightPx <= 0) return null

  return {
    x: Math.max(0, Math.min(widthPx - 1, (clientX - rect.left) / rect.width * widthPx)),
    y: Math.max(0, Math.min(heightPx - 1, (clientY - rect.top) / rect.height * heightPx)),
  }
}

export { mapClientPointToImage }
