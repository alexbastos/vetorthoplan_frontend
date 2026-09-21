"use client"

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

import { applyAuthShellFinalState } from "./auth-motion-state"

type AuthVisualMode = "confirmation" | "recovery" | "split"
type AuthTransitionPhase = "idle" | "exiting" | "navigating" | "entering"
type RegistrationConfirmationState = "idle" | "loading" | "exiting"

type ActiveAuthTransition = {
  destination: string
  phase: Exclude<AuthTransitionPhase, "idle">
  visualMode: AuthVisualMode
}

type AuthMotionController = {
  cancel: () => void
  settle: () => void
}

type AuthTransitionContextValue = {
  beginTransition: (destination: string) => boolean
  beginRegistrationConfirmation: () => boolean
  cancelTransition: () => void
  completeTransition: () => void
  completeRegistrationConfirmation: () => void
  destination: string | null
  isTransitioning: boolean
  navigateTransition: () => boolean
  phase: AuthTransitionPhase
  registerMotion: (id: string, controller: AuthMotionController) => () => void
  registrationConfirmationState: RegistrationConfirmationState
  resetRegistrationConfirmation: () => void
  targetVisualMode: AuthVisualMode | null
  visualMode: AuthVisualMode
}

const AuthTransitionContext = createContext<AuthTransitionContextValue | null>(null)

function getAuthVisualMode(pathname: string): AuthVisualMode {
  if (pathname === "/register/check-email" || pathname === "/verify-email") {
    return "confirmation"
  }

  return pathname === "/forgot-password" || pathname === "/reset-password" ? "recovery" : "split"
}

function AuthTransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const previousPathnameRef = useRef(pathname)
  const transitionLockRef = useRef(false)
  const transitionRef = useRef<ActiveAuthTransition | null>(null)
  const motionControllersRef = useRef(new Map<string, AuthMotionController>())
  const wasHiddenRef = useRef(typeof document !== "undefined" && document.visibilityState === "hidden")
  const [transition, setTransition] = useState<ActiveAuthTransition | null>(null)
  const [registrationConfirmationState, setRegistrationConfirmationState] = useState<RegistrationConfirmationState>("idle")

  const routeVisualMode = getAuthVisualMode(pathname)

  useEffect(() => {
    if (previousPathnameRef.current === pathname) {
      return
    }

    previousPathnameRef.current = pathname

    setTransition((currentTransition) => {
      if (!currentTransition || currentTransition.destination !== pathname) {
        transitionLockRef.current = false
        transitionRef.current = null
        return null
      }

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        transitionLockRef.current = false
        transitionRef.current = null
        return null
      }

      const nextTransition = { ...currentTransition, phase: "entering" } satisfies ActiveAuthTransition
      transitionRef.current = nextTransition
      return nextTransition
    })
  }, [pathname])

  const beginTransition = useCallback((destination: string) => {
    if (transitionRef.current || transitionLockRef.current) {
      return false
    }

    const nextTransition = { destination, phase: "exiting", visualMode: getAuthVisualMode(destination) } satisfies ActiveAuthTransition
    transitionLockRef.current = true
    transitionRef.current = nextTransition
    setTransition(nextTransition)
    return true
  }, [])

  const beginRegistrationConfirmation = useCallback(() => {
    if (registrationConfirmationState !== "idle") {
      return false
    }

    setRegistrationConfirmationState("loading")
    return true
  }, [registrationConfirmationState])

  const completeRegistrationConfirmation = useCallback(() => {
    setRegistrationConfirmationState("exiting")
  }, [])

  const resetRegistrationConfirmation = useCallback(() => {
    setRegistrationConfirmationState("idle")
  }, [])

  const registerMotion = useCallback((id: string, controller: AuthMotionController) => {
    motionControllersRef.current.set(id, controller)

    return () => {
      if (motionControllersRef.current.get(id) === controller) {
        motionControllersRef.current.delete(id)
      }
    }
  }, [])

  const completeTransition = useCallback(() => {
    transitionLockRef.current = false
    transitionRef.current = null
    setTransition(null)
  }, [])

  const navigateTransition = useCallback(() => {
    const currentTransition = transitionRef.current

    if (!currentTransition || currentTransition.phase !== "exiting") {
      return false
    }

    const nextTransition = { ...currentTransition, phase: "navigating" } satisfies ActiveAuthTransition
    transitionRef.current = nextTransition
    setTransition(nextTransition)
    router.push(nextTransition.destination)
    return true
  }, [router])

  const settleRegisteredMotion = useCallback(() => {
    const transitionHasReachedDestination = transitionRef.current?.destination === pathname
    const controllers = Array.from(motionControllersRef.current.values())

    controllers.forEach((controller) => controller.settle())

    if (transitionHasReachedDestination) {
      applyAuthShellFinalState(routeVisualMode)
      completeTransition()
      return
    }

    navigateTransition()

    if (transitionRef.current?.phase === "navigating") {
      return
    }

    applyAuthShellFinalState(routeVisualMode)
  }, [completeTransition, navigateTransition, pathname, routeVisualMode])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        wasHiddenRef.current = true
        return
      }

      if (!wasHiddenRef.current) {
        return
      }

      wasHiddenRef.current = false
      settleRegisteredMotion()
    }

    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) {
        return
      }

      wasHiddenRef.current = false
      settleRegisteredMotion()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("pageshow", handlePageShow)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("pageshow", handlePageShow)
    }
  }, [settleRegisteredMotion])

  const cancelTransition = useCallback(() => {
    transitionLockRef.current = false
    transitionRef.current = null
    setTransition(null)
  }, [])

  const value = useMemo<AuthTransitionContextValue>(
    () => ({
      beginTransition,
      beginRegistrationConfirmation,
      cancelTransition,
      completeTransition,
      completeRegistrationConfirmation,
      destination: transition?.destination ?? null,
      isTransitioning: transition !== null,
      navigateTransition,
      phase: transition?.phase ?? "idle",
      registerMotion,
      registrationConfirmationState,
      resetRegistrationConfirmation,
      targetVisualMode: transition?.visualMode ?? null,
      visualMode: routeVisualMode,
    }),
    [
      beginTransition,
      beginRegistrationConfirmation,
      cancelTransition,
      completeTransition,
      completeRegistrationConfirmation,
      navigateTransition,
      registerMotion,
      registrationConfirmationState,
      resetRegistrationConfirmation,
      routeVisualMode,
      transition,
    ],
  )

  return <AuthTransitionContext.Provider value={value}>{children}</AuthTransitionContext.Provider>
}

function useAuthTransition() {
  const context = useContext(AuthTransitionContext)

  if (!context) {
    throw new Error("useAuthTransition must be used within AuthTransitionProvider")
  }

  return context
}

export { AuthTransitionProvider, getAuthVisualMode, useAuthTransition }
export type { AuthMotionController, AuthTransitionPhase, AuthVisualMode, RegistrationConfirmationState }
