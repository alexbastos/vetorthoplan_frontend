"use client"

import { useRef } from "react"

import { useAgentAvatar, type AgentAvatarOptions } from "./use-agent-avatar"
import styles from "./agent-avatar.module.css"

type AgentAvatarProps = AgentAvatarOptions & { fallbackSrc: string; flipFallback?: boolean }

function AgentAvatar({ fallbackSrc, flipFallback = false, ...options }: AgentAvatarProps) {
  const root = useRef<HTMLDivElement>(null)
  const host = useRef<HTMLDivElement>(null)
  useAgentAvatar(root, host, options)

  return (
    <div ref={root} className={styles.avatar} data-live-ready="false" aria-hidden="true">
      <svg className={styles.fallback} viewBox="0 0 100 100" aria-hidden="true">
        <image href={fallbackSrc} width="100" height="100" preserveAspectRatio="xMidYMid meet"
          transform={flipFallback ? "translate(100 0) scale(-1 1)" : undefined} />
      </svg>
      <div ref={host} className={styles.host} />
    </div>
  )
}

export { AgentAvatar }
