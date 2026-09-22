"use client"

import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from "react"

import { useAuthPageEntrance } from "../../hooks/animations/use-auth-page-entrance"
import { useAuthTransition } from "./auth-transition-provider"

const AuthMotionContext = createContext(false)

function AuthPageMotion({ children }: { children: ReactNode }) {
  const [hasEntered, setHasEntered] = useState(false)
  const scopeRef = useRef<HTMLDivElement>(null)
  const { completeTransition } = useAuthTransition()
  const handleEntered = useCallback(() => {
    setHasEntered(true)
    completeTransition()
  }, [completeTransition])

  useAuthPageEntrance(scopeRef, handleEntered)

  return (
    <AuthMotionContext.Provider value={hasEntered}>
      <div ref={scopeRef}>{children}</div>
    </AuthMotionContext.Provider>
  )
}

function useAuthPageEntered() {
  return useContext(AuthMotionContext)
}

export { AuthPageMotion, useAuthPageEntered }
