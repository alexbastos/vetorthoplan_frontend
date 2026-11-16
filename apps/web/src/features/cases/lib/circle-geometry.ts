import type { ImagePoint } from "../types/case-workspace"

type CircleGeometry = { center: ImagePoint; edge: ImagePoint }

function circleHasValidRadius({ center, edge }: CircleGeometry): boolean {
  return center.x !== edge.x || center.y !== edge.y
}

export { circleHasValidRadius }
export type { CircleGeometry }
