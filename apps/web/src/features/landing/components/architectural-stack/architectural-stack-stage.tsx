"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react"

import { cn } from "@/lib/utils"

import type { ArchitecturalStackDiagramContent } from "./architectural-stack-content"
import styles from "./architectural-stack-stage.module.css"
import { StackSceneBoundary } from "./scene/stack-scene-boundary"
import { useStackSceneEnvironment } from "./scene/use-stack-scene-environment"

const DynamicStackSceneCanvas = dynamic(
  () => import("./scene/stack-scene-canvas").then((module) => module.StackSceneCanvas),
  { ssr: false, loading: () => null },
)

type ArchitecturalStackStageProps = {
  content: ArchitecturalStackDiagramContent
  fallback: ReactNode
  trigger: RefObject<HTMLDivElement | null>
}

function ArchitecturalStackStage({ content, fallback, trigger }: ArchitecturalStackStageProps) {
  const scope = useRef<HTMLDivElement>(null)
  const { enabled, visible, palette } = useStackSceneEnvironment(scope)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const paletteKey = JSON.stringify(palette)
  const handleReady = useCallback(() => setReady(true), [])
  const handleFailure = useCallback(() => {
    setFailed(true)
    setReady(false)
  }, [])
  const showCanvas = enabled && !failed && palette !== null
  const enhanced = showCanvas && ready
  const status = failed ? "failed" : enhanced ? "ready" : showCanvas ? "loading" : "static"

  useEffect(() => { setReady(false) }, [enabled, paletteKey])
  useEffect(() => {
    if (!showCanvas || !visible || ready) return
    // Keep the semantic fallback if font loading or SDF generation never completes.
    const timeout = window.setTimeout(handleFailure, 30_000)
    return () => window.clearTimeout(timeout)
  }, [showCanvas, visible, ready, paletteKey, handleFailure])

  return (
    <div
      ref={scope}
      className={cn("relative w-full", styles.stage)}
      data-stack-renderer={enhanced ? "webgl" : "html"}
      data-stack-status={status}
    >
      <div className={styles.fallback}>
        {fallback}
      </div>

      {showCanvas && palette && (
        <StackSceneBoundary onFailure={handleFailure}>
          <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", !ready && "opacity-0")}>
            <DynamicStackSceneCanvas
              key={paletteKey}
              content={content}
              onFailure={handleFailure}
              onReady={handleReady}
              palette={palette}
              trigger={trigger}
              visible={visible}
            />
          </div>
        </StackSceneBoundary>
      )}

    </div>
  )
}

export { ArchitecturalStackStage }
