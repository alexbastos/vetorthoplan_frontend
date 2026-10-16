"use client"

import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react"

import { LoginHandoffOverlay } from "./login-handoff-overlay"
import {
  initialLoginHandoffMachine,
  transitionLoginHandoff,
  type LoginHandoffEvent,
  type LoginHandoffMachine,
  type LoginHandoffPhase,
} from "./login-handoff-machine"

type LoginHandoffDestinationPhase = "entering" | "exiting" | "inactive" | "waiting"

type LoginHandoffLabels = {
  authenticating: string
  preparing: string
  validating: string
}

type LoginHandoffContextValue = {
  awaitDestination: () => void
  beginHandoff: (labels?: LoginHandoffLabels) => boolean
  completeDestinationTransition: () => void
  destinationPhase: LoginHandoffDestinationPhase
  exitHandoff: () => Promise<void>
  isDestinationHandoffActive: boolean
  markDestinationReady: () => void
}

const LoginHandoffContext = createContext<LoginHandoffContextValue | null>(null)

function LoginHandoffProvider({ children }: { children: ReactNode }) {
  const machineRef = useRef<LoginHandoffMachine>(initialLoginHandoffMachine)
  const exitResolverRef = useRef<(() => void) | null>(null)
  const [machine, setMachine] = useState<LoginHandoffMachine>(initialLoginHandoffMachine)
  const [labels, setLabels] = useState<LoginHandoffLabels>()

  const transition = useCallback((event: LoginHandoffEvent) => {
    const nextMachine = transitionLoginHandoff(machineRef.current, event)
    machineRef.current = nextMachine
    setMachine(nextMachine)
    return nextMachine
  }, [])

  const beginHandoff = useCallback((nextLabels?: LoginHandoffLabels) => {
    if (machineRef.current.phase !== "idle") {
      return false
    }

    setLabels(nextLabels)
    transition({ type: "begin" })
    return true
  }, [transition])

  const awaitDestination = useCallback(() => {
    transition({ type: "request-succeeded" })
  }, [transition])

  const markLoaderSettled = useCallback(() => {
    transition({ type: "loader-settled" })
  }, [transition])

  const markDestinationReady = useCallback(() => {
    transition({ type: "destination-ready" })
  }, [transition])

  const completeLoaderExit = useCallback(() => {
    transition({ type: "loader-exited" })
  }, [transition])

  const exitHandoff = useCallback(() => {
    if (machineRef.current.phase === "idle") {
      return Promise.resolve()
    }

    transition({ type: "dismiss" })

    return new Promise<void>((resolve) => {
      exitResolverRef.current = resolve
    })
  }, [transition])

  const completeDismissal = useCallback(() => {
    transition({ type: "dismissed" })
    setLabels(undefined)
    exitResolverRef.current?.()
    exitResolverRef.current = null
  }, [transition])

  const completeDestinationTransition = useCallback(() => {
    const nextMachine = transition({ type: "destination-entered" })
    if (nextMachine.phase === "idle") {
      setLabels(undefined)
    }
  }, [transition])

  const destinationPhase = getDestinationPhase(machine.phase)

  const value = useMemo(
    () => ({
      awaitDestination,
      beginHandoff,
      completeDestinationTransition,
      destinationPhase,
      exitHandoff,
      isDestinationHandoffActive: destinationPhase !== "inactive",
      markDestinationReady,
    }),
    [awaitDestination, beginHandoff, completeDestinationTransition, destinationPhase, exitHandoff, markDestinationReady],
  )

  return (
    <LoginHandoffContext.Provider value={value}>
      {children}
      <LoginHandoffOverlay
        labels={labels}
        onDismissComplete={completeDismissal}
        onLoaderExitComplete={completeLoaderExit}
        onLoaderSettled={markLoaderSettled}
        state={machine.phase}
      />
    </LoginHandoffContext.Provider>
  )
}

function getDestinationPhase(phase: LoginHandoffPhase): LoginHandoffDestinationPhase {
  switch (phase) {
    case "awaiting-destination":
      return "waiting"
    case "exiting-loader":
      return "exiting"
    case "entering-destination":
      return "entering"
    default:
      return "inactive"
  }
}

function useLoginHandoff() {
  const context = useContext(LoginHandoffContext)

  if (!context) {
    throw new Error("useLoginHandoff must be used within LoginHandoffProvider")
  }

  return context
}

export { LoginHandoffProvider, useLoginHandoff }
export type { LoginHandoffDestinationPhase, LoginHandoffLabels, LoginHandoffPhase }
