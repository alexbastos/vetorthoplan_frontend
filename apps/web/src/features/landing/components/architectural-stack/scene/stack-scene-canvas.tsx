"use client"

import { createRoot, extend, useFrame, useLoader, useThree, type ReconcilerRoot } from "@react-three/fiber"
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react"
import { Color, Group, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, TextureLoader, type OrthographicCamera } from "three"

import { architecturalStackLayerIds, architecturalStackSourceDefinitions, architecturalStackSourceLogoSources, type ArchitecturalStackDiagramContent } from "../architectural-stack-content"
import { StackExtrudedPlate } from "./stack-extruded-plate"
import { StackSceneBoundary } from "./stack-scene-boundary"
import { platePosition, stackFrustum, stackMotion, stackPlates, stackSourceRow, stackViewbox, type StackScenePalette } from "./stack-scene-config"
import { useStackScrollTimeline } from "./use-stack-scroll-timeline"

extend({ Group, Mesh, MeshBasicMaterial, PlaneGeometry, LineSegments, LineBasicMaterial })

type StackSceneCanvasProps = {
  content: ArchitecturalStackDiagramContent
  palette: StackScenePalette
  trigger: RefObject<HTMLDivElement | null>
  visible: boolean
  onReady: () => void
  onFailure: () => void
}

function CanvasContextGuard({ visible }: { visible: boolean }) {
  const gl = useThree((state) => state.gl)
  const setFrameloop = useThree((state) => state.setFrameloop)
  const invalidate = useThree((state) => state.invalidate)
  useLayoutEffect(() => {
    setFrameloop(visible ? "always" : "never")
    if (visible) invalidate()
  }, [visible, setFrameloop, invalidate])
  useEffect(() => {
    const handleContextLost = (event: Event) => {
      // Allow the browser to restore the same renderer after reclaiming GPU
      // resources while the tab is in the background.
      event.preventDefault()
    }
    const handleContextRestored = () => invalidate()
    const canvas = gl.domElement
    canvas.addEventListener("webglcontextlost", handleContextLost)
    canvas.addEventListener("webglcontextrestored", handleContextRestored)
    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost)
      canvas.removeEventListener("webglcontextrestored", handleContextRestored)
    }
  }, [gl, invalidate])
  return null
}

function Scene({ content, palette, trigger, onReady }: StackSceneCanvasProps) {
  const { camera, size, invalidate, gl } = useThree()
  const center = useRef<Group>(null)
  const rotation = useRef<Group>(null)
  const ecosystem = useRef<Group>(null)
  const intelligence = useRef<Group>(null)
  const notices = useRef<Group>(null)
  const brand = useRef<Group>(null)
  const sources = useRef<(Group | null)[]>([])
  const announcedReady = useRef(false)
  const readyTexts = useRef(new Set<string>())
  const expectedTexts = architecturalStackSourceDefinitions.length + architecturalStackLayerIds.reduce(
    (count, id) => count + 1 + (content.layers[id].description ? 1 : 0), 0,
  )
  const handleTextReady = useCallback((id: string) => {
    readyTexts.current.add(id)
  }, [])
  const handles = useMemo(() => ({ rotation, ecosystem, intelligence, notices, brand, sources }), [])
  const surfaceColor = new Color(palette.surface)
  const surfaceIsLight = surfaceColor.r * 0.2126 + surfaceColor.g * 0.7152 + surfaceColor.b * 0.0722 > 0.5
  const logo = useLoader(TextureLoader, surfaceIsLight ? "/brand/logo_black.svg" : "/brand/logo_white.svg")

  useLayoutEffect(() => {
    const orthographic = camera as OrthographicCamera
    const aspect = size.width / Math.max(size.height, 1)
    const targetAspect = stackViewbox.width / stackViewbox.height
    const verticalRadius = aspect > targetAspect
      ? stackFrustum.breathingRoom * stackViewbox.height / 2
      : stackFrustum.breathingRoom * stackViewbox.width / (2 * aspect)
    const horizontalRadius = verticalRadius * aspect
    orthographic.left = -horizontalRadius
    orthographic.right = horizontalRadius
    orthographic.top = verticalRadius
    orthographic.bottom = -verticalRadius
    orthographic.updateProjectionMatrix()
    invalidate()
  }, [camera, size.width, size.height, invalidate])

  useEffect(() => {
    logo.colorSpace = SRGBColorSpace
    logo.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
    logo.needsUpdate = true
    invalidate()
  }, [logo, gl, invalidate])

  useStackScrollTimeline(trigger, handles, invalidate)

  useFrame(() => {
    if (center.current && ecosystem.current) {
      const topY = platePosition(stackPlates.municipality)[1]
      const midpointY = -(topY + ecosystem.current.position.y) / 2
      if (center.current.position.y !== midpointY) center.current.position.y = midpointY
    }
    if (!announcedReady.current && readyTexts.current.size >= expectedTexts) {
      announcedReady.current = true
      onReady()
    }
  })

  return (
    <group ref={center}>
      <group ref={rotation}>
        {/* The reference hides incoming layers behind a plane matching the section. */}
        <mesh position={[0, 0, -185]}>
          <planeGeometry args={[5000, 5000]} />
          <meshBasicMaterial color={palette.surface} toneMapped={false} />
        </mesh>
        <group position={platePosition(stackPlates.municipality)}>
          <StackExtrudedPlate {...stackPlates.municipality} palette={palette} label={content.layers.municipality} labelId="municipality" onTextReady={handleTextReady} />
        </group>
        <group ref={intelligence} position={platePosition(stackPlates.intelligence, stackMotion.pushZ)}>
          <StackExtrudedPlate {...stackPlates.intelligence} palette={palette} label={content.layers.intelligence} labelId="intelligence" onTextReady={handleTextReady} />
        </group>
        <group ref={notices} position={platePosition(stackPlates.notices, stackMotion.pushZ)}>
          <StackExtrudedPlate {...stackPlates.notices} palette={palette} label={content.layers.notices} labelId="notices" onTextReady={handleTextReady} />
        </group>
        <group ref={brand} position={platePosition(stackPlates.brand, stackMotion.pushZ)}>
          <StackExtrudedPlate {...stackPlates.brand} palette={palette} />
          <mesh position={[0, 0, stackMotion.depth / 2 + 1.5]}>
            <planeGeometry args={[280, 70]} />
            <meshBasicMaterial map={logo} transparent depthWrite={false} toneMapped={false} />
          </mesh>
        </group>

        {architecturalStackSourceDefinitions.map(({ id, status }, index) => {
          const count = architecturalStackSourceDefinitions.length
          const logoSource = architecturalStackSourceLogoSources[id]
          const width = (stackSourceRow.width - (count - 1) * stackSourceRow.gap) / count
          const plate = {
            x: stackSourceRow.x + index * (width + stackSourceRow.gap),
            y: stackSourceRow.y,
            width,
            height: stackSourceRow.height,
          }
          return (
            <group
              key={id}
              position={platePosition(plate, stackMotion.pushZ)}
              ref={(group) => { sources.current[index] = group }}
            >
              <StackExtrudedPlate
                {...plate}
                palette={palette}
                label={{
                  title: content.sourceLabels[id],
                  source: true,
                  initial: status === "initial",
                  imageSrc: logoSource,
                }}
                labelId={`source:${id}`}
                onTextReady={handleTextReady}
              />
            </group>
          )
        })}

        <group ref={ecosystem} position={platePosition(stackPlates.ecosystem, 0, stackMotion.initialOffset)}>
          <StackExtrudedPlate {...stackPlates.ecosystem} palette={palette} label={content.layers.ecosystem} labelId="ecosystem" onTextReady={handleTextReady} />
        </group>
      </group>
    </group>
  )
}

