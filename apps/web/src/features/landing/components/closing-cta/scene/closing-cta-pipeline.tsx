import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import {
  BufferAttribute,
  BufferGeometry,
  Camera,
  LinearFilter,
  Mesh,
  RawShaderMaterial,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from "three"

import {
  lineFragmentShader,
  lineVertexShader,
  videoFragmentShader,
  videoVertexShader,
} from "./closing-cta-shaders"
import type { ClosingCtaVideoMedia } from "./closing-cta-types"

const HOVER_SCALE = 1.04

function createQuadGeometry() {
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new BufferAttribute(new Float32Array([
    -1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0,
  ]), 3))
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array([
    0, 0, 1, 0, 0, 1, 1, 1,
  ]), 2))
  geometry.setIndex(new BufferAttribute(new Uint16Array([0, 1, 2, 2, 1, 3]), 1))
  return geometry
}

function ClosingCtaPipeline({ media }: { media: ClosingCtaVideoMedia }) {
  const { gl, size } = useThree()
  const targetOffset = useRef(new Vector2())
  const currentOffset = useRef(new Vector2())
  const currentScale = useRef(1)
  const hovered = useRef(false)
  const renderTarget = useMemo(() => new WebGLRenderTarget(1, 1, {
    depthBuffer: false,
    magFilter: LinearFilter,
    minFilter: LinearFilter,
    stencilBuffer: false,
  }), [])
  const resources = useMemo(() => {
    const geometry = createQuadGeometry()
    const camera = new Camera()
    const videoMaterial = new RawShaderMaterial({
      depthTest: false,
      depthWrite: false,
      fragmentShader: videoFragmentShader,
      uniforms: {
        u_offset: { value: new Vector2() },
        u_scale: { value: 1 },
        u_texAspect: { value: 1 },
        u_texture: { value: media.texture },
        u_viewAspect: { value: 1 },
      },
      vertexShader: videoVertexShader,
    })
    const lineMaterial = new RawShaderMaterial({
      depthTest: false,
      depthWrite: false,
      fragmentShader: lineFragmentShader,
      premultipliedAlpha: true,
      transparent: true,
      uniforms: {
        u_blankSpots: { value: 1 },
        u_capRoundness: { value: 0.44 },
        u_contrast: { value: 3.1 },
        u_gapCell: { value: 0.045 },
        u_invert: { value: 0 },
        u_lineColors: { value: [
          new Vector3(1, 1, 1),
          new Vector3(0.784, 0.545, 0.114),
          new Vector3(0.761, 0.847, 0.91),
          new Vector3(1, 1, 1),
        ] },
        u_lineScale: { value: 0.66 },
        u_resolution: { value: 0.07 },
        u_resolutionPixels: { value: new Vector2(1, 1) },
        u_showGaps: { value: 1 },
        u_texture: { value: renderTarget.texture },
        u_vertical: { value: 1 },
      },
      vertexShader: lineVertexShader,
    })
    const videoScene = new Scene()
    const outputScene = new Scene()
    videoScene.add(new Mesh(geometry, videoMaterial))
    outputScene.add(new Mesh(geometry, lineMaterial))

    return { camera, geometry, lineMaterial, outputScene, videoMaterial, videoScene }
  }, [media.texture, renderTarget.texture])

  useLayoutEffect(() => {
    const dpr = Math.min(gl.getPixelRatio(), 1.5)
    renderTarget.setSize(
      Math.max(1, Math.round(size.width * dpr)),
      Math.max(1, Math.round(size.height * dpr)),
    )
    resources.lineMaterial.uniforms.u_resolutionPixels.value.set(size.width, size.height)
  }, [gl, renderTarget, resources.lineMaterial, size.height, size.width])

  useEffect(() => {
    const canvas = gl.domElement
    const section = canvas.closest<HTMLElement>("[data-landing-closing-cta]")
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)")
    if (!section) return

    const handlePointerEnter = () => {
      if (finePointer.matches) hovered.current = true
    }
    const handlePointerMove = (event: PointerEvent) => {
      if (!finePointer.matches || currentScale.current <= 1) {
        targetOffset.current.set(0, 0)
        return
      }

      const bounds = canvas.getBoundingClientRect()
      const normalizedX = (event.clientX - bounds.left) / Math.max(bounds.width, 1)
      const normalizedY = (event.clientY - bounds.top) / Math.max(bounds.height, 1)
      const maxTravel = (currentScale.current - 1) / 2
      targetOffset.current.set(
        (normalizedX - 0.5) * 2 * maxTravel,
        (0.5 - normalizedY) * 2 * maxTravel,
      )
    }
    const handlePointerLeave = () => {
      hovered.current = false
      targetOffset.current.set(0, 0)
    }

    section.addEventListener("pointerenter", handlePointerEnter)
    section.addEventListener("pointermove", handlePointerMove)
    section.addEventListener("pointerleave", handlePointerLeave)
    return () => {
      section.removeEventListener("pointerenter", handlePointerEnter)
      section.removeEventListener("pointermove", handlePointerMove)
      section.removeEventListener("pointerleave", handlePointerLeave)
    }
  }, [gl])

  useEffect(() => () => {
    resources.geometry.dispose()
    resources.lineMaterial.dispose()
    resources.videoMaterial.dispose()
    renderTarget.dispose()
  }, [renderTarget, resources])

  useFrame((_, delta) => {
    const targetScale = hovered.current ? HOVER_SCALE : 1
    const scaleSpeed = targetScale > currentScale.current ? 8 : 6
    currentScale.current += (targetScale - currentScale.current) * (1 - Math.exp(-scaleSpeed * delta))

    const resetting = targetOffset.current.x === 0 && targetOffset.current.y === 0
    const offsetSpeed = resetting ? 14 : 4
    currentOffset.current.lerp(targetOffset.current, 1 - Math.exp(-offsetSpeed * delta))

    const videoUniforms = resources.videoMaterial.uniforms
    videoUniforms.u_scale.value = currentScale.current
    videoUniforms.u_offset.value.copy(currentOffset.current)
    videoUniforms.u_viewAspect.value = size.width / Math.max(size.height, 1)
    videoUniforms.u_texAspect.value = media.element.videoWidth > 0 && media.element.videoHeight > 0
      ? media.element.videoWidth / media.element.videoHeight
      : 1

    gl.setRenderTarget(renderTarget)
    gl.setClearColor(0x000000, 0)
    gl.clear()
    gl.render(resources.videoScene, resources.camera)
    gl.setRenderTarget(null)
    gl.setClearColor(0x000000, 0)
    gl.clear()
    gl.render(resources.outputScene, resources.camera)
  }, 1)

  return null
}

export { ClosingCtaPipeline }
