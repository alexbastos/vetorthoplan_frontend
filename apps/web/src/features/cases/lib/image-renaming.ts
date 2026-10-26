import type { QueryClient } from "@tanstack/react-query"

import { casesQueryKeys as keys } from "../hooks/cases-query-keys"
import { ImageRenameError, renameCaseImage } from "../services/image-rename-api"
import { isValidImageName } from "./case-image-name"
import { isImageDeletionLocked } from "./image-deletion"
import type { CaseImage } from "../types/case-image"

type ImageRenameState = {
  phase: "idle" | "renaming" | "renamed" | "error"
  message?: "blocked" | "saveFailed"
}
type RenameImageIdentity = Pick<CaseImage, "caseId" | "id" | "originalFilename">
type RenameOptions = { fetchImpl?: typeof fetch }

const IDLE_IMAGE_RENAME: ImageRenameState = { phase: "idle" }
const requests = new WeakMap<QueryClient, Map<string, Promise<{ id: string; caseId: string; displayName: string | null }>>>()

function isImageRenameLocked(client: QueryClient, caseId: string, imageId: string): boolean {
  const renameState = client.getQueryData<ImageRenameState>(keys.imageRename(caseId, imageId))
  return renameState?.phase === "renaming"
    || isImageDeletionLocked(client, caseId, imageId)
}

function isCaseDeletionComplete(client: QueryClient, caseId: string): boolean {
  return client.getQueryData<{ phase?: string }>(keys.caseDeletion(caseId))?.phase === "deleted"
}

function requestImageRename(
  client: QueryClient,
  image: RenameImageIdentity,
  displayName: string,
  options: RenameOptions = {},
): Promise<{ id: string; caseId: string; displayName: string | null }> {
  let pending = requests.get(client)
  if (!pending) {
    pending = new Map()
    requests.set(client, pending)
  }
  const requestId = JSON.stringify(keys.imageRename(image.caseId, image.id))
  const existing = pending.get(requestId)
  if (existing) return existing

  const action = Promise.resolve().then(() => rename(client, image, displayName, options))
    .finally(() => pending.delete(requestId))
  pending.set(requestId, action)
  return action
}

async function rename(
  client: QueryClient,
  image: RenameImageIdentity,
  displayName: string,
  options: RenameOptions,
): Promise<{ id: string; caseId: string; displayName: string | null }> {
  const key = keys.imageRename(image.caseId, image.id)
  const publish = (state: ImageRenameState) => client.setQueryData(key, state)

  if (isImageRenameLocked(client, image.caseId, image.id)) {
    publish({ phase: "error", message: "blocked" })
    throw new ImageRenameError("OPERATION_BLOCKED", false)
  }
  if (!isValidImageName(displayName, image.originalFilename)) {
    publish({ phase: "error", message: "saveFailed" })
    throw new ImageRenameError("VALIDATION_ERROR", false)
  }

  publish({ phase: "renaming" })
  try {
    const result = await renameCaseImage(image.caseId, image.id, displayName, {
      fetchImpl: options.fetchImpl,
      signal: AbortSignal.timeout(30_000),
    })
    if (result.caseId.toLowerCase() !== image.caseId.toLowerCase() || result.id.toLowerCase() !== image.id.toLowerCase()) {
      throw new ImageRenameError("INVALID_RESPONSE", false)
    }
    if (isCaseDeletionComplete(client, image.caseId)) {
      client.removeQueries({ queryKey: key, exact: true })
      return result
    }

    await client.cancelQueries({ queryKey: keys.images(image.caseId), exact: true })
    if (isCaseDeletionComplete(client, image.caseId)) {
      client.removeQueries({ queryKey: key, exact: true })
      return result
    }
    client.setQueryData<CaseImage[]>(keys.images(image.caseId), (current) => current?.map((item) =>
      item.id.toLowerCase() === image.id.toLowerCase() ? { ...item, displayName: result.displayName } : item,
    ))
    await client.invalidateQueries({ queryKey: keys.images(image.caseId), exact: true, refetchType: "none" })
    publish({ phase: "renamed" })
    return result
  } catch (error) {
    publish({ phase: "error", message: error instanceof ImageRenameError && error.code === "OPERATION_BLOCKED" ? "blocked" : "saveFailed" })
    throw error
  }
}

export { IDLE_IMAGE_RENAME, isImageRenameLocked, requestImageRename }
export type { ImageRenameState }
