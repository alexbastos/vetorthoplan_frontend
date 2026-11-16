"use client"

import { Crosshair, Hand, Maximize2, Minimize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react"

import { hitTestCircleMarker, type CircleHit } from "../lib/circle-marker-interaction"
import { mapClientPointToImage } from "../lib/image-coordinate-map"
import { hitTestLineMarker, type LineHit } from "../lib/line-marker-interaction"
import { distanceMarkerFromKeyboard, distanceLineHasValidSize, pickDistanceLine } from "../lib/distance-line-interaction"
import { angleFromDrag, angleFromKeyboard, angleInNormalized, beginAngleDrag, hitTestAngle, isAngleDrag, pickAngle, type AngleDrag, type AngleHit } from "../lib/angle-interaction"
import type { AngleGeometry } from "../lib/angle-geometry"
import { beginCircleDrag, circleFromDrag, circleFromKeyboard, circleInNormalized, hitTestCircle, isCircleDrag, pickCircle,
  type CircleDrag, type CircleHit as MeasurementCircleHit } from "../lib/circle-interaction"
import type { CircleGeometry } from "../lib/circle-geometry"
import { landmarksInNormalized, type LandmarksGeometry } from "../lib/landmarks-geometry"
import { beginLandmarksDrag, hitTestLandmarks, isLandmarksDrag, landmarksFromDrag, landmarksFromKeyboard,
  type LandmarksDrag, type LandmarksHit } from "../lib/landmarks-interaction"
import { landmarksPlacementFromKeyboard } from "../lib/landmarks-placement"
import type { LandmarksPointName } from "../lib/landmarks-editor"
import type { CirclePlacementStep } from "../lib/circle-editor"
import type { AnglePlacementStep } from "../lib/angle-placement"
import type { CalibrationMarker, ImagePoint, ImageRendering } from "../types/case-workspace"
import { beginMarkerDrag, markerFromDrag, markerFromKeyboard, type MarkerDrag } from "../lib/viewer-marker-interaction"
import { viewerEditorInPixels, type ViewerEditor, type ViewerTool, type ViewerOverlayView } from "../lib/viewer-editor"
import { ViewerEditorOverlay } from "./viewer-editor-overlay"
import { ViewerAngleEditorOverlay } from "./viewer-angle-editor-overlay"
import { ViewerAnglePlacementOverlay } from "./viewer-angle-placement-overlay"
import { ViewerCircleEditorOverlay } from "./viewer-circle-editor-overlay"
import { ViewerCirclePlacementOverlay } from "./viewer-circle-placement-overlay"
import { ViewerLandmarksEditorOverlay } from "./viewer-landmarks-editor-overlay"
import { ViewerLandmarksPlacementOverlay } from "./viewer-landmarks-placement-overlay"
import { imagePointToNormalized } from "../lib/image-point-space"
import { VIEWER_TOOLBAR_CLASS_NAME, ViewerButton, ViewerEditorControls, type ViewerContextControls } from "./viewer-toolbar"

type ReadyRendering = Pick<Extract<ImageRendering, { status: "ready" }>, "url" | "widthPx" | "heightPx">
const MIN_DISTANCE_DRAG_PX = 4
type ViewerDrag = (MarkerDrag | AngleDrag | CircleDrag | LandmarksDrag | { kind: "place-angle"; step: AnglePlacementStep }
  | { kind: "place-circle"; step: CirclePlacementStep }
  | { kind: "place-landmarks"; point: LandmarksPointName; moved: boolean }
  | { kind: "pan"; x: number; y: number; startX: number; startY: number; candidateId?: string; candidateFamily?: "distance" | "angle" | "circle" })
  & { owner: string; startClient: ImagePoint }

type CaseImageViewerProps = {
  brightness: number
  contrast: number
  inverted: boolean
  mirrored?: boolean
  interactionNotice?: ReactNode
  editorControls?: ReactNode
  contextControls?: ViewerContextControls
  editor: ViewerEditor
  interactionKey?: string
  interactionContext?: object
  /** Passive SVG in original pixels. Scale/mirroring let labels keep screen size and direction. */
  renderOverlay?: (view: ViewerOverlayView) => ReactNode
  name: string
  onImageError?: () => void
  onImageLoad?: () => void
  /** Remote plans use inclusive image edges, rather than legacy pixel centres. */
  coordinateSpace?: "legacy" | "image-edges"
  rendering: ReadyRendering
}

function CaseImageViewer({ brightness, contrast, inverted, mirrored = false, interactionNotice, editorControls, contextControls, editor, interactionKey, interactionContext, renderOverlay, name, onImageError, onImageLoad, coordinateSpace = "legacy", rendering }: CaseImageViewerProps) {
  const t = useTranslations("cases.workspace.viewer")
  const tDistance = useTranslations("cases.workspace.distance")
  const tAngle = useTranslations("cases.workspace.angle")
  const tCircle = useTranslations("cases.workspace.circle")
  const tLandmarks = useTranslations("cases.workspace.landmarks")
  const { marker, markerKind, angleGeometry, anglePlacement, circleGeometry, circlePlacement, landmarksGeometry, landmarksPlacement, readOnly, tool,
    onMarkerChange, onAngleGeometryChange, onCircleGeometryChange, onLandmarksGeometryChange, onToolChange } = viewerEditorInPixels(editor, rendering)
  const activeTool = readOnly ? "pan" : tool
  const interactionsBlocked = Boolean(interactionNotice)
  const picking = editor.kind === "distance-select" || editor.kind === "distance" ? editor.picking : undefined
  const anglePicking = editor.kind === "angle-select" || editor.kind === "angle" ? editor.picking : undefined
  const circlePicking = editor.kind === "circle-select" || editor.kind === "circle" ? editor.picking : undefined
  const scope = useRef({ context: interactionContext, key: interactionKey, generation: 0 })
  if (scope.current.context !== interactionContext || scope.current.key !== interactionKey) {
    scope.current = { context: interactionContext, key: interactionKey, generation: scope.current.generation + 1 }
  }
  const edgeInset = coordinateSpace === "image-edges" ? 0 : 1
  const viewportRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<ViewerDrag | null>(null)
  const activePointerRef = useRef<number | null>(null)
  const adjustmentKeys = useRef(new Set<string>())
  const [pointerActive, setPointerActive] = useState(false)
  const onDistancePointerActivity = editor.kind === "distance" ? editor.onPointerActivity : undefined
  useEffect(() => {
    onDistancePointerActivity?.(pointerActive)
    return () => onDistancePointerActivity?.(false)
  }, [onDistancePointerActivity, pointerActive])
  const [keyboardAdjusting, setKeyboardAdjusting] = useState(false)
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [draftMarker, setDraftMarker] = useState<CalibrationMarker | null>(null)
  const [anglePreview, setAnglePreview] = useState<{ owner: string; geometry: AngleGeometry } | null>(null)
  const [circlePreview, setCirclePreview] = useState<{ owner: string; geometry: CircleGeometry } | null>(null)
  const [landmarksPreview, setLandmarksPreview] = useState<{ owner: string; geometry: LandmarksGeometry } | null>(null)
  const [placementCursor, setPlacementCursor] = useState<{ owner: string; point: ImagePoint } | null>(null)
  const [hoveredAnglePart, setHoveredAnglePart] = useState<AngleHit>(null)
  const [hoveredCirclePart, setHoveredCirclePart] = useState<MeasurementCircleHit>(null)
  const [hoveredLandmarksPart, setHoveredLandmarksPart] = useState<LandmarksHit>(null)
  const [hoveredMarkerPart, setHoveredMarkerPart] = useState<LineHit | CircleHit>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const onGeometryPreview = editor.kind === "distance" ? editor.onGeometryPreview : undefined
  const onAngleGeometryPreview = editor.kind === "angle" ? editor.onGeometryPreview : undefined
  const onCircleGeometryPreview = editor.kind === "circle" ? editor.onGeometryPreview : undefined
  const onLandmarksGeometryPreview = editor.kind === "landmarks" ? editor.onGeometryPreview : undefined
  const gestureOwner = JSON.stringify([scope.current.generation, interactionKey, editor.kind,
    editor.kind === "distance" || editor.kind === "angle" || editor.kind === "circle" ? editor.id : null,
    editor.kind === "angle" || editor.kind === "circle" || editor.kind === "landmarks" ? [editor.baseRevision, editor.contextGeneration] : null,
    markerKind, marker, angleGeometry, anglePlacement, circleGeometry, circlePlacement, landmarksGeometry, landmarksPlacement, rendering.url,
    rendering.widthPx, rendering.heightPx, mirrored, readOnly, tool, interactionsBlocked, picking?.selectedId, picking?.enabled, anglePicking?.selectedId, anglePicking?.enabled,
    circlePicking?.selectedId, circlePicking?.enabled,
    editor.kind === "angle" || editor.kind === "circle" || editor.kind === "landmarks" ? [zoom, viewportSize.width, viewportSize.height, activeTool === "mark" ? pan : null] : null])
  const currentGestureOwner = useRef(gestureOwner)
  currentGestureOwner.current = gestureOwner
  const draftAngle = anglePreview?.owner === gestureOwner ? anglePreview.geometry : null
  const draftCircle = circlePreview?.owner === gestureOwner ? circlePreview.geometry : null
  const draftLandmarks = landmarksPreview?.owner === gestureOwner ? landmarksPreview.geometry : null
  const placementPoint = placementCursor?.owner === gestureOwner ? placementCursor.point : null
  const measurementInteraction = editor.kind === "angle" || editor.kind === "circle" || editor.kind === "landmarks"

  function previewMarker(next: CalibrationMarker | null) {
    setDraftMarker(next)
    onGeometryPreview?.(next?.kind === "line" ? {
      start: imagePointToNormalized(next.start, rendering), end: imagePointToNormalized(next.end, rendering),
    } : null)
  }

  function previewAngle(next: AngleGeometry | null) {
    setAnglePreview(current => next ? { owner: gestureOwner, geometry: next } : current?.owner === gestureOwner ? null : current)
    onAngleGeometryPreview?.(next ? angleInNormalized(next, rendering, editor.kind === "angle" ? editor.geometry ?? undefined : undefined) : null)
  }

  function previewCircle(next: CircleGeometry | null) {
    setCirclePreview(current => next ? { owner: gestureOwner, geometry: next } : current?.owner === gestureOwner ? null : current)
    onCircleGeometryPreview?.(next ? circleInNormalized(next, rendering, editor.kind === "circle" ? editor.geometry ?? undefined : undefined) : null)
  }

  function previewLandmarks(next: LandmarksGeometry | null) {
    setLandmarksPreview(current => next ? { owner: gestureOwner, geometry: next } : current?.owner === gestureOwner ? null : current)
    onLandmarksGeometryPreview?.(next ? landmarksInNormalized(next, rendering, editor.kind === "landmarks" ? editor.geometry ?? undefined : undefined) : null)
  }

  useEffect(() => {
    const pointerId = activePointerRef.current
    const viewport = viewportRef.current
    dragRef.current = null
    activePointerRef.current = null
    setPointerActive(false)
    if (pointerId !== null && viewport?.hasPointerCapture(pointerId)) viewport.releasePointerCapture(pointerId)
    setDraftMarker(null)
    setAnglePreview(null)
    setCirclePreview(null)
    setLandmarksPreview(null)
    setPlacementCursor(null)
    onGeometryPreview?.(null)
    onAngleGeometryPreview?.(null)
    onCircleGeometryPreview?.(null)
    onLandmarksGeometryPreview?.(null)
    setHoveredMarkerPart(null)
    setHoveredAnglePart(null)
    setHoveredCirclePart(null)
    setHoveredLandmarksPart(null)
    const cancelMeasurementOnBlur = () => {
      const pointerId = activePointerRef.current
      dragRef.current = null
      activePointerRef.current = null
      setPointerActive(false)
      setAnglePreview(null)
      setCirclePreview(null)
      setLandmarksPreview(null)
      setPlacementCursor(null)
      setHoveredAnglePart(null)
      setHoveredCirclePart(null)
      setHoveredLandmarksPart(null)
      onAngleGeometryPreview?.(null)
      onCircleGeometryPreview?.(null)
      onLandmarksGeometryPreview?.(null)
      if (pointerId !== null && viewport?.hasPointerCapture(pointerId)) viewport.releasePointerCapture(pointerId)
    }
    if (measurementInteraction) window.addEventListener("blur", cancelMeasurementOnBlur)
    return () => {
      const pointerId = activePointerRef.current
      dragRef.current = null
      activePointerRef.current = null
      if (pointerId !== null && viewport?.hasPointerCapture(pointerId)) viewport.releasePointerCapture(pointerId)
      onGeometryPreview?.(null)
      onAngleGeometryPreview?.(null)
      onCircleGeometryPreview?.(null)
      onLandmarksGeometryPreview?.(null)
      if (measurementInteraction) window.removeEventListener("blur", cancelMeasurementOnBlur)
    }
  }, [gestureOwner, onGeometryPreview, onAngleGeometryPreview, onCircleGeometryPreview, onLandmarksGeometryPreview, measurementInteraction])

  function clearKeyboardAdjustment() {
    adjustmentKeys.current.clear()
    setKeyboardAdjusting(false)
  }

  function trackAdjustmentKey(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") { clearKeyboardAdjustment(); return }
    if (interactionsBlocked || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return
    const target = event.target as HTMLElement
    if (target === viewportRef.current) {
      if (readOnly || activeTool !== "mark" || (editor.kind !== "distance" && editor.kind !== "angle" && editor.kind !== "circle" && editor.kind !== "landmarks")) return
    } else if ((editor.kind !== "distance" && editor.kind !== "angle" && editor.kind !== "angle-select" && editor.kind !== "circle" && editor.kind !== "circle-select" && editor.kind !== "landmarks")
      || !target.closest("[data-viewer-adjustment]:not(:disabled)")) return
    adjustmentKeys.current.add(event.key)
    setKeyboardAdjusting(true)
  }

  // Starting the selected angle's editor or switching its adjustment target
  // must not reveal X/check while the same arrow key is still held down.
  const angleKeyboard = editor.kind === "angle" || editor.kind === "angle-select"
  const circleKeyboard = editor.kind === "circle" || editor.kind === "circle-select"
  const landmarksKeyboard = editor.kind === "landmarks"
  const keyboardOwner = JSON.stringify([scope.current.generation, interactionKey, rendering.url, angleKeyboard ? "angle" : circleKeyboard ? "circle" : editor.kind,
    editor.kind === "distance" || editor.kind === "angle" || editor.kind === "circle" ? editor.id.toLowerCase()
      : editor.kind === "angle-select" || editor.kind === "circle-select" ? editor.picking.selectedId?.toLowerCase() : null,
    mirrored, angleKeyboard || circleKeyboard ? null : landmarksKeyboard ? [readOnly] : [readOnly, tool], interactionsBlocked,
    // A nudge advances the draft generation. It must not reveal X/check while
    // the same arrow is held, including a toolbar nudge that activates Mark.
    landmarksKeyboard ? [editor.baseRevision, rendering.widthPx, rendering.heightPx] : null])
  useEffect(() => {
    const reset = () => { adjustmentKeys.current.clear(); setKeyboardAdjusting(false) }
    reset()
    window.addEventListener("blur", reset)
    return () => window.removeEventListener("blur", reset)
  }, [keyboardOwner])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const observer = new ResizeObserver(([entry]) => {
      setViewportSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const handleChange = () => setIsFullscreen(document.fullscreenElement === section)
    document.addEventListener("fullscreenchange", handleChange)
    return () => document.removeEventListener("fullscreenchange", handleChange)
  }, [])

  const fitScale = viewportSize.width && viewportSize.height
    ? Math.min((viewportSize.width - 48) / rendering.widthPx, (viewportSize.height - 48) / rendering.heightPx)
    : 0
  const displayWidth = Math.max(0, rendering.widthPx * fitScale)
  const displayHeight = Math.max(0, rendering.heightPx * fitScale)
  // Context actions use screen pixels outside the gesture surface. Only their
  // anchor follows the image transform; buttons never scale or mirror.
  const contextAnchor = contextControls?.anchor
  const sourceAnchorX = contextAnchor?.x ?? 0.5
  const anchorX = viewportSize.width / 2 + pan.x + ((mirrored ? 1 - sourceAnchorX : sourceAnchorX) - 0.5) * displayWidth * zoom
  const anchorY = viewportSize.height / 2 + pan.y + ((contextAnchor?.y ?? 0.5) - 0.5) * displayHeight * zoom
  const contextMinLeft = Math.min(editorControls ? 64 : 12, Math.max(12, viewportSize.width - 92))
  const contextLeft = Math.max(contextMinLeft, Math.min(viewportSize.width - 92, anchorX + 104 < viewportSize.width ? anchorX + 24 : anchorX - 104))
  const contextTop = Math.max(12, Math.min(viewportSize.height - 52, anchorY + 24))

  function pointFromPointer(event: PointerEvent<HTMLDivElement>): ImagePoint | null {
    const rect = imageRef.current?.getBoundingClientRect()
    if (!rect) return null
    // The bounding rectangle has positive dimensions even after scaleX(-1).
    // Reflect the pointer back to source space for both mapping and hit tests.
    const pointer = sourcePointer(event, rect)
    return mapClientPointToImage(pointer.x, pointer.y, rect, rendering.widthPx, rendering.heightPx, editor.kind === "circle" || editor.kind === "landmarks" ? 0 : edgeInset)
  }

  function sourcePointer(event: PointerEvent<HTMLDivElement>, rect: { left: number; width: number }): ImagePoint {
    return { x: mirrored ? 2 * rect.left + rect.width - event.clientX : event.clientX, y: event.clientY }
  }

  function markerPartFromPointer(event: PointerEvent<HTMLDivElement>, candidate = marker): LineHit | CircleHit {
    if (activeTool !== "mark" || candidate?.kind !== markerKind) return null
    const rect = imageRef.current?.getBoundingClientRect()
    if (!rect) return null
    const pointer = sourcePointer(event, rect)
    return candidate.kind === "line"
      ? hitTestLineMarker(pointer, candidate, rect, rendering.widthPx, rendering.heightPx)
      : hitTestCircleMarker(pointer, candidate, rect, rendering.widthPx, rendering.heightPx, { diameterHandles: true })
  }
  function distanceFromPointer(event: PointerEvent<HTMLDivElement>) {
    const rect = imageRef.current?.getBoundingClientRect()
    return picking?.enabled && rect ? pickDistanceLine(sourcePointer(event, rect), picking.lines, picking.selectedId, rect, rendering) : null
  }
  function anglePartFromPointer(event: PointerEvent<HTMLDivElement>, candidate = angleGeometry): AngleHit {
    const rect = imageRef.current?.getBoundingClientRect()
    return activeTool === "mark" && candidate && rect ? hitTestAngle(sourcePointer(event, rect), candidate, rect, rendering) : null
  }
  function angleFromPointer(event: PointerEvent<HTMLDivElement>) {
    const rect = imageRef.current?.getBoundingClientRect()
    return anglePicking?.enabled && rect ? pickAngle(sourcePointer(event, rect), anglePicking.angles, anglePicking.selectedId, rect, rendering) : null
  }
  function circlePartFromPointer(event: PointerEvent<HTMLDivElement>, candidate = circleGeometry): MeasurementCircleHit {
    const rect = imageRef.current?.getBoundingClientRect()
    return activeTool === "mark" && candidate && rect ? hitTestCircle(sourcePointer(event, rect), candidate, rect, rendering) : null
  }
  function circleFromPointer(event: PointerEvent<HTMLDivElement>) {
    const rect = imageRef.current?.getBoundingClientRect()
    return circlePicking?.enabled && rect ? pickCircle(sourcePointer(event, rect), circlePicking.circles, circlePicking.selectedId, rect, rendering) : null
  }
  function landmarksPartFromPointer(event: PointerEvent<HTMLDivElement>, candidate = landmarksGeometry): LandmarksHit {
    const rect = imageRef.current?.getBoundingClientRect()
    const preferred = editor.kind === "landmarks" && editor.keyboardTarget !== "body" ? editor.keyboardTarget : undefined
    return activeTool === "mark" && candidate && rect ? hitTestLandmarks(sourcePointer(event, rect), candidate, rect, rendering, preferred) : null
  }
  function placementPointFromPointer(event: PointerEvent<HTMLDivElement>) {
    const rect = imageRef.current?.getBoundingClientRect()
    return rect && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom
      ? pointFromPointer(event) : null
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (interactionsBlocked || currentGestureOwner.current !== gestureOwner) return
    if (event.button !== 0 || event.isPrimary === false || dragRef.current) return
    event.currentTarget.focus({ preventScroll: true })
    const gesture = { owner: gestureOwner, startClient: { x: event.clientX, y: event.clientY } }
    if (activeTool === "pan") {
      dragRef.current = { kind: "pan", x: pan.x, y: pan.y, startX: event.clientX, startY: event.clientY,
        candidateId: circlePicking?.enabled ? circleFromPointer(event)?.id : anglePicking?.enabled ? angleFromPointer(event)?.id : distanceFromPointer(event)?.id,
        candidateFamily: circlePicking?.enabled ? "circle" : anglePicking?.enabled ? "angle" : "distance", ...gesture }
    } else {
      const rect = imageRef.current?.getBoundingClientRect()
      if (!rect || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return
      const start = pointFromPointer(event)
      if (!start) return
      if (editor.kind === "angle") {
        if (anglePlacement) {
          dragRef.current = { kind: "place-angle", step: anglePlacement.step, ...gesture }
          setPlacementCursor({ owner: gestureOwner, point: start })
        } else {
          const candidate = angleFromPointer(event)
          if (candidate && candidate.id.toLowerCase() !== editor.id.toLowerCase()) {
            dragRef.current = { kind: "pan", x: pan.x, y: pan.y, startX: event.clientX, startY: event.clientY,
              candidateId: candidate.id, candidateFamily: "angle", ...gesture }
          } else {
            const hit = anglePartFromPointer(event)
            const drag = angleGeometry && beginAngleDrag(angleGeometry, hit, start)
            if (!drag || !hit) return
            dragRef.current = { ...drag, ...gesture }
            setHoveredAnglePart(hit)
            editor.onKeyboardTargetChange?.(hit)
          }
        }
      } else if (editor.kind === "landmarks") {
        if (landmarksPlacement) {
          dragRef.current = { kind: "place-landmarks", point: landmarksPlacement.activePoint, moved: false, ...gesture }
          setPlacementCursor({ owner: gestureOwner, point: start })
        } else {
          const hit = landmarksPartFromPointer(event)
          const drag = landmarksGeometry && beginLandmarksDrag(landmarksGeometry, hit, start)
          if (!drag || !hit) return
          dragRef.current = { ...drag, ...gesture }
          setHoveredLandmarksPart(hit)
          editor.onKeyboardTargetChange?.(hit)
        }
      } else if (editor.kind === "circle") {
        if (circlePlacement) {
          dragRef.current = { kind: "place-circle", step: circlePlacement.step, ...gesture }
          setPlacementCursor({ owner: gestureOwner, point: start })
        } else {
          const candidate = circleFromPointer(event)
          if (candidate && candidate.id.toLowerCase() !== editor.id.toLowerCase()) {
            dragRef.current = { kind: "pan", x: pan.x, y: pan.y, startX: event.clientX, startY: event.clientY,
              candidateId: candidate.id, candidateFamily: "circle", ...gesture }
          } else {
            const hit = circlePartFromPointer(event)
            const drag = circleGeometry && beginCircleDrag(circleGeometry, hit, start)
            if (!drag || !hit) return
            dragRef.current = { ...drag, ...gesture }
            setHoveredCirclePart(hit)
            editor.onKeyboardTargetChange?.(hit === "center" ? "body" : hit)
          }
        }
      } else {
        const hit = markerPartFromPointer(event)
        if (editor.kind === "distance" && editor.intent === "update") {
          const candidate = distanceFromPointer(event)
          if (candidate && candidate.id !== editor.id) {
            dragRef.current = { kind: "pan", x: pan.x, y: pan.y, startX: event.clientX, startY: event.clientY, candidateId: candidate.id, ...gesture }
          } else if (!hit) return
        }
        if (editor.kind === "distance" && editor.intent === "create" && marker && !hit) return
        setHoveredMarkerPart(hit)
        if (!dragRef.current) dragRef.current = { ...beginMarkerDrag(marker, markerKind, hit, start), ...gesture }
        if (editor.kind === "distance" && hit && hit !== "edge") editor.onKeyboardTargetChange?.(hit)
      }
    }
    activePointerRef.current = event.pointerId
    onDistancePointerActivity?.(true)
    setPointerActive(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (interactionsBlocked || currentGestureOwner.current !== gestureOwner) return
    const drag = dragRef.current
    if (!drag) {
      if ((anglePlacement || circlePlacement || landmarksPlacement) && !readOnly && activeTool === "mark") {
        const point = placementPointFromPointer(event)
        setPlacementCursor(point ? { owner: gestureOwner, point } : null)
      } else if (editor.kind === "angle") setHoveredAnglePart(anglePartFromPointer(event))
      else if (editor.kind === "circle") setHoveredCirclePart(circlePartFromPointer(event))
      else if (editor.kind === "landmarks") setHoveredLandmarksPart(landmarksPartFromPointer(event))
      else setHoveredMarkerPart(markerPartFromPointer(event))
      return
    }
    if (activePointerRef.current !== event.pointerId) return
    if (drag.owner !== gestureOwner) { handlePointerCancel(event); return }
    if ((readOnly || activeTool !== "mark") && drag.kind !== "pan") { handlePointerCancel(event); return }
    if (drag.kind === "pan") {
      setPan({ x: drag.x + event.clientX - drag.startX, y: drag.y + event.clientY - drag.startY })
      return
    }
    if (drag.kind === "place-angle" || drag.kind === "place-circle" || drag.kind === "place-landmarks") {
      if (drag.kind === "place-landmarks" && Math.hypot(event.clientX - drag.startClient.x, event.clientY - drag.startClient.y) >= MIN_DISTANCE_DRAG_PX) drag.moved = true
      const point = placementPointFromPointer(event)
      setPlacementCursor(point ? { owner: gestureOwner, point } : null)
      return
    }
    const end = pointFromPointer(event)
    if (!end) return
    if (isAngleDrag(drag)) {
      const next = angleFromDrag(drag, end, rendering)
      if (next) previewAngle(next)
    } else if (isCircleDrag(drag)) {
      const next = circleFromDrag(drag, end, rendering)
      if (next) previewCircle(next)
    } else if (isLandmarksDrag(drag)) {
      previewLandmarks(landmarksFromDrag(drag, end, rendering))
    } else previewMarker(markerFromDrag(drag, end, rendering, edgeInset))
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (interactionsBlocked || currentGestureOwner.current !== gestureOwner) return
    const drag = dragRef.current
    if (!drag || activePointerRef.current !== event.pointerId) return
    if (drag.owner !== gestureOwner) { handlePointerCancel(event); return }
    let committedMarker = marker
    let committedAngle = angleGeometry
    let committedCircle = circleGeometry
    let committedLandmarks = landmarksGeometry
    if (drag.kind === "pan" && drag.candidateId
      && Math.hypot(event.clientX - drag.startClient.x, event.clientY - drag.startClient.y) < MIN_DISTANCE_DRAG_PX) {
      if (drag.candidateFamily === "circle" && circlePicking?.enabled) {
        setPan({ x: drag.x, y: drag.y })
        circlePicking.onSelect(drag.candidateId)
      } else if (drag.candidateFamily === "angle" && anglePicking?.enabled) {
        setPan({ x: drag.x, y: drag.y })
        anglePicking.onSelect(drag.candidateId)
      } else if (drag.candidateFamily !== "angle" && drag.candidateFamily !== "circle" && picking?.enabled) {
        setPan({ x: drag.x, y: drag.y })
        picking.onSelect(drag.candidateId)
      }
    }
    if (drag.kind === "place-angle") {
      const point = placementPointFromPointer(event)
      if (editor.kind === "angle" && !readOnly && activeTool === "mark" && point && anglePlacement?.step === drag.step
        && Math.hypot(event.clientX - drag.startClient.x, event.clientY - drag.startClient.y) < MIN_DISTANCE_DRAG_PX) {
        editor.onPlacePoint?.(imagePointToNormalized(point, rendering), drag.step)
      }
    } else if (drag.kind === "place-circle") {
      const point = placementPointFromPointer(event)
      if (editor.kind === "circle" && !readOnly && activeTool === "mark" && point && circlePlacement?.step === drag.step
        && Math.hypot(event.clientX - drag.startClient.x, event.clientY - drag.startClient.y) < MIN_DISTANCE_DRAG_PX) {
        editor.onPlacePoint?.(imagePointToNormalized(point, rendering), drag.step)
      }
    } else if (drag.kind === "place-landmarks") {
      const point = placementPointFromPointer(event)
      if (editor.kind === "landmarks" && !readOnly && activeTool === "mark" && point && landmarksPlacement?.activePoint === drag.point
        && !drag.moved && Math.hypot(event.clientX - drag.startClient.x, event.clientY - drag.startClient.y) < MIN_DISTANCE_DRAG_PX) {
        editor.onPlacePoint?.(imagePointToNormalized(point, rendering), drag.point)
      }
    } else if (drag.kind !== "pan" && !readOnly && activeTool === "mark") {
      const end = pointFromPointer(event)
      if (end) {
        if (isAngleDrag(drag)) {
          const next = angleFromDrag(drag, end, rendering)
          if (next && Math.hypot(event.clientX - drag.startClient.x, event.clientY - drag.startClient.y) >= MIN_DISTANCE_DRAG_PX) {
            committedAngle = next
            onAngleGeometryChange(next)
          }
        } else if (isCircleDrag(drag)) {
          const next = circleFromDrag(drag, end, rendering)
          if (next && Math.hypot(event.clientX - drag.startClient.x, event.clientY - drag.startClient.y) >= MIN_DISTANCE_DRAG_PX) {
            committedCircle = next
            onCircleGeometryChange(next)
          }
        } else if (isLandmarksDrag(drag)) {
          const next = landmarksFromDrag(drag, end, rendering)
          if (next && Math.hypot(event.clientX - drag.startClient.x, event.clientY - drag.startClient.y) >= MIN_DISTANCE_DRAG_PX) {
            committedLandmarks = next
            onLandmarksGeometryChange(next)
          }
        } else {
          const next = markerFromDrag(drag, end, rendering, edgeInset)
          const deliberateDrag = editor.kind !== "distance"
            || Math.hypot(event.clientX - drag.startClient.x, event.clientY - drag.startClient.y) >= MIN_DISTANCE_DRAG_PX
          const validGeometry = next.kind === "line" ? editor.kind === "distance"
            ? distanceLineHasValidSize(next, drag.kind === "move-line" ? "move" : "reshape")
            : Math.hypot(next.end.x - next.start.x, next.end.y - next.start.y) >= 2 : next.radiusPx >= 1
          if (deliberateDrag && validGeometry) {
            committedMarker = next
            onMarkerChange(next)
          }
        }
      }
    }
    dragRef.current = null
    activePointerRef.current = null
    setPointerActive(false)
    previewMarker(null)
    previewAngle(null)
    previewCircle(null)
    previewLandmarks(null)
    setPlacementCursor(null)
    if (editor.kind === "angle") setHoveredAnglePart(anglePartFromPointer(event, committedAngle))
    else if (editor.kind === "circle") setHoveredCirclePart(circlePartFromPointer(event, committedCircle))
    else if (editor.kind === "landmarks") setHoveredLandmarksPart(landmarksPartFromPointer(event, committedLandmarks))
    else setHoveredMarkerPart(markerPartFromPointer(event, committedMarker))
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function handlePointerCancel(event: PointerEvent<HTMLDivElement>) {
    if (currentGestureOwner.current !== gestureOwner) return
    if (activePointerRef.current !== event.pointerId) return
    dragRef.current = null
    activePointerRef.current = null
    setPointerActive(false)
    previewMarker(null)
    previewAngle(null)
    previewCircle(null)
    previewLandmarks(null)
    setPlacementCursor(null)
    setHoveredMarkerPart(null)
    setHoveredAnglePart(null)
    setHoveredCirclePart(null)
    setHoveredLandmarksPart(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function resetView() {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (interactionsBlocked || currentGestureOwner.current !== gestureOwner) return
    if (event.key === "Escape") {
      const pointerId = activePointerRef.current
      dragRef.current = null
      activePointerRef.current = null
      setPointerActive(false)
      previewMarker(null)
      previewAngle(null)
      previewCircle(null)
      previewLandmarks(null)
      setPlacementCursor(null)
      setHoveredMarkerPart(null)
      setHoveredAnglePart(null)
      setHoveredCirclePart(null)
      setHoveredLandmarksPart(null)
      if (pointerId !== null && event.currentTarget.hasPointerCapture(pointerId)) event.currentTarget.releasePointerCapture(pointerId)
      if (editor.kind !== "distance" && editor.kind !== "angle" && editor.kind !== "circle" && editor.kind !== "landmarks") onToolChange("pan")
      return
    }
    if ((editor.kind === "distance" || editor.kind === "angle" || editor.kind === "circle" || editor.kind === "landmarks") && dragRef.current) return
    if (editor.kind === "landmarks") {
      if (landmarksPlacement) {
        if (readOnly || activeTool !== "mark" || event.ctrlKey || event.metaKey || event.altKey) return
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
          event.preventDefault()
          const key = { key: event.key, shiftKey: event.shiftKey }
          setPlacementCursor(current => {
            const point = landmarksPlacementFromKeyboard(landmarksPlacement, current?.owner === gestureOwner ? current.point : null, key, rendering, mirrored)
            return point ? { owner: gestureOwner, point } : current
          })
        } else if (event.key === "Enter" && !event.repeat && placementPoint) {
          event.preventDefault()
          editor.onPlacePoint?.(imagePointToNormalized(placementPoint, rendering), landmarksPlacement.activePoint)
          setPlacementCursor(null)
        }
        return
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const targetShortcut = ({ "1": "body", "2": "plateau_cranial", "3": "plateau_caudal", "4": "intercondylar_midpoint", "5": "talus_center" } as const)[event.key as "1" | "2" | "3" | "4" | "5"]
      if (!readOnly && activeTool === "mark" && landmarksGeometry && !event.ctrlKey && !event.metaKey && !event.altKey
        && targetShortcut && editor.onKeyboardTargetChange) {
        event.preventDefault()
        editor.onKeyboardTargetChange(targetShortcut)
        return
      }
      if (readOnly || activeTool !== "mark" || !landmarksGeometry || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return
      event.preventDefault()
      const next = landmarksFromKeyboard(landmarksGeometry, editor.keyboardTarget ?? "body", event, rendering, mirrored)
      if (next) onLandmarksGeometryChange(next)
      return
    }
    if (editor.kind === "circle") {
      if (circlePlacement) {
        if (!readOnly && activeTool === "mark" && event.key === "Enter" && !event.repeat && editor.onPlaceCentered) {
          event.preventDefault()
          editor.onPlaceCentered()
        }
        return
      }
      const targetShortcut = ({ "1": "body", "2": "edge" } as const)[event.key as "1" | "2"]
      if (!readOnly && activeTool === "mark" && circleGeometry && !event.ctrlKey && !event.metaKey && !event.altKey
        && targetShortcut && editor.onKeyboardTargetChange) {
        event.preventDefault()
        editor.onKeyboardTargetChange(targetShortcut)
        return
      }
      if (readOnly || activeTool !== "mark" || !circleGeometry || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return
      event.preventDefault()
      const next = circleFromKeyboard(circleGeometry, editor.keyboardTarget ?? "body", event, rendering, mirrored)
      if (next) onCircleGeometryChange(next)
      return
    }
    if (editor.kind === "angle") {
      if (anglePlacement) {
        if (!readOnly && activeTool === "mark" && event.key === "Enter" && !event.repeat && editor.onPlaceCentered) {
          event.preventDefault()
          editor.onPlaceCentered()
        }
        return
      }
      const targetShortcut = ({ "1": "body", "2": "start", "3": "vertex", "4": "end" } as const)[event.key as "1" | "2" | "3" | "4"]
      if (!readOnly && activeTool === "mark" && angleGeometry && !event.ctrlKey && !event.metaKey && !event.altKey
        && targetShortcut && editor.onKeyboardTargetChange) {
        event.preventDefault()
        editor.onKeyboardTargetChange(targetShortcut)
        return
      }
      if (readOnly || activeTool !== "mark" || !angleGeometry || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return
      event.preventDefault()
      const next = angleFromKeyboard(angleGeometry, editor.keyboardTarget ?? "body", event, rendering, mirrored)
      if (next) onAngleGeometryChange(next)
      return
    }
    if (readOnly || activeTool !== "mark" || !marker || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return
    event.preventDefault()
    const next = editor.kind === "distance" && marker.kind === "line"
      ? distanceMarkerFromKeyboard(marker, editor.keyboardTarget ?? "body", event, rendering, mirrored)
      : markerFromKeyboard(marker, event, rendering, edgeInset, mirrored)
    if (next) onMarkerChange(next, "keyboard")
  }

  async function toggleFullscreen() {
    const section = sectionRef.current
    if (!section) return
    if (document.fullscreenElement === section) await document.exitFullscreen()
    else await section.requestFullscreen()
  }

  return (
    <section aria-label={t("region")} data-image-viewer className={`relative order-2 flex min-h-[32rem] min-w-0 flex-col overflow-hidden rounded-[var(--radius-token-md)] border border-border text-white lg:col-start-2 lg:row-start-1 lg:min-h-0 lg:order-none fullscreen:rounded-none fullscreen:border-0 ${inverted ? "bg-[var(--case-viewer-canvas-inverted)]" : "bg-[var(--case-viewer-shell)]"}`} ref={sectionRef}
      onKeyDownCapture={trackAdjustmentKey} onKeyUpCapture={event => {
        adjustmentKeys.current.delete(event.key)
        setKeyboardAdjusting(adjustmentKeys.current.size > 0)
      }} onBlurCapture={clearKeyboardAdjustment}>
      <div className={`flex min-h-0 flex-1 flex-col ${interactionsBlocked ? "pointer-events-none" : ""}`} inert={interactionsBlocked}>
        <div className="flex min-h-14 shrink-0 items-center justify-center px-4 py-2">
          <div aria-label={t("tools")} className={`${VIEWER_TOOLBAR_CLASS_NAME} overflow-x-auto`} role="toolbar">
            {!readOnly ? <ViewerButton disabled={interactionsBlocked} active={activeTool === "mark"} label={editor.kind === "landmarks" ? tLandmarks(landmarksPlacement ? "placement.mark" : "viewer.adjust") : editor.kind === "circle" ? tCircle(circlePlacement ? "placement.mark" : "viewer.adjust") : editor.kind === "angle" ? tAngle("viewer.adjust") : editor.kind === "distance" ? tDistance(editor.intent === "update" ? "adjust" : "draw") : t("mark")} onClick={() => onToolChange("mark")}><Crosshair aria-hidden="true" /></ViewerButton> : null}
            <ViewerButton disabled={interactionsBlocked} active={activeTool === "pan"} label={t("pan")} onClick={() => onToolChange("pan")}><Hand aria-hidden="true" /></ViewerButton>
            <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-white/15" />
            <ViewerButton disabled={interactionsBlocked} label={t("zoomOut")} onClick={() => setZoom((value) => Math.max(0.5, Number((value - 0.25).toFixed(2))))}><ZoomOut aria-hidden="true" /></ViewerButton>
            <span className="min-w-9 text-center font-data text-[10px] tabular-nums text-white/70">{Math.round(zoom * 100)}%</span>
            <ViewerButton disabled={interactionsBlocked} label={t("zoomIn")} onClick={() => setZoom((value) => Math.min(4, Number((value + 0.25).toFixed(2))))}><ZoomIn aria-hidden="true" /></ViewerButton>
            <ViewerButton disabled={interactionsBlocked} label={t("fit")} onClick={resetView}><RotateCcw aria-hidden="true" /></ViewerButton>
            <ViewerButton disabled={interactionsBlocked} label={t(isFullscreen ? "exitFullscreen" : "fullscreen")} onClick={() => void toggleFullscreen()}>{isFullscreen ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}</ViewerButton>
          </div>
        </div>
        <div className="relative min-h-[26rem] flex-1 lg:min-h-0">
          <div
            aria-label={!readOnly && editor.kind === "landmarks" ? tLandmarks(landmarksPlacement ? "placement.keyboardHint" : "viewer.keyboardHint") : !readOnly && editor.kind === "circle" ? circlePlacement ? tCircle("placement.keyboardHint", { step: tCircle(`placement.${circlePlacement.step}Hint`) }) : tCircle("viewer.keyboardHint") : !readOnly && editor.kind === "angle" ? anglePlacement ? tAngle("placement.keyboardHint", { step: tAngle(`placement.${anglePlacement.step}Hint`) }) : tAngle("viewer.keyboardHint") : !readOnly && editor.kind === "distance" ? tDistance("keyboardHint") : t(readOnly ? "region" : "keyboardHint")}
            className={`absolute inset-0 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset touch-none ${inverted ? "bg-[var(--case-viewer-canvas-inverted)] focus-visible:ring-black/50" : "bg-[var(--case-viewer-canvas)] focus-visible:ring-white/50"} ${activeTool === "pan" ? "cursor-grab active:cursor-grabbing" : (editor.kind === "landmarks" ? hoveredLandmarksPart : editor.kind === "circle" ? hoveredCirclePart : editor.kind === "angle" ? hoveredAnglePart : hoveredMarkerPart) ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"}`}
            data-calibration-viewport
            onKeyDown={handleKeyDown}
            onLostPointerCapture={handlePointerCancel}
            onPointerCancel={handlePointerCancel}
            onPointerDown={handlePointerDown}
            onPointerLeave={() => { if (!dragRef.current) { setHoveredMarkerPart(null); setHoveredAnglePart(null); setHoveredCirclePart(null); setHoveredLandmarksPart(null); setPlacementCursor(null) } }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            ref={viewportRef}
            role="group"
            tabIndex={interactionsBlocked ? -1 : 0}
          >
            {displayWidth > 0 ? (
              <div
                className="absolute top-1/2 left-1/2 select-none"
                ref={imageRef}
                data-image-mirrored={mirrored}
                style={{ width: displayWidth, height: displayHeight, transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})${mirrored ? " scaleX(-1)" : ""}` }}
              >
                <img alt={t("imageAlt", { name })} className="size-full object-fill select-none" draggable={false} onError={onImageError} onLoad={onImageLoad} referrerPolicy="no-referrer" src={rendering.url} style={{ filter: `brightness(${brightness}%) contrast(${contrast}%)${inverted ? " invert(1)" : ""}` }} />
                <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible" viewBox={`0 0 ${rendering.widthPx} ${rendering.heightPx}`}>
                  {renderOverlay?.({ widthPx: rendering.widthPx, heightPx: rendering.heightPx, scale: fitScale * zoom, mirrored, activeGesture: Boolean(draftMarker || draftAngle || draftCircle || draftLandmarks || (landmarksPlacement && placementPoint) || (pointerActive && (anglePlacement || circlePlacement || landmarksPlacement))) })}
                  {editor.kind === "angle" && anglePlacement ? <ViewerAnglePlacementOverlay placement={anglePlacement}
                    cursor={!readOnly && activeTool === "mark" ? placementPoint : null} handleRadius={fitScale * zoom > 0 ? 4 / (fitScale * zoom) : 4} />
                    : editor.kind === "angle" ? <ViewerAngleEditorOverlay geometry={readOnly ? angleGeometry : draftAngle ?? angleGeometry} editable={!readOnly}
                    handleRadius={fitScale * zoom > 0 ? 4 / (fitScale * zoom) : 4} focusedPart={editor.keyboardTarget}
                    hoveredPart={activeTool === "mark" && !interactionsBlocked ? hoveredAnglePart : null} />
                    : editor.kind === "circle" && circlePlacement ? <ViewerCirclePlacementOverlay placement={circlePlacement}
                    cursor={!readOnly && activeTool === "mark" ? placementPoint : null} handleRadius={fitScale * zoom > 0 ? 4 / (fitScale * zoom) : 4} />
                    : editor.kind === "circle" ? <ViewerCircleEditorOverlay geometry={readOnly ? circleGeometry : draftCircle ?? circleGeometry} editable={!readOnly}
                    handleRadius={fitScale * zoom > 0 ? 4 / (fitScale * zoom) : 4} focusedPart={editor.keyboardTarget}
                    hoveredPart={activeTool === "mark" && !interactionsBlocked ? hoveredCirclePart : null} />
                    : editor.kind === "landmarks" && landmarksPlacement ? <ViewerLandmarksPlacementOverlay placement={landmarksPlacement} mirrored={mirrored}
                    cursor={!readOnly && activeTool === "mark" ? placementPoint : null} handleRadius={fitScale * zoom > 0 ? 4 / (fitScale * zoom) : 4} />
                    : editor.kind === "landmarks" ? <ViewerLandmarksEditorOverlay geometry={readOnly ? landmarksGeometry : draftLandmarks ?? landmarksGeometry} editable={!readOnly}
                    mirrored={mirrored} dimensions={rendering}
                    handleRadius={fitScale * zoom > 0 ? 4 / (fitScale * zoom) : 4} focusedPart={editor.keyboardTarget}
                    hoveredPart={activeTool === "mark" && !interactionsBlocked ? hoveredLandmarksPart : null} />
                    : <ViewerEditorOverlay mode={editor.kind === "distance" ? "distance" : "calibration"} editable={!readOnly} handleRadius={fitScale * zoom > 0 ? 4 / (fitScale * zoom) : 4}
                    focusedPart={editor.kind === "distance" ? editor.keyboardTarget : undefined}
                    hoveredPart={activeTool === "mark" && !interactionsBlocked ? hoveredMarkerPart : null} marker={readOnly ? marker : draftMarker ?? marker} />}
                </svg>
              </div>
            ) : null}
            {!editorControls || anglePlacement || circlePlacement ? <div className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-[var(--color-obsidian)] px-3 py-1.5 font-data text-[10px] text-white/75">{landmarksPlacement && activeTool === "mark" ? tLandmarks("placement.activePoint", { point: tLandmarks(`points.${landmarksPlacement.activePoint}`) }) : editor.kind === "landmarks" && activeTool === "mark" ? tLandmarks("viewer.adjustHint") : circlePlacement && activeTool === "mark" ? tCircle(`placement.${circlePlacement.step}Hint`) : anglePlacement && activeTool === "mark" ? tAngle(`placement.${anglePlacement.step}Hint`) : editor.kind === "circle-select" && circlePicking?.enabled ? tCircle("pickHint") : editor.kind === "circle" && activeTool === "mark" ? tCircle("viewer.adjustHint") : editor.kind === "angle-select" && anglePicking?.enabled ? tAngle("pickHint") : editor.kind === "angle" && activeTool === "mark" ? tAngle("viewer.adjustHint") : editor.kind === "distance-select" && picking?.enabled ? tDistance("pickHint") : activeTool === "mark" && editor.kind === "distance" && !marker ? tDistance("drawHint") : t(activeTool === "pan" ? "panHint" : marker?.kind === "line" && markerKind === "line" ? "lineEditHint" : marker?.kind === "circle" && markerKind === "circle" ? "circleEditHint" : "markHint")}</div> : null}
          </div>
          {contextControls && !pointerActive && !keyboardAdjusting ? <div className="absolute z-30" style={{ left: contextLeft, top: contextTop }}>{contextControls.content}</div> : null}
        </div>
      </div>
      {editorControls ? <ViewerEditorControls>{editorControls}</ViewerEditorControls> : null}
      {interactionNotice}
    </section>
  )
}

export { CaseImageViewer }
export type { ViewerTool }
