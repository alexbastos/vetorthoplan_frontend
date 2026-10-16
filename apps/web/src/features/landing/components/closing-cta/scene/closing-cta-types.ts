import type { VideoTexture } from "three"

type ClosingCtaWebglProps = {
  source: string
  visible: boolean
  onReady: () => void
  onFailure: () => void
}

type ClosingCtaVideoMedia = {
  element: HTMLVideoElement
  texture: VideoTexture
}

export type { ClosingCtaVideoMedia, ClosingCtaWebglProps }
