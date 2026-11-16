"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useRef } from "react"

import { isPlanImageDeleted } from "../lib/calibration-save-state"
import { isCircleMeasure, type CircleMeasure } from "../lib/circle-result"
import { isSegmentMeasure, type SegmentMeasure } from "../lib/segment-measure"
import { casesQueryKeys as keys } from "./cases-query-keys"
import { useWorkspaceCacheValue } from "./use-workspace-draft"

type ImageDisplaySettings = { brightness: number; contrast: number; inverted: boolean; mirrored: boolean; hiddenDistanceValues?: string[]; hiddenAngleValues?: string[]
  hiddenCircleValues?: string[]; hiddenLandmarksValue?: boolean; circleMeasures?: Record<string, CircleMeasure>; segmentMeasures?: Record<string, SegmentMeasure> }
const DEFAULT_IMAGE_DISPLAY: ImageDisplaySettings = { brightness: 100, contrast: 100, inverted: false, mirrored: false }

function useImageDisplaySettings(caseId: string, imageId: string) {
  const client = useQueryClient()
  const stored = useWorkspaceCacheValue<ImageDisplaySettings>("image-display-settings", caseId, imageId)
  const scope = useRef({ client, caseId, imageId })
  scope.current = { client, caseId, imageId }
  function update(change: Partial<ImageDisplaySettings>) {
    if (scope.current.client !== client || scope.current.caseId !== caseId || scope.current.imageId !== imageId
      || !client.getQueryState(keys.imageDisplaySettings(caseId, imageId)) || isPlanImageDeleted(client, { caseId, imageId })) return
    client.setQueryData<ImageDisplaySettings>(keys.imageDisplaySettings(caseId, imageId), current => ({ ...DEFAULT_IMAGE_DISPLAY, ...current, ...change }))
  }
  function setLevel(field: "brightness" | "contrast", value: number) {
    if (Number.isFinite(value)) update({ [field]: Math.max(0, Math.min(200, value)) })
  }
  return { settings: { ...DEFAULT_IMAGE_DISPLAY, ...stored }, setLevel,
    setInverted: (value: boolean) => update({ inverted: value }),
    setMirrored: (value: boolean) => update({ mirrored: value }),
    setLandmarksValueVisible: (visible: boolean) => update({ hiddenLandmarksValue: !visible }),
    setDistanceValueVisible: (id: string, visible: boolean) => {
      const hidden = client.getQueryData<ImageDisplaySettings>(keys.imageDisplaySettings(caseId, imageId))?.hiddenDistanceValues ?? []
      update({ hiddenDistanceValues: visible ? hidden.filter(value => value !== id) : [...new Set([...hidden, id])] })
    },
    setSegmentMeasure: (id: string, measure: SegmentMeasure) => {
      if (!isSegmentMeasure(measure)) return
      const measures = client.getQueryData<ImageDisplaySettings>(keys.imageDisplaySettings(caseId, imageId))?.segmentMeasures ?? {}
      update({ segmentMeasures: { ...measures, [id.toLowerCase()]: measure } })
    },
    setAngleValueVisible: (id: string, visible: boolean) => {
      const hidden = client.getQueryData<ImageDisplaySettings>(keys.imageDisplaySettings(caseId, imageId))?.hiddenAngleValues ?? []
      const key = id.toLowerCase(), others = hidden.filter(value => value.toLowerCase() !== key)
      update({ hiddenAngleValues: visible ? others : [...others, key] })
    },
    setCircleValueVisible: (id: string, visible: boolean) => {
      const hidden = client.getQueryData<ImageDisplaySettings>(keys.imageDisplaySettings(caseId, imageId))?.hiddenCircleValues ?? []
      const key = id.toLowerCase(), others = hidden.filter(value => value.toLowerCase() !== key)
      update({ hiddenCircleValues: visible ? others : [...others, key] })
    },
    setCircleMeasure: (id: string, measure: CircleMeasure) => {
      if (!isCircleMeasure(measure)) return
      const measures = client.getQueryData<ImageDisplaySettings>(keys.imageDisplaySettings(caseId, imageId))?.circleMeasures ?? {}
      update({ circleMeasures: { ...measures, [id.toLowerCase()]: measure } })
    },
    reset: () => update(DEFAULT_IMAGE_DISPLAY),
  }
}

export { DEFAULT_IMAGE_DISPLAY, useImageDisplaySettings }
export type { ImageDisplaySettings }
export type ImageDisplayState = ReturnType<typeof useImageDisplaySettings>