function StackSceneCanvas(props: StackSceneCanvasProps) {
  const container = useRef<HTMLDivElement>(null)
  const renderer = useRef<ReconcilerRoot<HTMLCanvasElement> | null>(null)
  const configured = useRef(false)
  const latestProps = useRef(props)

  const renderScene = useCallback(() => {
    const current = latestProps.current
    renderer.current?.render(
      <StackSceneBoundary onFailure={current.onFailure}>
        <CanvasContextGuard visible={current.visible} />
        <Suspense fallback={null}>
          <Scene {...current} />
        </Suspense>
      </StackSceneBoundary>,
    )
  }, [])

  useLayoutEffect(() => {
    latestProps.current = props
    if (configured.current) renderScene()
  }, [props, renderScene])

  useEffect(() => {
    const host = container.current
    if (!host) return
    // Each mount owns a fresh canvas, including React's development remounts.
    const canvas = document.createElement("canvas")
    Object.assign(canvas.style, { width: "100%", height: "100%", display: "block", pointerEvents: "none" })
    host.appendChild(canvas)
    const root = createRoot(canvas)
    renderer.current = root
    let disposed = false
    let resizeObserver: ResizeObserver | null = null
    const size = () => {
      const bounds = host.getBoundingClientRect()
      return { width: Math.max(bounds.width, 1), height: Math.max(bounds.height, 1), top: 0, left: 0 }
    }
    const fail = () => {
      if (!disposed) latestProps.current.onFailure()
    }
    const options = {
      orthographic: true,
      camera: { manual: true, position: [0, 0, 1000] as [number, number, number], near: 0.1, far: 5000 },
      dpr: [1, 2] as [number, number],
      flat: true,
      gl: { antialias: true, alpha: true, powerPreference: "high-performance" as const },
    }
    const frameloop = () => latestProps.current.visible ? "always" as const : "never" as const
    const resize = () => {
      if (!disposed && configured.current) void root.configure({ ...options, frameloop: frameloop(), size: size() }).catch(fail)
    }

    // Catch asynchronous WebGL initialization too, not just React render errors.
    void root.configure({
      ...options,
      frameloop: frameloop(),
      size: size(),
    }).then(() => {
      if (disposed) return
      configured.current = true
      renderScene()
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(host)
      }
      window.addEventListener("resize", resize)
    }).catch(fail)

    return () => {
      disposed = true
      configured.current = false
      renderer.current = null
      resizeObserver?.disconnect()
      window.removeEventListener("resize", resize)
      root.unmount()
      canvas.remove()
    }
  }, [renderScene])

  return (
    <div
      ref={container}
      data-stack-text-renderer="sdf"
      style={{ width: "100%", height: "100%", pointerEvents: "none" }}
    />
  )
}

export { StackSceneCanvas }
