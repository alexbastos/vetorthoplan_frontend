"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useMemo, useSyncExternalStore } from "react"

// Controlled inputs need a synchronous cache snapshot between successive events.
// Drafts and display settings survive unmounts in this organization's QueryClient, never in storage.
function useWorkspaceCacheValue<T>(kind: "image-calibration-draft" | "image-quality-draft" | "image-display-settings", caseId: string, imageId: string) {
  const client = useQueryClient()
  const key = useMemo(() => ["cases", kind, caseId, imageId] as const, [kind, caseId, imageId])
  useQuery<T | null>({ queryKey: key, queryFn: async () => null, enabled: false, initialData: null, gcTime: Infinity })
  const subscribe = useCallback((notify: () => void) => client.getQueryCache().subscribe(event => {
    if (key.every((part, index) => event.query.queryKey[index] === part)) notify()
  }), [client, key])
  const snapshot = useCallback(() => client.getQueryData<T | null>(key) ?? null, [client, key])
  return useSyncExternalStore(subscribe, snapshot, () => null)
}

export { useWorkspaceCacheValue, useWorkspaceCacheValue as useWorkspaceDraft }
