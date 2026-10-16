"use client"

import { createPortal } from "react-dom"
import { useSyncExternalStore, type ReactNode } from "react"

type HeaderActionsSlotProps = {
  children: ReactNode
}

/**
 * Permite que uma feature ocupe o slot de ações do Header sem inverter a
 * dependência entre o shell compartilhado e a página que fornece as ações.
 */
function HeaderActionsSlot({ children }: HeaderActionsSlotProps) {
  const container = useSyncExternalStore(subscribeToHeaderActionsSlot, getHeaderActionsContainer, getServerSnapshot)

  return container ? createPortal(children, container) : null
}

function subscribeToHeaderActionsSlot() {
  return () => undefined
}

function getHeaderActionsContainer(): HTMLElement | null {
  return document.getElementById("app-header-actions")
}

function getServerSnapshot(): null {
  return null
}

export { HeaderActionsSlot }
export type { HeaderActionsSlotProps }
