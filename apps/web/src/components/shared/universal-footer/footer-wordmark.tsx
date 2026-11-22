"use client"

import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import Image from "next/image"

const SOURCE = "/brand/wordmark-orthovet.svg"
const COLOR = "#a0a0a0"

type Particle = {
  x: number
  y: number
  originX: number
  originY: number
  vx: number
  vy: number
  ease: number
  targetEase: number
  friction: number
}

function FooterWordmark() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !wrapper || !context) return

    const media = window.matchMedia("(prefers-reduced-motion: no-preference)")
    if (!media.matches) return

    const image = new window.Image()
    image.src = SOURCE
    let particles: Particle[] = []
    let frame: (() => void) | null = null
    let observer: IntersectionObserver | null = null
    let resizeObserver: ResizeObserver | null = null
    let isVisible = false
    let width = 0
    let height = 0
    let dpr = 1
    let mouseX = -1000
    let mouseY = -1000
    let mouseActive = false
    let mouseTimeout: ReturnType<typeof setTimeout> | undefined

    const resize = () => {
      if (!image.complete || !image.naturalWidth) return
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = wrapper.clientWidth
      height = wrapper.clientHeight
      canvas.width = Math.round(width * 1.5 * dpr)
      canvas.height = Math.round(height * 3 * dpr)

      const renderWidth = width * 0.98 * dpr
      const renderHeight = renderWidth * image.naturalHeight / image.naturalWidth
      const offsetX = (canvas.width - renderWidth) / 2
      const offsetY = (canvas.height - renderHeight) / 2
      const scratch = document.createElement("canvas")
      scratch.width = canvas.width
      scratch.height = canvas.height
      const scratchContext = scratch.getContext("2d", { willReadFrequently: true })
      if (!scratchContext) return
      scratchContext.drawImage(image, offsetX, offsetY, renderWidth, renderHeight)
      const pixels = scratchContext.getImageData(0, 0, scratch.width, scratch.height).data
      const gap = 4 * dpr
      const nextParticles: Particle[] = []

      for (let y = Math.max(0, offsetY); y < Math.min(canvas.height, offsetY + renderHeight); y += gap) {
        for (let x = Math.max(0, offsetX); x < Math.min(canvas.width, offsetX + renderWidth); x += gap) {
          const index = 4 * (Math.floor(y) * canvas.width + Math.floor(x))
          if (pixels[index + 3] > 80) {
            nextParticles.push({
              x: Math.random() * canvas.width,
              y: Math.random() * canvas.height,
              originX: x,
              originY: y,
              vx: 0,
              vy: 0,
              ease: 0.04 + Math.random() * 0.04,
              targetEase: 0.2 + Math.random() * 0.2,
              friction: 0.8 + Math.random() * 0.15,
            })
          }
        }
      }
      particles = nextParticles
      context.clearRect(0, 0, canvas.width, canvas.height)
    }

    const animate = () => {
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.fillStyle = COLOR
      for (const particle of particles) {
        if (mouseActive) {
          const dx = mouseX - particle.x
          const dy = mouseY - particle.y
          const distanceSquared = dx * dx + dy * dy
          const radius = Math.sqrt(3000 * dpr)
          if (distanceSquared < radius * radius) {
            const distance = Math.sqrt(distanceSquared) || 1
            const force = -((radius - distance) / radius) * 150 * (0.5 + Math.random())
            particle.ease = particle.targetEase
            particle.vx += (dx / distance) * force + Math.random() - 0.5
            particle.vy += (dy / distance) * force + Math.random() - 0.5
          }
        }
        particle.x += (particle.vx *= particle.friction) + (particle.originX - particle.x) * particle.ease
        particle.y += (particle.vy *= particle.friction) + (particle.originY - particle.y) * particle.ease
        context.beginPath()
        context.arc(particle.x, particle.y, dpr, 0, Math.PI * 2)
        context.fill()
      }
    }

    const start = () => {
      if (!frame) {
        wrapper.dataset.particlesActive = "true"
        frame = animate
        gsap.ticker.add(frame)
      }
    }
    const stop = () => {
      if (frame) gsap.ticker.remove(frame)
      frame = null
      delete wrapper.dataset.particlesActive
    }
    const updatePlayback = () => {
      if (isVisible && media.matches) start()
      else stop()
    }
    const onVisibilityChange = ([entry]: IntersectionObserverEntry[]) => {
      isVisible = Boolean(entry?.isIntersecting)
      updatePlayback()
    }
    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseX = (event.clientX - rect.left) * dpr
      mouseY = (event.clientY - rect.top) * dpr
      mouseActive = true
      clearTimeout(mouseTimeout)
      mouseTimeout = setTimeout(() => { mouseActive = false }, 100)
    }

    image.onload = resize
    if (image.complete) resize()
    wrapper.addEventListener("pointermove", onPointerMove)
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(wrapper)
    media.addEventListener("change", updatePlayback)
    observer = new IntersectionObserver(onVisibilityChange, { threshold: 0.05 })
    observer.observe(wrapper)

    return () => {
      stop()
      observer?.disconnect()
      resizeObserver?.disconnect()
      media.removeEventListener("change", updatePlayback)
      wrapper.removeEventListener("pointermove", onPointerMove)
      clearTimeout(mouseTimeout)
    }
  }, [])

  return (
    <div className="universal-footer__wordmark" ref={wrapperRef}>
      <Image alt="ORTHOVET" className="universal-footer__wordmark-image" height={206} src={SOURCE} unoptimized width={1200} />
      <canvas aria-hidden="true" className="universal-footer__wordmark-canvas" ref={canvasRef} />
    </div>
  )
}

export { FooterWordmark }
