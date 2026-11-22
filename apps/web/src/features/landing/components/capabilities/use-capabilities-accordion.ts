"use client"

import { useCallback, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent } from "react"

import type { CapabilityContent, CapabilityKey } from "./capabilities-content"

const serverMediaSnapshot = () => false

function useCapabilityMediaQuery(query: string) {
  const subscribe = useCallback((listener: () => void) => {
    const media = window.matchMedia(query)
    media.addEventListener("change", listener)
    return () => media.removeEventListener("change", listener)
  }, [query])
  const snapshot = useCallback(() => window.matchMedia(query).matches, [query])
  return useSyncExternalStore(subscribe, snapshot, serverMediaSnapshot)
}

function useCapabilitiesAccordion(items: readonly CapabilityContent[]) {
  const [selected, setSelected] = useState<CapabilityKey | null>(items[0]?.id ?? null)
  const triggers = useRef<Array<HTMLButtonElement | null>>([])
  const cards = useRef<Array<HTMLLIElement | null>>([])
  const desktop = useCapabilityMediaQuery("(min-width: 768px)")
  const finePointer = useCapabilityMediaQuery("(hover: hover) and (pointer: fine)")
  const activeId = selected ?? (desktop ? items[0]?.id ?? null : null)

  const select = (id: CapabilityKey) => setSelected(previous => !desktop && previous === id ? null : id)
  const pointerEnter = (event: PointerEvent<HTMLElement>, id: CapabilityKey) => {
    if (desktop && finePointer && event.pointerType !== "touch") setSelected(id)
  }
  const keyDown = (event: KeyboardEvent<HTMLElement>, index: number) => {
    if (event.target !== event.currentTarget) return
    if (desktop && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault()
      setSelected(items[index].id)
      return
    }
    let next: number
    if (event.key === "Home") next = 0
    else if (event.key === "End") next = items.length - 1
    else if (event.key === (desktop ? "ArrowRight" : "ArrowDown")) next = (index + 1) % items.length
    else if (event.key === (desktop ? "ArrowLeft" : "ArrowUp")) next = (index - 1 + items.length) % items.length
    else return
    event.preventDefault()
    setSelected(items[next].id)
    const target = desktop ? cards.current[next] : triggers.current[next]
    target?.focus()
  }
  const registerTrigger = (index: number, element: HTMLButtonElement | null) => { triggers.current[index] = element }
  const registerCard = (index: number, element: HTMLLIElement | null) => { cards.current[index] = element }

  return { activeId, desktop, select, pointerEnter, keyDown, registerTrigger, registerCard }
}

export { useCapabilitiesAccordion }
