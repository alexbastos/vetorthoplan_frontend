const stackViewbox = { width: 1512, height: 1219 } as const
const stackPlates = {
  municipality: { x: 120, y: 80, width: 1272, height: 214 },
  intelligence: { x: 120, y: 314, width: 804, height: 214 },
  notices: { x: 120, y: 548, width: 804, height: 214 },
  brand: { x: 944, y: 314, width: 448, height: 448 },
  ecosystem: { x: 120, y: 925, width: 1272, height: 214 },
} as const
const stackMotion = {
  depth: 320,
  initialOffset: 601,
  intermediateOffset: 133,
  pushZ: -400,
  tiltX: -0.48,
  tiltY: -0.36,
  scrub: 0.6,
} as const
const stackSourceRow = { x: 120, y: 782, width: 1272, height: 123, gap: 20 } as const
const stackFrustum = { breathingRoom: 1.12 } as const

type StackPlateDimensions = { x: number; y: number; width: number; height: number }
type StackScenePalette = {
  surface: string
  inverse: string
  text: string
  secondary: string
  accent: string
  fontFamily: string
}

function platePosition(plate: StackPlateDimensions, z = 0, yOffset = 0): [number, number, number] {
  return [
    plate.x + plate.width / 2 - stackViewbox.width / 2,
    stackViewbox.height / 2 - plate.y - plate.height / 2 + yOffset,
    z,
  ]
}

export { platePosition, stackFrustum, stackMotion, stackPlates, stackSourceRow, stackViewbox }
export type { StackPlateDimensions, StackScenePalette }
