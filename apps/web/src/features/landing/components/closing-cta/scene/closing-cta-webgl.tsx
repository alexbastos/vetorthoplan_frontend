"use client"

import { Canvas, useThree } from "@react-three/fiber"
import { useEffect } from "react"

import { ClosingCtaPipeline } from "./closing-cta-pipeline"
import type { ClosingCtaWebglProps } from "./closing-cta-types"
import { useClosingCtaVideoMedia } from "./use-closing-cta-video-media"

function CanvasContextGuard({ onFailure }: Pick<ClosingCtaWebglProps, "onFailure">) {
  const gl = useThree((state) => state.gl)

  useEffect(() => {
    const canvas = gl.domElement
    const handleContextLost = (event: Event) => {
      event.preventDefault()
      onFailure()
    }

    canvas.addEventListener("webglcontextlost", handleContextLost)
    return () => canvas.removeEventListener("webglcontextlost", handleContextLost)
  }, [gl, onFailure])

  return null
}

function ClosingCtaWebgl(props: ClosingCtaWebglProps) {
  const media = useClosingCtaVideoMedia(props)

  return (
    <Canvas
      dpr={[1, 1.5]}
      flat
      frameloop={props.visible ? "always" : "never"}
      gl={{
        alpha: true,
        antialias: false,
        depth: false,
        powerPreference: "high-performance",
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        stencil: false,
      }}
      style={{ height: "100%", pointerEvents: "none", width: "100%" }}
    >
      <CanvasContextGuard onFailure={props.onFailure} />
      {media ? <ClosingCtaPipeline media={media} /> : null}
    </Canvas>
  )
}

export { ClosingCtaWebgl }
