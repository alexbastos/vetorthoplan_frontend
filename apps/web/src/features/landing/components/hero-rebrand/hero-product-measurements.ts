import type { Point } from "./hero-product-motion-math"

const heroRadiograph = { src: "/images/landing/img_lp_mck_1.avif", widthPx: 1046, heightPx: 1504 } as const

type HeroImageRect = { x: number; y: number; width: number; height: number }
const imagePointToDashboard = (point: Point, image: HeroImageRect): Point => ({
  x: image.x + point.x * image.width, y: image.y + point.y * image.height,
})

export { heroRadiograph, imagePointToDashboard }
export type { HeroImageRect }
