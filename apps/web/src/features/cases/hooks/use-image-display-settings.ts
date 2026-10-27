"use client"

import { useQueryClient } from "@tanstack/react-query"

import { isPlanImageDeleted } from "../lib/calibration-save-state"
import { casesQueryKeys as keys } from "./cases-query-keys"
import { useWorkspaceCacheValue } from "./use-workspace-draft"

type ImageDisplaySettings = { brightness: number; contrast: number; inverted: boolean; mirrored: boolean }
const DEFAULT_IMAGE_DISPLAY: ImageDisplaySettings = { brightness: 100, contrast: 100, inverted: false, mirrored: false }

function useImageDisplaySettings(caseId: string, imageId: string) {
  const client = useQueryClient()
  const stored = useWorkspaceCacheValue<ImageDisplaySettings>("image-display-settings", caseId, imageId)
  function update(change: Partial<ImageDisplaySettings>) {
    if (isPlanImageDeleted(client, { caseId, imageId })) return
    client.setQueryData<ImageDisplaySettings>(keys.imageDisplaySettings(caseId, imageId), current => ({ ...DEFAULT_IMAGE_DISPLAY, ...current, ...change }))
  }
  function setLevel(field: "brightness" | "contrast", value: number) {
    if (Number.isFinite(value)) update({ [field]: Math.max(0, Math.min(200, value)) })
  }
  return { settings: { ...DEFAULT_IMAGE_DISPLAY, ...stored }, setLevel,
    setInverted: (value: boolean) => update({ inverted: value }),
    setMirrored: (value: boolean) => update({ mirrored: value }),
    reset: () => update(DEFAULT_IMAGE_DISPLAY),
  }
}

export { DEFAULT_IMAGE_DISPLAY, useImageDisplaySettings }
export type { ImageDisplaySettings }
export type ImageDisplayState = ReturnType<typeof useImageDisplaySettings>
