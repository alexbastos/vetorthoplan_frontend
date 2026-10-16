"use client"

import { useQueryClient } from "@tanstack/react-query"
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react"

type LogoutEvent = {
  id: string
  type: "logout"
}

type SessionLifecycleContextValue = {
  completeLogout: () => void
}

const LOGOUT_CHANNEL = "captagov:session-lifecycle"
const LOGOUT_STORAGE_KEY = "captagov:session-lifecycle-event"
const SessionLifecycleContext = createContext<SessionLifecycleContextValue | null>(null)

function SessionLifecycleProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const channelRef = useRef<BroadcastChannel | null>(null)
  const lastHandledEventIdRef = useRef<string | null>(null)

  const handleRemoteLogout = useCallback((event: LogoutEvent) => {
    if (event.type !== "logout" || event.id === lastHandledEventIdRef.current) {
      return
    }

    lastHandledEventIdRef.current = event.id
    queryClient.clear()
    window.location.replace("/login")
  }, [queryClient])

  useEffect(() => {
    let channel: BroadcastChannel | null = null

    if ("BroadcastChannel" in window) {
      try {
        channel = new BroadcastChannel(LOGOUT_CHANNEL)
        channel.onmessage = (message: MessageEvent<unknown>) => {
          if (isLogoutEvent(message.data)) {
            handleRemoteLogout(message.data)
          }
        }
        channelRef.current = channel
      } catch {
        channelRef.current = null
      }
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== LOGOUT_STORAGE_KEY || !event.newValue) {
        return
      }

      try {
        const value: unknown = JSON.parse(event.newValue)

        if (isLogoutEvent(value)) {
          handleRemoteLogout(value)
        }
      } catch {
        // Eventos externos malformados não alteram a sessão atual.
      }
    }

    window.addEventListener("storage", handleStorage)

    return () => {
      window.removeEventListener("storage", handleStorage)
      channel?.close()

      if (channelRef.current === channel) {
        channelRef.current = null
      }
    }
  }, [handleRemoteLogout])

  const completeLogout = useCallback(() => {
    const event: LogoutEvent = {
      id: createEventId(),
      type: "logout",
    }

    lastHandledEventIdRef.current = event.id
    queryClient.clear()

    try {
      channelRef.current?.postMessage(event)
    } catch {
      // O fallback por storage ainda notifica as demais abas.
    }

    try {
      localStorage.setItem(LOGOUT_STORAGE_KEY, JSON.stringify(event))
    } catch {
      // O logout desta aba independe da disponibilidade do storage.
    }

    window.location.replace("/login")
  }, [queryClient])

  return (
    <SessionLifecycleContext.Provider value={{ completeLogout }}>
      {children}
    </SessionLifecycleContext.Provider>
  )
}

function useSessionLifecycle() {
  const context = useContext(SessionLifecycleContext)

  if (!context) {
    throw new Error("useSessionLifecycle deve ser usado dentro de SessionLifecycleProvider.")
  }

  return context
}

function createEventId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function isLogoutEvent(value: unknown): value is LogoutEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    "type" in value &&
    value.type === "logout"
  )
}

export { SessionLifecycleProvider, useSessionLifecycle }
