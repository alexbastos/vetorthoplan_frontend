import { useEffect, useState } from "react"
import { LinearFilter, VideoTexture } from "three"

import type { ClosingCtaVideoMedia, ClosingCtaWebglProps } from "./closing-cta-types"

const CTA_VIDEO_PLAYBACK_RATE = 0.65

function useClosingCtaVideoMedia({ source, visible, onReady, onFailure }: ClosingCtaWebglProps) {
  const [media, setMedia] = useState<ClosingCtaVideoMedia | null>(null)

  useEffect(() => {
    const video = document.createElement("video")
    const texture = new VideoTexture(video)
    let disposed = false
    let frameCallback = 0
    let animationFrame = 0

    video.autoplay = false
    video.crossOrigin = "anonymous"
    video.loop = true
    video.muted = true
    video.playsInline = true
    video.preload = "auto"
    video.defaultPlaybackRate = CTA_VIDEO_PLAYBACK_RATE
    video.playbackRate = CTA_VIDEO_PLAYBACK_RATE
    texture.generateMipmaps = false
    texture.magFilter = LinearFilter
    texture.minFilter = LinearFilter

    const announceReady = () => {
      if (!disposed) onReady()
    }
    const handleLoadedData = () => {
      if ("requestVideoFrameCallback" in video) {
        frameCallback = video.requestVideoFrameCallback(announceReady)
      } else {
        animationFrame = window.requestAnimationFrame(announceReady)
      }
    }
    const handleError = () => {
      if (!disposed) onFailure()
    }

    video.addEventListener("loadeddata", handleLoadedData, { once: true })
    video.addEventListener("error", handleError, { once: true })
    video.src = source
    video.load()
    setMedia({ element: video, texture })

    return () => {
      disposed = true
      video.pause()
      if (frameCallback && "cancelVideoFrameCallback" in video) {
        video.cancelVideoFrameCallback(frameCallback)
      }
      window.cancelAnimationFrame(animationFrame)
      video.removeEventListener("loadeddata", handleLoadedData)
      video.removeEventListener("error", handleError)
      video.removeAttribute("src")
      video.load()
      texture.dispose()
    }
  }, [source, onFailure, onReady])

  useEffect(() => {
    if (!media) return

    const syncPlayback = () => {
      if (visible && document.visibilityState === "visible") {
        void media.element.play().catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return
          onFailure()
        })
      } else {
        media.element.pause()
      }
    }

    syncPlayback()
    document.addEventListener("visibilitychange", syncPlayback)
    return () => document.removeEventListener("visibilitychange", syncPlayback)
  }, [media, visible, onFailure])

  return media
}

export { useClosingCtaVideoMedia }
