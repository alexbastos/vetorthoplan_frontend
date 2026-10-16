"use client"

import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react"

import { LoginHandoffOverlay } from "./login-handoff-overlay"

type LoginHandoffState = "authenticating" | "awaiting-destination" | "exiting" | "idle"

type LoginHandoffContextValue = {
  awaitDestination: () => void
  beginHandoff: () => boolean
  exitHandoff: () => Promise<void>
  notifyDestinationReady: () => void
}

const LoginHandoffContext = createContext<LoginHandoffContextValue | null>(null)

function LoginHandoffProvider({ children }: { children: ReactNode }) {
  const stateRef = useRef<LoginHandoffState>("idle")
  const exitResolverRef = useRef<(() => void) | null>(null)
  const [state, setState] = useState<LoginHandoffState>("idle")

  const updateState = useCallback((nextState: LoginHandoffState) => {
    stateRef.current = nextState
    setState(nextState)
  }, [])

  const beginHandoff = useCallback(() => {
    if (stateRef.current !== "idle") {
      return false
    }

    updateState("authenticating")
    return true
  }, [updateState])

  const awaitDestination = useCallback(() => {
    if (stateRef.current === "authenticating") {
      updateState("awaiting-destination")
    }
  }, [updateState])

  const exitHandoff = useCallback(() => {
    if (stateRef.current === "idle") {
      return Promise.resolve()
    }

    if (stateRef.current !== "exiting") {
      updateState("exiting")
    }

    return new Promise<void>((resolve) => {
      exitResolverRef.current = resolve
    })
  }, [updateState])

  const notifyDestinationReady = useCallback(() => {
    if (stateRef.current === "awaiting-destination") {
      void exitHandoff()
    }
  }, [exitHandoff])

  const resetAfterExit = useCallback(() => {
    updateState("idle")
    exitResolverRef.current?.()
    exitResolverRef.current = null
  }, [updateState])

  const value = useMemo(
    () => ({ awaitDestination, beginHandoff, exitHandoff, notifyDestinationReady }),
    [awaitDestination, beginHandoff, exitHandoff, notifyDestinationReady],
  )

  return (
    <LoginHandoffContext.Provider value={value}>
      {children}
      <LoginHandoffOverlay onExitComplete={resetAfterExit} state={state} />
    </LoginHandoffContext.Provider>
  )
}

function useLoginHandoff() {
  const context = useContext(LoginHandoffContext)

  if (!context) {
    throw new Error("useLoginHandoff must be used within LoginHandoffProvider")
  }

  return context
}

export { LoginHandoffProvider, useLoginHandoff }
export type { LoginHandoffState }
