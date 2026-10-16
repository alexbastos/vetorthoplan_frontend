"use client"

import { useEffect, useRef } from "react"

import styles from "./home-page.module.css"

function createRandom() {
  let seed = 61723

  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
}

function drawDataField(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, width: number, height: number) {
  const random = createRandom()
  const tokens = getComputedStyle(canvas)
  const palette = [
    tokens.getPropertyValue("--color-pewter").trim(),
    tokens.getPropertyValue("--color-graphite").trim(),
    tokens.getPropertyValue("--color-silver").trim(),
    tokens.getPropertyValue("--color-silver").trim(),
  ]
  const glyphs = ["0", "1", "2", "7", "+", "/", ":"]
  const mono = tokens.getPropertyValue("--font-jetbrains-mono").trim() || "monospace"
  const spacing = 6.2
  const imageEdgeX = width

  context.textAlign = "center"
  context.textBaseline = "middle"
  context.font = `3.2px ${mono}, monospace`

  for (let row = 0; row * spacing < height; row += 1) {
    const y = (row + 0.5) * spacing + (random() - 0.5) * 0.9
    if (y >= height) continue
    const progress = y / height
    const bulge = Math.sin(Math.PI * progress) ** 1.35
    const maxReach = width * (0.14 + bulge * (0.64 + 0.025 * Math.sin(progress * 15.6)))

    for (let column = 0; column * spacing < maxReach; column += 1) {
      const glyph = random() < 0.13 ? glyphs[Math.floor(random() * glyphs.length)] : null
      const sizeRoll = random()
      const radius = sizeRoll < 0.75 ? 1.8 + random() * 0.5 : sizeRoll < 0.95 ? 1.2 + random() * 0.4 : 0.8 + random() * 0.2
      const inset = glyph ? 1.6 : radius
      const stagger = column === 0 ? 0 : (row % 2) * spacing * 0.42
      const jitter = column === 0 ? random() * 0.35 : (random() - 0.5) * 1.2
      const distanceFromEdge = inset + column * spacing + stagger + jitter
      if (distanceFromEdge >= maxReach) break

      const x = imageEdgeX - distanceFromEdge
      const proximity = 1 - distanceFromEdge / maxReach
      const pockets = 0.92 + 0.06 * Math.sin(y * 0.075 + x * 0.027) + 0.02 * Math.sin(y * 0.17 - x * 0.047)
      if (random() > (0.08 + 0.88 * proximity ** 0.7) * pockets) continue

      const opacityRoll = random()
      const baseOpacity = opacityRoll < 0.15 ? 0.08 : opacityRoll < 0.45 ? 0.11 : opacityRoll < 0.78 ? 0.14 : opacityRoll < 0.94 ? 0.17 : 0.2
      context.globalAlpha = baseOpacity * proximity ** 1.15
      context.fillStyle = palette[Math.floor(random() * palette.length)]

      if (glyph) {
        context.fillText(glyph, x, y)
      } else {
        context.beginPath()
        context.arc(x, y, radius, 0, Math.PI * 2)
        context.fill()
      }
    }
  }

  context.globalAlpha = 1
}

function HomeDataTransition() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return

    const render = () => {
      const { width, height } = canvas.getBoundingClientRect()
      if (width === 0 || height === 0) return

      const ratio = window.devicePixelRatio || 1
      const pixelWidth = Math.max(1, Math.round(width * ratio))
      const pixelHeight = Math.max(1, Math.round(height * ratio))
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth
        canvas.height = pixelHeight
      }

      context.setTransform(pixelWidth / width, 0, 0, pixelHeight / height, 0, 0)
      context.clearRect(0, 0, width, height)
      drawDataField(context, canvas, width, height)
    }

    const observer = new ResizeObserver(render)
    observer.observe(canvas)
    window.addEventListener("resize", render)
    render()

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", render)
    }
  }, [])

  return <canvas aria-hidden="true" className={styles.dataTransition} ref={canvasRef} />
}

export { HomeDataTransition }
