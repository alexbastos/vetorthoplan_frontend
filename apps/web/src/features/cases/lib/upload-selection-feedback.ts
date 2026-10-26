import type { createCaseFileUploadQueue, QueuedFile } from "./case-file-upload-queue"
import { IMAGE_UPLOAD_FILE_ERRORS } from "./image-upload-policy"

const SELECTION_DISMISS_DELAY = 4_000
const SELECTION_ERRORS = ["DUPLICATE_FILE", ...IMAGE_UPLOAD_FILE_ERRORS] as const

function isUploadSelectionError(error: string | null): error is (typeof SELECTION_ERRORS)[number] {
  return SELECTION_ERRORS.some(code => code === error)
}

function observeUploadSelectionFeedback(
  queue: Pick<ReturnType<typeof createCaseFileUploadQueue>, "getSnapshot" | "subscribe" | "removeFile">,
  notify: (item: QueuedFile) => void,
): () => void {
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  function sync() {
    const rejected = queue.getSnapshot().filter(item => item.phase === "error" && isUploadSelectionError(item.error)
      && !item.identity && !item.sessionAttempt && !item.persisted && !item.completed)
    const currentIds = new Set(rejected.map(item => item.id))
    for (const [id, timer] of timers) {
      if (!currentIds.has(id)) { clearTimeout(timer); timers.delete(id) }
    }
    for (const item of rejected) {
      if (timers.has(item.id)) continue
      timers.set(item.id, setTimeout(() => {
        const current = queue.getSnapshot().find(candidate => candidate.id === item.id)
        if (current?.phase === "error" && isUploadSelectionError(current.error)
          && !current.identity && !current.sessionAttempt && !current.persisted && !current.completed) void queue.removeFile(item.id)
        timers.delete(item.id)
      }, SELECTION_DISMISS_DELAY))
      notify(item)
    }
  }
  const unsubscribe = queue.subscribe(sync)
  sync()
  return () => {
    unsubscribe()
    timers.forEach(timer => clearTimeout(timer))
    timers.clear()
  }
}

export { observeUploadSelectionFeedback, isUploadSelectionError }
