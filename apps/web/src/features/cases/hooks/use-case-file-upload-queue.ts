"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useSyncExternalStore } from "react"

import { createCaseFileUploadQueue } from "../lib/case-file-upload-queue"
import { casesQueryKeys } from "./cases-query-keys"

function useCaseFileUploadQueue(caseId: string) {
  const client = useQueryClient()
  const queue = useMemo(() => createCaseFileUploadQueue(caseId, client), [caseId, client])
  const items = useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getServerSnapshot)
  const deleted = useQuery<string[]>({ queryKey: casesQueryKeys.deletedImages(caseId), queryFn: async () => [], enabled: false, initialData: [], gcTime: Infinity })
  useEffect(() => { queue.forgetDeletedImages(deleted.data) }, [queue, deleted.data])
  useEffect(() => { queue.activate(); return queue.dispose }, [queue])
  return { items, addFiles: queue.addFiles, removeFile: queue.removeFile, retry: queue.retry,
    busy: items.some(item => ["queued", "hashing", "creating", "transporting", "confirming", "cancelling"].includes(item.phase)) }
}

export { useCaseFileUploadQueue }
export type { QueuedFile } from "../lib/case-file-upload-queue"
