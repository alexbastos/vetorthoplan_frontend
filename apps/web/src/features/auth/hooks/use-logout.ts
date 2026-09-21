"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useRef, useState } from "react"

import { useSessionLifecycle } from "@/components/shared/session-lifecycle-provider"

import { authBffClient } from "../services/auth-bff-client"

type LogoutOptions = {
  complete?: boolean
}

function useLogout() {
  const queryClient = useQueryClient()
  const { completeLogout } = useSessionLifecycle()
  const activeLogoutRef = useRef<Promise<boolean> | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const logout = useCallback(({ complete = true }: LogoutOptions = {}): Promise<boolean> => {
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

        if (complete) completeLogout()
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

  return { completeLogout, isLoggingOut, logout }
}

export { useLogout }
