"use client"

import { Crosshair, Hand, Maximize2, Minimize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState, type PointerEvent } from "react"

import { hitTestCircleMarker, moveCircleMarker, resizeCircleMarker, type CircleHit, type CircleMarker } from "../lib/circle-marker-interaction"
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
  | { kind: "move-circle"; marker: CircleMarker; origin: ImagePoint }
  | { kind: "pan"; x: number; y: number; startX: number; startY: number }

type CaseImageViewerProps = {
  brightness: number
  contrast: number
  inverted: boolean
  marker: CalibrationMarker | null
  markerKind: CalibrationMarker["kind"]
  name: string
  onMarkerChange: (marker: CalibrationMarker) => void
  onToolChange: (tool: ViewerTool) => void
  onImageError?: () => void
  readOnly?: boolean
  rendering: ReadyRendering
  tool: ViewerTool
}

function CaseImageViewer({ brightness, contrast, inverted, marker, markerKind, name, onMarkerChange, onToolChange, onImageError, readOnly = false, rendering, tool }: CaseImageViewerProps) {
  const t = useTranslations("cases.workspace.viewer")
  const activeTool = readOnly ? "pan" : tool
  const viewportRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<ViewerDrag | null>(null)
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [draftMarker, setDraftMarker] = useState<CalibrationMarker | null>(null)
  const [hoveredMarkerPart, setHoveredMarkerPart] = useState<LineHit | CircleHit>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

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
    return rect ? mapClientPointToImage(event.clientX, event.clientY, rect, rendering.widthPx, rendering.heightPx) : null
  }

  function markerPartFromPointer(event: PointerEvent<HTMLDivElement>): LineHit | CircleHit {
    if (activeTool !== "mark" || marker?.kind !== markerKind) return null
    const rect = imageRef.current?.getBoundingClientRect()
    if (!rect) return null
    const pointer = { x: event.clientX, y: event.clientY }
    return marker.kind === "line"
      ? hitTestLineMarker(pointer, marker, rect, rendering.widthPx, rendering.heightPx)
      : hitTestCircleMarker(pointer, marker, rect, rendering.widthPx, rendering.heightPx)
  }

  function markerFromDrag(drag: Exclude<ViewerDrag, { kind: "pan" }>, point: ImagePoint): CalibrationMarker {
    if (drag.kind === "resize-line") return resizeLineMarker(drag.marker, drag.endpoint, point)
    if (drag.kind === "move-line") return moveLineMarker(drag.marker, drag.origin, point, rendering.widthPx, rendering.heightPx)
    if (drag.kind === "resize-circle") return resizeCircleMarker(drag.marker, point, rendering.widthPx, rendering.heightPx)
    if (drag.kind === "move-circle") return moveCircleMarker(drag.marker, drag.origin, point, rendering.widthPx, rendering.heightPx)
    return drag.markerKind === "line"
      ? { kind: "line", start: drag.start, end: point }
      : resizeCircleMarker({ kind: "circle", center: drag.start, radiusPx: 0 }, point, rendering.widthPx, rendering.heightPx)
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    if (activeTool === "pan") {
      dragRef.current = { kind: "pan", x: pan.x, y: pan.y, startX: event.clientX, startY: event.clientY }
    } else {
      const rect = imageRef.current?.getBoundingClientRect()
      if (!rect || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return
      const start = pointFromPointer(event)
      if (!start) return
      const hit = markerPartFromPointer(event)
      if (marker?.kind === "line" && markerKind === "line" && (hit === "start" || hit === "end")) {
        dragRef.current = { kind: "resize-line", endpoint: hit, marker }
      } else if (marker?.kind === "line" && markerKind === "line" && hit === "body") {
        dragRef.current = { kind: "move-line", marker, origin: start }
      } else if (marker?.kind === "circle" && markerKind === "circle" && hit === "edge") {
        dragRef.current = { kind: "resize-circle", marker }
      } else if (marker?.kind === "circle" && markerKind === "circle" && hit === "body") {
        dragRef.current = { kind: "move-circle", marker, origin: start }
      } else {
        dragRef.current = { kind: "create", markerKind, start }
      }
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) {
      setHoveredMarkerPart(markerPartFromPointer(event))
      return
    }
    if (drag.kind === "pan") {
      setPan({ x: drag.x + event.clientX - drag.startX, y: drag.y + event.clientY - drag.startY })
      return
    }
    const end = pointFromPointer(event)
    if (!end) return
    setDraftMarker(markerFromDrag(drag, end))
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return
    if (drag.kind !== "pan") {
      const end = pointFromPointer(event)
      if (end) {
        const next = markerFromDrag(drag, end)
        if (next.kind === "line" ? Math.hypot(next.end.x - next.start.x, next.end.y - next.start.y) >= 2 : next.radiusPx >= 1) {
          onMarkerChange(next)
        }
      }
    }
    dragRef.current = null
    setDraftMarker(null)
    setHoveredMarkerPart(markerPartFromPointer(event))
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function handlePointerCancel(event: PointerEvent<HTMLDivElement>) {
    dragRef.current = null
    setDraftMarker(null)
    setHoveredMarkerPart(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function resetView() {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  async function toggleFullscreen() {
    const section = sectionRef.current
    if (!section) return
    if (document.fullscreenElement === section) await document.exitFullscreen()
    else await section.requestFullscreen()
  }

  return (
    <section aria-label={t("region")} className="order-2 flex min-h-[32rem] min-w-0 flex-col overflow-hidden rounded-[var(--radius-token-md)] border border-border bg-[var(--case-viewer-shell)] text-white lg:col-start-2 lg:row-start-1 lg:min-h-0 lg:order-none fullscreen:rounded-none fullscreen:border-0" ref={sectionRef}>
      <div className="flex min-h-14 items-center justify-center border-b border-white/10 px-4 py-2">
        <div aria-label={t("tools")} className="flex max-w-full items-center gap-1 overflow-x-auto" role="toolbar">
          {!readOnly ? <ViewerButton active={activeTool === "mark"} label={t("mark")} onClick={() => onToolChange("mark")}><Crosshair aria-hidden="true" /></ViewerButton> : null}
          <ViewerButton active={activeTool === "pan"} label={t("pan")} onClick={() => onToolChange("pan")}><Hand aria-hidden="true" /></ViewerButton>
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-white/15" />
          <ViewerButton label={t("zoomOut")} onClick={() => setZoom((value) => Math.max(0.5, Number((value - 0.25).toFixed(2))))}><ZoomOut aria-hidden="true" /></ViewerButton>
          <span className="min-w-9 text-center font-data text-[10px] tabular-nums text-white/70">{Math.round(zoom * 100)}%</span>
          <ViewerButton label={t("zoomIn")} onClick={() => setZoom((value) => Math.min(4, Number((value + 0.25).toFixed(2))))}><ZoomIn aria-hidden="true" /></ViewerButton>
          <ViewerButton label={t("fit")} onClick={resetView}><RotateCcw aria-hidden="true" /></ViewerButton>
          <ViewerButton label={t(isFullscreen ? "exitFullscreen" : "fullscreen")} onClick={() => void toggleFullscreen()}>{isFullscreen ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}</ViewerButton>
        </div>
      </div>
      <div
        className={`relative min-h-[26rem] flex-1 overflow-hidden bg-[var(--case-viewer-canvas)] touch-none lg:min-h-0 ${activeTool === "pan" ? "cursor-grab active:cursor-grabbing" : hoveredMarkerPart && hoveredMarkerPart !== "body" ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"}`}
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerLeave={() => { if (!dragRef.current) setHoveredMarkerPart(null) }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        ref={viewportRef}
      >
        {displayWidth > 0 ? (
          <div
            className="absolute top-1/2 left-1/2 select-none"
            ref={imageRef}
            style={{ width: displayWidth, height: displayHeight, transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          >
            <img alt={t("imageAlt", { name })} className="size-full object-fill select-none" draggable={false} onError={onImageError} referrerPolicy="no-referrer" src={rendering.url} style={{ filter: `brightness(${brightness}%) contrast(${contrast}%)${inverted ? " invert(1)" : ""}` }} />
            <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible" viewBox={`0 0 ${rendering.widthPx} ${rendering.heightPx}`}>
              <MarkerShape handleRadius={fitScale * zoom > 0 ? 4 / (fitScale * zoom) : 4} marker={readOnly ? null : draftMarker ?? marker} />
            </svg>
          </div>
        ) : null}
        <div className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-black/65 px-3 py-1.5 font-data text-[10px] text-white/75">{t(activeTool === "pan" ? "panHint" : marker?.kind === "line" && markerKind === "line" ? "lineEditHint" : marker?.kind === "circle" && markerKind === "circle" ? "circleEditHint" : "markHint")}</div>
      </div>
    </section>
  )
}

function MarkerShape({ handleRadius, marker }: { handleRadius: number; marker: CalibrationMarker | null }) {
  if (!marker) return null
  return marker.kind === "line" ? (
    <g fill="none" stroke="var(--case-editor-radio-active)" strokeWidth="2" vectorEffect="non-scaling-stroke">
      <line x1={marker.start.x} x2={marker.end.x} y1={marker.start.y} y2={marker.end.y} />
      <circle cx={marker.start.x} cy={marker.start.y} fill="var(--case-editor-radio-active)" r={handleRadius} />
      <circle cx={marker.end.x} cy={marker.end.y} fill="var(--case-editor-radio-active)" r={handleRadius} />
    </g>
  ) : <circle cx={marker.center.x} cy={marker.center.y} fill="none" r={marker.radiusPx} stroke="var(--case-editor-radio-active)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
}

function ViewerButton({ active, children, label, onClick }: { active?: boolean; children: React.ReactNode; label: string; onClick: () => void }) {
  return <button aria-label={label} aria-pressed={active} className={`flex size-8 items-center justify-center rounded-[var(--radius-token-md)] text-white outline-none transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70 [&_svg]:size-4 ${active ? "bg-white/20" : ""}`} onClick={onClick} title={label} type="button">{children}</button>
}

export { CaseImageViewer }
export type { ViewerTool }
