"use client"

import { Crosshair, Hand, Maximize2, Minimize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react"

import { circleDiameter, circleFromDiameter, hitTestCircleMarker, moveCircleMarker, resizeCircleDiameter, resizeCircleMarker, type CircleHit, type CircleMarker } from "../lib/circle-marker-interaction"
import { mapClientPointToImage } from "../lib/image-coordinate-map"
import { hitTestLineMarker, moveLineMarker, resizeLineMarker, type LineHit, type LineMarker } from "../lib/line-marker-interaction"
import type { CalibrationMarker, ImagePoint, ImageRendering } from "../types/case-workspace"

type ReadyRendering = Pick<Extract<ImageRendering, { status: "ready" }>, "url" | "widthPx" | "heightPx">
type ViewerTool = "mark" | "pan"
type ViewerDrag =
  | { kind: "create"; markerKind: CalibrationMarker["kind"]; start: ImagePoint }
  | { kind: "resize-line"; endpoint: "start" | "end"; marker: LineMarker }
  | { kind: "move-line"; marker: LineMarker; origin: ImagePoint }
  | { kind: "resize-circle"; marker: CircleMarker }
  | { kind: "resize-circle-diameter"; endpoint: "start" | "end"; marker: CircleMarker }
  | { kind: "move-circle"; marker: CircleMarker; origin: ImagePoint }
  | { kind: "pan"; x: number; y: number; startX: number; startY: number }

type CaseImageViewerProps = {
  brightness: number
  contrast: number
  inverted: boolean
  mirrored?: boolean
  interactionNotice?: ReactNode
  marker: CalibrationMarker | null
  markerKind: CalibrationMarker["kind"]
  name: string
  onMarkerChange: (marker: CalibrationMarker) => void
  onToolChange: (tool: ViewerTool) => void
  onImageError?: () => void
  onImageLoad?: () => void
  /** Remote plans use inclusive image edges, rather than legacy pixel centres. */
  coordinateSpace?: "legacy" | "image-edges"
  readOnly?: boolean
  rendering: ReadyRendering
  tool: ViewerTool
}

function CaseImageViewer({ brightness, contrast, inverted, mirrored = false, interactionNotice, marker, markerKind, name, onMarkerChange, onToolChange, onImageError, onImageLoad, coordinateSpace = "legacy", readOnly = false, rendering, tool }: CaseImageViewerProps) {
  const t = useTranslations("cases.workspace.viewer")
  const activeTool = readOnly ? "pan" : tool
  const interactionsBlocked = Boolean(interactionNotice)
  const edgeInset = coordinateSpace === "image-edges" ? 0 : 1
  const viewportRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<ViewerDrag | null>(null)
  const activePointerRef = useRef<number | null>(null)
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [draftMarker, setDraftMarker] = useState<CalibrationMarker | null>(null)
  const [hoveredMarkerPart, setHoveredMarkerPart] = useState<LineHit | CircleHit>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    dragRef.current = null
    activePointerRef.current = null
    setDraftMarker(null)
    setHoveredMarkerPart(null)
  }, [readOnly, tool, markerKind, rendering.widthPx, rendering.heightPx, interactionsBlocked, mirrored])

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

  function pointFromPointer(event: PointerEvent<HTMLDivElement>): ImagePoint | null {
    const rect = imageRef.current?.getBoundingClientRect()
    if (!rect) return null
    // The bounding rectangle has positive dimensions even after scaleX(-1).
    // Reflect the pointer back to source space for both mapping and hit tests.
    const pointer = sourcePointer(event, rect)
    return mapClientPointToImage(pointer.x, pointer.y, rect, rendering.widthPx, rendering.heightPx, edgeInset)
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

  function markerFromDrag(drag: Exclude<ViewerDrag, { kind: "pan" }>, point: ImagePoint): CalibrationMarker {
    if (drag.kind === "resize-line") return resizeLineMarker(drag.marker, drag.endpoint, point)
    if (drag.kind === "move-line") return moveLineMarker(drag.marker, drag.origin, point, rendering.widthPx, rendering.heightPx, edgeInset)
    if (drag.kind === "resize-circle") return resizeCircleMarker(drag.marker, point, rendering.widthPx, rendering.heightPx, edgeInset)
    if (drag.kind === "resize-circle-diameter") return resizeCircleDiameter(drag.marker, drag.endpoint, point, rendering.widthPx, rendering.heightPx, edgeInset)
    if (drag.kind === "move-circle") return moveCircleMarker(drag.marker, drag.origin, point, rendering.widthPx, rendering.heightPx, edgeInset)
    return drag.markerKind === "line"
      ? { kind: "line", start: drag.start, end: point }
      : circleFromDiameter(drag.start, point)
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (interactionsBlocked) return
    if (event.button !== 0 || event.isPrimary === false || dragRef.current) return
    event.currentTarget.focus({ preventScroll: true })
    if (activeTool === "pan") {
      dragRef.current = { kind: "pan", x: pan.x, y: pan.y, startX: event.clientX, startY: event.clientY }
    } else {
      const rect = imageRef.current?.getBoundingClientRect()
      if (!rect || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return
      const start = pointFromPointer(event)
      if (!start) return
      const hit = markerPartFromPointer(event)
      setHoveredMarkerPart(hit)
      if (marker?.kind === "line" && markerKind === "line" && (hit === "start" || hit === "end")) {
        dragRef.current = { kind: "resize-line", endpoint: hit, marker }
      } else if (marker?.kind === "line" && markerKind === "line" && hit === "body") {
        dragRef.current = { kind: "move-line", marker, origin: start }
      } else if (marker?.kind === "circle" && markerKind === "circle" && (hit === "start" || hit === "end")) {
        dragRef.current = { kind: "resize-circle-diameter", endpoint: hit, marker }
      } else if (marker?.kind === "circle" && markerKind === "circle" && hit === "edge") {
        dragRef.current = { kind: "resize-circle", marker }
      } else if (marker?.kind === "circle" && markerKind === "circle" && hit === "body") {
        dragRef.current = { kind: "move-circle", marker, origin: start }
      } else {
        dragRef.current = { kind: "create", markerKind, start }
      }
    }
    activePointerRef.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (interactionsBlocked) return
    const drag = dragRef.current
    if (!drag) {
      setHoveredMarkerPart(markerPartFromPointer(event))
      return
    }
    if (activePointerRef.current !== event.pointerId) return
    if ((readOnly || activeTool !== "mark") && drag.kind !== "pan") { handlePointerCancel(event); return }
    if (drag.kind === "pan") {
      setPan({ x: drag.x + event.clientX - drag.startX, y: drag.y + event.clientY - drag.startY })
      return
    }
    const end = pointFromPointer(event)
    if (!end) return
    setDraftMarker(markerFromDrag(drag, end))
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (interactionsBlocked) return
    const drag = dragRef.current
    if (!drag || activePointerRef.current !== event.pointerId) return
    let committedMarker = marker
    if (drag.kind !== "pan" && !readOnly && activeTool === "mark") {
      const end = pointFromPointer(event)
      if (end) {
        const next = markerFromDrag(drag, end)
        if (next.kind === "line" ? Math.hypot(next.end.x - next.start.x, next.end.y - next.start.y) >= 2 : next.radiusPx >= 1) {
          committedMarker = next
          onMarkerChange(next)
        }
      }
    }
    dragRef.current = null
    activePointerRef.current = null
    setDraftMarker(null)
    setHoveredMarkerPart(markerPartFromPointer(event, committedMarker))
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function handlePointerCancel(event: PointerEvent<HTMLDivElement>) {
    if (activePointerRef.current !== event.pointerId) return
    dragRef.current = null
    activePointerRef.current = null
    setDraftMarker(null)
    setHoveredMarkerPart(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function resetView() {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (interactionsBlocked) return
    if (event.key === "Escape") { dragRef.current = null; activePointerRef.current = null; setDraftMarker(null); onToolChange("pan"); return }
    if (readOnly || activeTool !== "mark" || !marker || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return
    event.preventDefault()
    const step = event.shiftKey ? 10 : 1
    const delta = { x: event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0,
      y: event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0 }
    const sourceDelta = { x: mirrored ? -delta.x : delta.x, y: delta.y }
    const w = rendering.widthPx, h = rendering.heightPx
    if (event.altKey) {
      let next: CalibrationMarker
      if (marker.kind === "line") {
        next = resizeLineMarker(marker, "end", {
          x: Math.max(0, Math.min(w - edgeInset, marker.end.x + sourceDelta.x)), y: Math.max(0, Math.min(h - edgeInset, marker.end.y + sourceDelta.y)),
        })
      } else {
        const radius = Math.max(1, marker.radiusPx + delta.x - delta.y)
        const edge = marker.edge && marker.radiusPx > 0
          ? { x: marker.center.x + (marker.edge.x - marker.center.x) / marker.radiusPx * radius,
            y: marker.center.y + (marker.edge.y - marker.center.y) / marker.radiusPx * radius }
          : { x: marker.center.x + radius, y: marker.center.y }
        next = resizeCircleMarker(marker, edge, w, h, edgeInset)
      }
      if (next.kind === "circle" ? next.radiusPx >= 1 : Math.hypot(next.end.x - next.start.x, next.end.y - next.start.y) >= 2) onMarkerChange(next)
    } else {
      onMarkerChange(marker.kind === "line" ? moveLineMarker(marker, { x: 0, y: 0 }, sourceDelta, w, h, edgeInset)
        : moveCircleMarker(marker, { x: 0, y: 0 }, sourceDelta, w, h, edgeInset))
    }
  }

  async function toggleFullscreen() {
    const section = sectionRef.current
    if (!section) return
    if (document.fullscreenElement === section) await document.exitFullscreen()
    else await section.requestFullscreen()
  }

  return (
    <section aria-label={t("region")} className={`relative order-2 flex min-h-[32rem] min-w-0 flex-col overflow-hidden rounded-[var(--radius-token-md)] border border-border text-white lg:col-start-2 lg:row-start-1 lg:min-h-0 lg:order-none fullscreen:rounded-none fullscreen:border-0 ${inverted ? "bg-[var(--case-viewer-canvas-inverted)]" : "bg-[var(--case-viewer-shell)]"}`} ref={sectionRef}>
      <div className={`flex min-h-0 flex-1 flex-col ${interactionsBlocked ? "pointer-events-none" : ""}`} inert={interactionsBlocked}>
        <div className="flex min-h-14 shrink-0 items-center justify-center px-4 py-2">
          <div aria-label={t("tools")} className="flex max-w-full items-center gap-1 overflow-x-auto rounded-[var(--radius-token-md)] bg-[var(--color-obsidian)] p-1 shadow-sm" role="toolbar">
            {!readOnly ? <ViewerButton disabled={interactionsBlocked} active={activeTool === "mark"} label={t("mark")} onClick={() => onToolChange("mark")}><Crosshair aria-hidden="true" /></ViewerButton> : null}
            <ViewerButton disabled={interactionsBlocked} active={activeTool === "pan"} label={t("pan")} onClick={() => onToolChange("pan")}><Hand aria-hidden="true" /></ViewerButton>
            <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-white/15" />
            <ViewerButton disabled={interactionsBlocked} label={t("zoomOut")} onClick={() => setZoom((value) => Math.max(0.5, Number((value - 0.25).toFixed(2))))}><ZoomOut aria-hidden="true" /></ViewerButton>
            <span className="min-w-9 text-center font-data text-[10px] tabular-nums text-white/70">{Math.round(zoom * 100)}%</span>
            <ViewerButton disabled={interactionsBlocked} label={t("zoomIn")} onClick={() => setZoom((value) => Math.min(4, Number((value + 0.25).toFixed(2))))}><ZoomIn aria-hidden="true" /></ViewerButton>
            <ViewerButton disabled={interactionsBlocked} label={t("fit")} onClick={resetView}><RotateCcw aria-hidden="true" /></ViewerButton>
            <ViewerButton disabled={interactionsBlocked} label={t(isFullscreen ? "exitFullscreen" : "fullscreen")} onClick={() => void toggleFullscreen()}>{isFullscreen ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}</ViewerButton>
          </div>
        </div>
        <div
          aria-label={t(readOnly ? "region" : "keyboardHint")}
          className={`relative min-h-[26rem] flex-1 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset touch-none lg:min-h-0 ${inverted ? "bg-[var(--case-viewer-canvas-inverted)] focus-visible:ring-black/50" : "bg-[var(--case-viewer-canvas)] focus-visible:ring-white/50"} ${activeTool === "pan" ? "cursor-grab active:cursor-grabbing" : hoveredMarkerPart && hoveredMarkerPart !== "body" ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"}`}
          data-calibration-viewport
          onKeyDown={handleKeyDown}
          onLostPointerCapture={handlePointerCancel}
          onPointerCancel={handlePointerCancel}
          onPointerDown={handlePointerDown}
          onPointerLeave={() => { if (!dragRef.current) setHoveredMarkerPart(null) }}
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
                <MarkerShape editable={!readOnly} handleRadius={fitScale * zoom > 0 ? 4 / (fitScale * zoom) : 4}
                  hoveredPart={activeTool === "mark" && !interactionsBlocked ? hoveredMarkerPart : null} marker={readOnly ? marker : draftMarker ?? marker} />
              </svg>
            </div>
          ) : null}
          <div className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-[var(--color-obsidian)] px-3 py-1.5 font-data text-[10px] text-white/75">{t(activeTool === "pan" ? "panHint" : marker?.kind === "line" && markerKind === "line" ? "lineEditHint" : marker?.kind === "circle" && markerKind === "circle" ? "circleEditHint" : "markHint")}</div>
        </div>
      </div>
      {interactionNotice}
    </section>
  )
}

function MarkerShape({ editable, handleRadius, hoveredPart, marker }: { editable: boolean; handleRadius: number; hoveredPart: LineHit | CircleHit; marker: CalibrationMarker | null }) {
  if (!marker) return null
  if (marker.kind === "line") return (
    <g fill="none" stroke="var(--case-editor-radio-active)" strokeWidth="2" vectorEffect="non-scaling-stroke">
      <line vectorEffect="non-scaling-stroke" x1={marker.start.x} x2={marker.end.x} y1={marker.start.y} y2={marker.end.y} />
      {editable ? <MarkerHandles start={marker.start} end={marker.end} handleRadius={handleRadius} hoveredPart={hoveredPart} /> : null}
    </g>
  )
  const diameter = circleDiameter(marker)
  return <>
    <circle cx={marker.center.x} cy={marker.center.y} data-calibration-circle fill="none" r={marker.radiusPx} stroke="var(--case-calibration-circle)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    {editable ? <g fill="none" stroke="var(--case-editor-radio-active)" strokeWidth="2">
      <line data-calibration-diameter vectorEffect="non-scaling-stroke" x1={diameter.start.x} x2={diameter.end.x} y1={diameter.start.y} y2={diameter.end.y} />
      <MarkerHandles {...diameter} handleRadius={handleRadius} hoveredPart={hoveredPart} />
    </g> : null}
  </>
}

function MarkerHandles({ start, end, handleRadius, hoveredPart }: { start: ImagePoint; end: ImagePoint; handleRadius: number; hoveredPart: LineHit | CircleHit }) {
  return <>{(["start", "end"] as const).map(endpoint => {
    const point = endpoint === "start" ? start : end
    return <circle className="transition-[r] duration-100 motion-reduce:transition-none" cx={point.x} cy={point.y} data-calibration-handle={endpoint}
      fill="var(--case-editor-radio-active)" key={endpoint} r={handleRadius * (hoveredPart === endpoint ? 1.75 : 1)} vectorEffect="non-scaling-stroke" />
  })}</>
}

function ViewerButton({ active, children, disabled, label, onClick }: { active?: boolean; children: ReactNode; disabled?: boolean; label: string; onClick: () => void }) {
  return <button aria-label={label} aria-pressed={active} className={`flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-token-md)] text-white outline-none transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70 [&_svg]:size-4 ${active ? "bg-white/20" : ""}`} disabled={disabled} onClick={onClick} title={label} type="button">{children}</button>
}

export { CaseImageViewer }
export type { ViewerTool }
