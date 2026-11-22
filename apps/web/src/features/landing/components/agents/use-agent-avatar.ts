"use client"

import type { MountedAvatar } from "open-bot-avatar/dom"
import { useEffect, type RefObject } from "react"

type AgentAvatarOptions = {
  definitionSrc: string
  color: string
  restingLook: { x: number; y: number }
}

function useAgentAvatar(rootRef: RefObject<HTMLDivElement | null>, hostRef: RefObject<HTMLDivElement | null>, {
  definitionSrc, color, restingLook: { x: restingX, y: restingY },
}: AgentAvatarOptions) {
  useEffect(() => {
    const root = rootRef.current
    const host = hostRef.current
    if (!root || !host) return

    const card = root.closest("article")
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)")
    const restingLook = { x: restingX, y: restingY }
    let avatar: MountedAvatar | null = null
    let abort: AbortController | null = null
    let readyObserver: MutationObserver | null = null
    let disposed = false
    let nearby = false
    let loading = false
    let failed = false
    let generation = 0
    let following = false

    const syncGaze = () => avatar?.update({
      followPointer: following && finePointer.matches,
      lookAt: following && finePointer.matches ? null : restingLook,
    })
    const enter = (event: Event) => {
      following = (event as PointerEvent).pointerType === "mouse" && finePointer.matches
      syncGaze()
    }
    const leave = () => { following = false; syncGaze() }
    const syncVisibility = () => avatar?.update({ still: document.hidden })

    const stop = () => {
      generation += 1
      abort?.abort()
      abort = null
      loading = false
      readyObserver?.disconnect()
      readyObserver = null
      root.dataset.liveReady = "false"
      avatar?.destroy()
      avatar = null
    }

    const start = async () => {
      if (disposed || motion.matches || !nearby || avatar || loading || failed) return
      loading = true
      const request = ++generation
      const controller = new AbortController()
      abort = controller

      try {
        const [core, runtime, definition] = await Promise.all([
          import("open-bot-avatar"),
          import("open-bot-avatar/dom"),
          fetch(definitionSrc, { signal: controller.signal }).then(response => {
            if (!response.ok) throw new Error("Avatar definition unavailable")
            return response.json() as Promise<unknown>
          }),
        ])
        if (disposed || motion.matches || request !== generation) return
        const result = core.validateAvatar(definition)
        if (!result.ok) throw new Error("Invalid avatar definition")

        // Keep the original SVG visible until the renderer actually mounts.
        readyObserver = new MutationObserver(() => {
          if (disposed || request !== generation) return
          if (!host.querySelector("canvas, [data-avatar-scene]")) return
          root.dataset.liveReady = "true"
          readyObserver?.disconnect()
          readyObserver = null
        })
        readyObserver.observe(host, { childList: true, subtree: true })
        following = Boolean(card?.matches(":hover")) && finePointer.matches
        avatar = runtime.mountAvatar(host, {
          definition: result.value, color, eyeColor: "#151515", depth: 6,
          state: "idle", mood: "neutral", renderer: "canvas", label: "",
          reducedMotion: "system", still: document.hidden,
          followPointer: following, lookAt: following ? null : restingLook,
        })
      } catch {
        if (disposed || request !== generation) return
        stop()
        failed = true // Network/validation failure retains the static illustration.
      } finally {
        if (request === generation) loading = false
      }
    }

    const syncMotion = () => {
      if (motion.matches) stop()
      else void start()
    }
    const observer = new IntersectionObserver(entries => {
      nearby = entries[entries.length - 1].isIntersecting
      if (nearby) void start()
    }, { rootMargin: "160px" })
    observer.observe(root)
    card?.addEventListener("pointerenter", enter)
    card?.addEventListener("pointerleave", leave)
    motion.addEventListener("change", syncMotion)
    finePointer.addEventListener("change", leave)
    document.addEventListener("visibilitychange", syncVisibility)

    return () => {
      disposed = true
      observer.disconnect()
      card?.removeEventListener("pointerenter", enter)
      card?.removeEventListener("pointerleave", leave)
      motion.removeEventListener("change", syncMotion)
      finePointer.removeEventListener("change", leave)
      document.removeEventListener("visibilitychange", syncVisibility)
      stop()
    }
  }, [rootRef, hostRef, definitionSrc, color, restingX, restingY])
}

export { useAgentAvatar }
export type { AgentAvatarOptions }
