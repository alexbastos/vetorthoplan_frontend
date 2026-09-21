"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

import { settingsBffClient } from "../services/settings-bff-client"
import type { ActiveSession } from "../types/settings"
import { useSettingsErrorMessage } from "./use-settings-error-message"

const ACTIVE_SESSIONS_QUERY_KEY = ["settings", "active-sessions"] as const

type UseConnectedDevicesOptions = {
  enabled?: boolean
}

function useConnectedDevices({ enabled = true }: UseConnectedDevicesOptions = {}) {
  const getSettingsErrorMessage = useSettingsErrorMessage()
  const queryClient = useQueryClient()
  const sessionsQuery = useQuery({
    queryFn: async () => {
      const result = await settingsBffClient.getActiveSessions()

      if (!result.ok) {
        throw new Error(getSettingsErrorMessage(result.error.code))
      }

      return result.data.sessions
    },
    enabled,
    queryKey: ACTIVE_SESSIONS_QUERY_KEY,
  })
  const revokeMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const result = await settingsBffClient.revokeActiveSession(sessionId)

      if (!result.ok) {
        throw new Error(getSettingsErrorMessage(result.error.code))
      }

      return sessionId
    },
  })

  const completeSessionRevocation = useCallback((sessionId: string) => {
    queryClient.setQueryData<ActiveSession[]>(ACTIVE_SESSIONS_QUERY_KEY, (sessions) =>
      sessions?.filter((session) => session.id !== sessionId),
    )

    void queryClient.invalidateQueries({ queryKey: ACTIVE_SESSIONS_QUERY_KEY })
  }, [queryClient])

  return {
    activeSessions: sessionsQuery.data ?? [],
    isLoading: sessionsQuery.isLoading,
    isRevoking: revokeMutation.isPending,
    loadError: sessionsQuery.error instanceof Error ? sessionsQuery.error.message : undefined,
    revokeError: revokeMutation.error instanceof Error ? revokeMutation.error.message : undefined,
    revokeSession: revokeMutation.mutateAsync,
    completeSessionRevocation,
    revokingSessionId: revokeMutation.isPending ? revokeMutation.variables : undefined,
    retry: sessionsQuery.refetch,
  }
}

export { ACTIVE_SESSIONS_QUERY_KEY, useConnectedDevices }
