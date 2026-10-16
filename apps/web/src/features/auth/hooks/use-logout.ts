"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useRef, useState } from "react"

import { useSessionLifecycle } from "@/components/shared/session-lifecycle-provider"

import { authBffClient } from "../services/auth-bff-client"

function useLogout() {
  const queryClient = useQueryClient()
  const { completeLogout } = useSessionLifecycle()
  const activeLogoutRef = useRef<Promise<boolean> | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const logout = useCallback((): Promise<boolean> => {
    if (activeLogoutRef.current) {
      return activeLogoutRef.current
    }

    setIsLoggingOut(true)

    const operation = (async () => {
      try {
        await queryClient.cancelQueries()
        const result = await authBffClient.logout()

        if (!result.ok) {
          return false
        }

        completeLogout()
        return true
      } catch {
        return false
      }
    })()

    activeLogoutRef.current = operation

    void operation.then((succeeded) => {
      if (!succeeded) {
        activeLogoutRef.current = null
        setIsLoggingOut(false)
      }
    })

    return operation
  }, [completeLogout, queryClient])

  return { isLoggingOut, logout }
}

export { useLogout }
