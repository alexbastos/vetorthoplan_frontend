"use client"

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

const vertexShaderSource = `
  attribute vec2 position;

  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

const fragmentShaderSource = `
  precision mediump float;

  uniform vec2 resolution;
  uniform float time;
  uniform float dotSize;
  uniform float cellSize;
  uniform float speed;
  uniform vec3 color;

  const float PHI = 1.61803398874989484820459;

  float random(vec2 coordinates) {
    return fract(tan(distance(coordinates * PHI, coordinates)) * coordinates.x);
  }

  void main() {
    vec2 coordinates = gl_FragCoord.xy;
    vec2 cell = floor(coordinates / cellSize);
    float id = random(cell + 1.0);
    float shimmer = (sin(time * speed + id * 20.0) + 1.0) * 0.5;
    vec2 dotCoordinates = fract(coordinates / cellSize);
    float dot = step(max(dotCoordinates.x, dotCoordinates.y), dotSize / cellSize);

    gl_FragColor = vec4(color, dot * shimmer);
  }
`

type ShimmerDotsProps = {
  className?: string
  isActive: boolean
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)

  if (!shader) {
    return null
  }

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }

  return shader
}

function ShimmerDots({ className, isActive }: ShimmerDotsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isActiveRef = useRef(isActive)
  const syncPlaybackRef = useRef<() => void>(() => undefined)

  useEffect(() => {
    isActiveRef.current = isActive
    syncPlaybackRef.current()
  }, [isActive])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return undefined
    }

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: "low-power",
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      stencil: false,
    })

    if (!gl) {
      return undefined
    }

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)

    if (!vertexShader || !fragmentShader) {
      if (vertexShader) gl.deleteShader(vertexShader)
      if (fragmentShader) gl.deleteShader(fragmentShader)
      return undefined
    }

    const program = gl.createProgram()

    if (!program) {
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
      return undefined
    }

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program)
      return undefined
    }

    const buffer = gl.createBuffer()
    const positionLocation = gl.getAttribLocation(program, "position")
    const resolutionLocation = gl.getUniformLocation(program, "resolution")
    const timeLocation = gl.getUniformLocation(program, "time")
    const dotSizeLocation = gl.getUniformLocation(program, "dotSize")
    const cellSizeLocation = gl.getUniformLocation(program, "cellSize")
    const speedLocation = gl.getUniformLocation(program, "speed")
    const colorLocation = gl.getUniformLocation(program, "color")

    if (!buffer || positionLocation < 0) {
      if (buffer) gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      return undefined
    }

    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    )
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
    gl.uniform1f(speedLocation, 5)
    gl.uniform3f(colorLocation, 0.043, 0.122, 0.227)

    let pixelRatio = 1
    let animationFrame = 0
    let isInView = true
    let contextLost = false
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.round(bounds.width * pixelRatio))
      const height = Math.max(1, Math.round(bounds.height * pixelRatio))

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
        gl.uniform2f(resolutionLocation, width, height)
        gl.uniform1f(dotSizeLocation, pixelRatio)
        gl.uniform1f(cellSizeLocation, 3 * pixelRatio)
      }
    }

    const render = (timestamp: number) => {
      if (contextLost) return

      gl.uniform1f(timeLocation, timestamp / 1000)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      if (
        !prefersReducedMotion
        && isActiveRef.current
        && isInView
        && document.visibilityState === "visible"
      ) {
        animationFrame = window.requestAnimationFrame(render)
      }
    }

    const syncPlayback = () => {
      window.cancelAnimationFrame(animationFrame)

      if (prefersReducedMotion) {
        render(800)
        return
      }

      if (isActiveRef.current && isInView && document.visibilityState === "visible") {
        animationFrame = window.requestAnimationFrame(render)
      }
    }

    syncPlaybackRef.current = syncPlayback

    const resizeObserver = new ResizeObserver(resize)
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isInView = entry?.isIntersecting ?? false
        syncPlayback()
      },
      { threshold: 0.1 },
    )
    const handleContextLost = (event: Event) => {
      event.preventDefault()
      contextLost = true
      window.cancelAnimationFrame(animationFrame)
    }

    resizeObserver.observe(canvas)
    intersectionObserver.observe(canvas)
    document.addEventListener("visibilitychange", syncPlayback)
    canvas.addEventListener("webglcontextlost", handleContextLost)
    resize()
    render(prefersReducedMotion ? 800 : performance.now())

    return () => {
      window.cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener("visibilitychange", syncPlayback)
      canvas.removeEventListener("webglcontextlost", handleContextLost)
      syncPlaybackRef.current = () => undefined
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className={cn("block size-full", className)} />
}

export { ShimmerDots }
export type { ShimmerDotsProps }
