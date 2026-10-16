"use client"

import dynamic from "next/dynamic"
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react"

import { ClosingCtaFallback } from "./closing-cta-fallback"
import styles from "./closing-cta.module.css"

const DynamicClosingCtaWebgl = dynamic(
  () => import("./scene/closing-cta-webgl").then((module) => module.ClosingCtaWebgl),
  { ssr: false, loading: () => null },
)

type CanvasBoundaryProps = {
  children: ReactNode
  onFailure: () => void
}

class CanvasBoundary extends Component<CanvasBoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onFailure()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

function ClosingCtaVisual() {
  const scope = useRef<HTMLDivElement>(null)
  const [eligible, setEligible] = useState(false)
  const [nearby, setNearby] = useState(false)
  const [visible, setVisible] = useState(false)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  const handleReady = useCallback(() => setReady(true), [])
  const handleFailure = useCallback(() => {
    setFailed(true)
    setReady(false)
  }, [])

  useEffect(() => {
    const root = scope.current
    if (!root) return

    const motion = window.matchMedia("(prefers-reduced-motion: no-preference)")
    const updateEligibility = () => {
      setEligible(motion.matches)
      if (!motion.matches) setReady(false)
    }

    updateEligibility()
    motion.addEventListener("change", updateEligibility)

    if (typeof IntersectionObserver === "undefined") {
      setNearby(true)
      setVisible(true)
    }

    const loadObserver = typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(([entry]) => {
          if (entry?.isIntersecting) {
            setNearby(true)
            loadObserver?.disconnect()
          }
        }, { rootMargin: "320px" })
    const visibilityObserver = typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(([entry]) => {
          setVisible(entry?.isIntersecting ?? false)
        }, { threshold: 0.05 })

    loadObserver?.observe(root)
    visibilityObserver?.observe(root)

    return () => {
      motion.removeEventListener("change", updateEligibility)
      loadObserver?.disconnect()
      visibilityObserver?.disconnect()
    }
  }, [])

  const showCanvas = eligible && nearby && !failed

  return (
    <div
      ref={scope}
      aria-hidden="true"
      className={`${styles.visual} pointer-events-none z-0`}
      data-landing-closing-cta-visual={ready ? "webgl" : "fallback"}
    >
      <ClosingCtaFallback hidden={ready} />

      {showCanvas ? (
        <CanvasBoundary onFailure={handleFailure}>
          <div className={`${styles.visualLayer} ${styles.visualCanvas} ${ready ? styles.visualCanvasReady : ""}`}>
            <DynamicClosingCtaWebgl
              onFailure={handleFailure}
              onReady={handleReady}
              source="/videos/cta-illustration.webm"
              visible={visible}
            />
          </div>
        </CanvasBoundary>
      ) : null}
    </div>
  )
}

export { ClosingCtaVisual }
