"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Circle,
  Crosshair,
  Hand,
  RotateCcw,
  RotateCw,
  Ruler,
  Save,
  Scaling,
  Trash2,
  Undo2,
} from "lucide-react"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { clinicalBffClient } from "../services/clinical-bff-client"
import type {
  ClinicalImage,
  PlanDocument,
  PlanObject,
  PlanPoint,
  PlanTplo,
} from "../types"

type Tool = "ANGLE" | "CALIBRATION" | "CIRCLE" | "LINE" | "PAN" | "TPLO"
type Transform = { scale: number; x: number; y: number }

const EMPTY_PLAN: PlanDocument = { schema_version: 1, calibration: null, objects: [] }

function PlanningViewer({ image }: { image: ClinicalImage }) {
  const queryClient = useQueryClient()
  const planQuery = useQuery({
    queryKey: ["image-plan", image.id],
    queryFn: async () => {
      const result = await clinicalBffClient.getPlan(image.id)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
  })
  const [document, setDocument] = useState<PlanDocument>(EMPTY_PLAN)
  const [revision, setRevision] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [tool, setTool] = useState<Tool>("PAN")
  const [pendingPoints, setPendingPoints] = useState<PlanPoint[]>([])
  const [calibrationLength, setCalibrationLength] = useState("25")
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null)
  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 })
  const [undoStack, setUndoStack] = useState<PlanDocument[]>([])
  const [redoStack, setRedoStack] = useState<PlanDocument[]>([])
  const viewportRef = useRef<HTMLDivElement>(null)
  const panRef = useRef<{ pointerId: number; x: number; y: number } | null>(null)
  const width = image.preview_width_px ?? image.width_px ?? 1
  const height = image.preview_height_px ?? image.height_px ?? 1

  useEffect(() => {
    if (!planQuery.data) return
    setDocument(planQuery.data.document)
    setRevision(planQuery.data.revision)
    setDirty(false)
    setUndoStack([])
    setRedoStack([])
  }, [planQuery.data])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const fit = () => {
      const scale = Math.min((viewport.clientWidth - 48) / width, (viewport.clientHeight - 48) / height)
      const safeScale = Math.max(0.05, scale)
      setTransform({
        scale: safeScale,
        x: (viewport.clientWidth - width * safeScale) / 2,
        y: (viewport.clientHeight - height * safeScale) / 2,
      })
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [height, width])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const result = await clinicalBffClient.savePlan(image.id, revision, document)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    onSuccess(saved) {
      setRevision(saved.revision)
      setDocument(saved.document)
      setDirty(false)
      queryClient.setQueryData(["image-plan", image.id], saved)
    },
  })

  const selectedTplo = document.objects.find(
    (object): object is PlanTplo => object.id === selectedObjectId && object.type === "TPLO",
  )
  const calibrationScale = useMemo(
    () => getMillimetersPerPixel(document, width, height),
    [document, height, width],
  )

  function commit(next: PlanDocument) {
    setUndoStack((stack) => [...stack.slice(-49), document])
    setRedoStack([])
    setDocument(next)
    setDirty(true)
  }

  function undo() {
    const previous = undoStack.at(-1)
    if (!previous) return
    setUndoStack((stack) => stack.slice(0, -1))
    setRedoStack((stack) => [document, ...stack].slice(0, 50))
    setDocument(previous)
    setDirty(true)
  }

  function redo() {
    const next = redoStack[0]
    if (!next) return
    setRedoStack((stack) => stack.slice(1))
    setUndoStack((stack) => [...stack, document].slice(-50))
    setDocument(next)
    setDirty(true)
  }

  function selectTool(nextTool: Tool) {
    setTool(nextTool)
    setPendingPoints([])
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (tool !== "PAN" && event.button === 0) return
    panRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const pan = panRef.current
    if (!pan || pan.pointerId !== event.pointerId) return
    setTransform((current) => ({
      ...current,
      x: current.x + event.clientX - pan.x,
      y: current.y + event.clientY - pan.y,
    }))
    panRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (panRef.current?.pointerId === event.pointerId) panRef.current = null
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const cursorX = event.clientX - rect.left
    const cursorY = event.clientY - rect.top
    setTransform((current) => {
      const nextScale = Math.min(8, Math.max(0.05, current.scale * Math.exp(-event.deltaY * 0.001)))
      const ratio = nextScale / current.scale
      return {
        scale: nextScale,
        x: cursorX - (cursorX - current.x) * ratio,
        y: cursorY - (cursorY - current.y) * ratio,
      }
    })
  }

  function handleCanvasClick(event: ReactPointerEvent<SVGSVGElement>) {
    if (tool === "PAN" || panRef.current) return
    const point = eventToPoint(event, transform, width, height, viewportRef.current)
    if (!point) return
    const points = [...pendingPoints, point]
    const expectedPoints = tool === "ANGLE" ? 3 : 2
    if (points.length < expectedPoints) {
      setPendingPoints(points)
      return
    }
    setPendingPoints([])
    if (tool === "CALIBRATION") {
      const knownLength = Number(calibrationLength)
      if (!Number.isFinite(knownLength) || knownLength <= 0) return
      commit({
        ...document,
        calibration: {
          kind: "REFERENCE_LINE",
          start: points[0],
          end: points[1],
          known_length_mm: knownLength,
        },
      })
      return
    }
    const id = crypto.randomUUID()
    const object = createPlanObject(id, tool, points)
    commit({ ...document, objects: [...document.objects, object] })
    setSelectedObjectId(id)
  }

  function updateTploRotation(rotation: number) {
    if (!selectedTplo) return
    commit({
      ...document,
      objects: document.objects.map((object) =>
        object.id === selectedTplo.id ? { ...selectedTplo, rotation_degrees: rotation } : object,
      ),
    })
  }

  function removeSelected() {
    if (!selectedObjectId) return
    commit({ ...document, objects: document.objects.filter((object) => object.id !== selectedObjectId) })
    setSelectedObjectId(null)
  }

  if (planQuery.isLoading) {
    return <div className="flex h-full items-center justify-center text-sm text-white/70">Carregando plano…</div>
  }
  if (planQuery.isError) {
    return <div className="flex h-full items-center justify-center text-sm text-red-200">Não foi possível carregar o plano.</div>
  }

  return (
    <div className="grid h-full min-h-[680px] grid-cols-[auto_minmax(0,1fr)_18rem] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
      <aside className="flex w-16 flex-col items-center gap-2 border-r border-slate-800 bg-slate-900 px-2 py-3" aria-label="Ferramentas">
        <ToolButton active={tool === "PAN"} icon={<Hand />} label="Mover" onClick={() => selectTool("PAN")} />
        <ToolButton active={tool === "CALIBRATION"} icon={<Scaling />} label="Calibrar" onClick={() => selectTool("CALIBRATION")} />
        <ToolButton active={tool === "LINE"} icon={<Ruler />} label="Linha" onClick={() => selectTool("LINE")} />
        <ToolButton active={tool === "ANGLE"} icon={<Crosshair />} label="Ângulo" onClick={() => selectTool("ANGLE")} />
        <ToolButton active={tool === "CIRCLE"} icon={<Circle />} label="Círculo" onClick={() => selectTool("CIRCLE")} />
        <ToolButton active={tool === "TPLO"} icon={<RotateCw />} label="TPLO" onClick={() => selectTool("TPLO")} />
        <div className="my-1 h-px w-8 bg-slate-700" />
        <ToolButton disabled={undoStack.length === 0} icon={<Undo2 />} label="Desfazer" onClick={undo} />
        <ToolButton disabled={redoStack.length === 0} icon={<RotateCcw />} label="Refazer" onClick={redo} />
        <ToolButton disabled={!selectedObjectId} icon={<Trash2 />} label="Excluir" onClick={removeSelected} />
      </aside>

      <section className="relative min-w-0">
        <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs text-white/80 backdrop-blur">
          <span>{Math.round(transform.scale * 100)}%</span>
          <span className="text-white/30">•</span>
          <span>{toolInstruction(tool, pendingPoints.length)}</span>
        </div>
        <div
          ref={viewportRef}
          className={cn("h-full min-h-[680px] overflow-hidden bg-black", tool === "PAN" ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair")}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
        >
          <div
            className="absolute left-0 top-0 select-none"
            style={{
              width,
              height,
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: "0 0",
            }}
          >
            {/* A prévia passa pelo BFF e permanece na mesma origem. */}
            <img
              alt={`Radiografia ${image.original_filename}`}
              className="pointer-events-none absolute inset-0 size-full object-fill"
              draggable={false}
              src={`/api/clinical/images/${encodeURIComponent(image.id)}/preview`}
            />
            <svg
              aria-label="Camada geométrica do planejamento"
              className="absolute inset-0 size-full"
              onPointerUp={handleCanvasClick}
              viewBox={`0 0 ${width} ${height}`}
            >
              <PlanOverlay
                calibrationScale={calibrationScale}
                document={document}
                height={height}
                onSelect={setSelectedObjectId}
                pendingPoints={pendingPoints}
                selectedObjectId={selectedObjectId}
                tool={tool}
                width={width}
              />
            </svg>
          </div>
        </div>
      </section>

      <aside className="overflow-y-auto border-l border-slate-800 bg-slate-900 p-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Plano geométrico</p>
            <p className="mt-1 text-sm text-slate-200">Revisão {revision}</p>
          </div>
          <Button
            aria-label="Salvar plano"
            disabled={!dirty}
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            size="sm"
          >
            <Save /> Salvar
          </Button>
        </div>

        {saveMutation.isError ? (
          <p className="mt-3 rounded-lg bg-red-950/70 p-3 text-xs text-red-200">
            Não foi possível salvar. Atualize o plano se outra sessão o alterou.
          </p>
        ) : null}

        <div className="mt-6 space-y-2">
          <label className="text-xs font-medium text-slate-300" htmlFor="calibration-length">Referência de calibração (mm)</label>
          <input
            id="calibration-length"
            className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-blue-400"
            min="0.1"
            onChange={(event) => setCalibrationLength(event.target.value)}
            step="0.1"
            type="number"
            value={calibrationLength}
          />
          <p className="text-xs leading-5 text-slate-400">
            Selecione “Calibrar” e marque as duas extremidades do objeto conhecido.
          </p>
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs">
            {document.calibration && calibrationScale ? (
              <span className="text-emerald-300">Calibrado: {calibrationScale.toFixed(4)} mm/px</span>
            ) : (
              <span className="text-amber-300">Ainda não calibrado; medidas lineares ficam em pixels.</span>
            )}
          </div>
        </div>

        {selectedTplo ? (
          <div className="mt-6 rounded-xl border border-blue-500/30 bg-blue-950/30 p-3">
            <label className="text-xs font-semibold text-blue-100" htmlFor="tplo-rotation">
              Rotação TPLO: {selectedTplo.rotation_degrees.toFixed(1)}°
            </label>
            <input
              id="tplo-rotation"
              className="mt-3 w-full accent-blue-400"
              max="90"
              min="-90"
              onChange={(event) => updateTploRotation(Number(event.target.value))}
              step="0.5"
              type="range"
              value={selectedTplo.rotation_degrees}
            />
          </div>
        ) : null}

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Objetos ({document.objects.length})</p>
          <div className="mt-3 space-y-2">
            {document.objects.length === 0 ? (
              <p className="text-xs leading-5 text-slate-500">Use a barra lateral para criar medições e a simulação TPLO.</p>
            ) : document.objects.map((object, index) => (
              <button
                key={object.id}
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-left text-xs transition",
                  selectedObjectId === object.id
                    ? "border-blue-400 bg-blue-950/50 text-blue-100"
                    : "border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-600",
                )}
                onClick={() => setSelectedObjectId(object.id)}
                type="button"
              >
                <span className="font-semibold">{objectLabel(object.type)} {index + 1}</span>
                <span className="mt-1 block text-slate-400">{measurementLabel(object, width, height, calibrationScale)}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}

function ToolButton({ active, disabled, icon, label, onClick }: { active?: boolean; disabled?: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      aria-label={label}
      className={cn(
        "flex size-10 items-center justify-center rounded-lg text-slate-300 outline-none transition [&_svg]:size-4",
        active ? "bg-blue-600 text-white" : "hover:bg-slate-800 hover:text-white",
        disabled && "cursor-not-allowed opacity-30",
      )}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}
    </button>
  )
}

function PlanOverlay({ calibrationScale, document, height, onSelect, pendingPoints, selectedObjectId, tool, width }: {
  calibrationScale: number | null
  document: PlanDocument
  height: number
  onSelect: (id: string) => void
  pendingPoints: PlanPoint[]
  selectedObjectId: string | null
  tool: Tool
  width: number
}) {
  const point = (value: PlanPoint) => ({ x: value.x * width, y: value.y * height })
  const calibration = document.calibration
  return (
    <>
      {calibration ? <MeasurementLine end={point(calibration.end)} label={`${calibration.known_length_mm} mm`} start={point(calibration.start)} stroke="#fbbf24" /> : null}
      {document.objects.map((object) => {
        const selected = object.id === selectedObjectId
        const stroke = selected ? "#60a5fa" : "#22d3ee"
        if (object.type === "LINE") {
          return <g key={object.id} onPointerDown={() => onSelect(object.id)}><MeasurementLine end={point(object.end)} label={measurementLabel(object, width, height, calibrationScale)} start={point(object.start)} stroke={stroke} /></g>
        }
        if (object.type === "ANGLE") {
          return <g key={object.id} onPointerDown={() => onSelect(object.id)}><MeasurementLine end={point(object.vertex)} start={point(object.start)} stroke={stroke} /><MeasurementLine end={point(object.end)} label={measurementLabel(object, width, height, calibrationScale)} start={point(object.vertex)} stroke={stroke} /></g>
        }
        const center = point(object.center)
        const edge = point(object.edge)
        const radius = Math.hypot(edge.x - center.x, edge.y - center.y)
        const angle = object.type === "TPLO" ? object.rotation_degrees * Math.PI / 180 : 0
        const rotatedEdge = { x: center.x + Math.cos(angle) * (edge.x - center.x) - Math.sin(angle) * (edge.y - center.y), y: center.y + Math.sin(angle) * (edge.x - center.x) + Math.cos(angle) * (edge.y - center.y) }
        return (
          <g key={object.id} onPointerDown={() => onSelect(object.id)}>
            <circle cx={center.x} cy={center.y} fill="none" r={radius} stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" />
            <MeasurementLine end={object.type === "TPLO" ? rotatedEdge : edge} label={measurementLabel(object, width, height, calibrationScale)} start={center} stroke={stroke} />
          </g>
        )
      })}
      {pendingPoints.map((value, index) => {
        const p = point(value)
        return <circle key={`${p.x}-${p.y}-${index}`} cx={p.x} cy={p.y} fill="#fb7185" r="5" vectorEffect="non-scaling-stroke" />
      })}
      {pendingPoints.length > 0 ? <text fill="#fda4af" fontSize="14" x={point(pendingPoints[0]).x + 10} y={point(pendingPoints[0]).y - 10}>{toolInstruction(tool, pendingPoints.length)}</text> : null}
    </>
  )
}

function MeasurementLine({ end, label, start, stroke }: { end: { x: number; y: number }; label?: string; start: { x: number; y: number }; stroke: string }) {
  return (
    <>
      <line x1={start.x} x2={end.x} y1={start.y} y2={end.y} stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <circle cx={start.x} cy={start.y} fill={stroke} r="3.5" />
      <circle cx={end.x} cy={end.y} fill={stroke} r="3.5" />
      {label ? <text fill="white" fontSize="14" paintOrder="stroke" stroke="rgba(0,0,0,.85)" strokeWidth="4" x={(start.x + end.x) / 2 + 8} y={(start.y + end.y) / 2 - 8}>{label}</text> : null}
    </>
  )
}

function eventToPoint(event: ReactPointerEvent<SVGSVGElement>, transform: Transform, width: number, height: number, viewport: HTMLDivElement | null): PlanPoint | null {
  if (!viewport) return null
  const rect = viewport.getBoundingClientRect()
  const x = (event.clientX - rect.left - transform.x) / transform.scale / width
  const y = (event.clientY - rect.top - transform.y) / transform.scale / height
  if (x < 0 || x > 1 || y < 0 || y > 1) return null
  return { x, y }
}

function createPlanObject(id: string, tool: Exclude<Tool, "CALIBRATION" | "PAN">, points: PlanPoint[]): PlanObject {
  if (tool === "ANGLE") return { id, type: "ANGLE", start: points[0], vertex: points[1], end: points[2] }
  if (tool === "LINE") return { id, type: "LINE", start: points[0], end: points[1] }
  if (tool === "CIRCLE") return { id, type: "CIRCLE", center: points[0], edge: points[1] }
  return { id, type: "TPLO", center: points[0], edge: points[1], rotation_degrees: 0 }
}

function getMillimetersPerPixel(document: PlanDocument, width: number, height: number): number | null {
  if (!document.calibration) return null
  const pixels = pointDistance(document.calibration.start, document.calibration.end, width, height)
  return pixels > 0 ? document.calibration.known_length_mm / pixels : null
}

function pointDistance(a: PlanPoint, b: PlanPoint, width: number, height: number): number {
  return Math.hypot((b.x - a.x) * width, (b.y - a.y) * height)
}

function measurementLabel(object: PlanObject, width: number, height: number, millimetersPerPixel: number | null): string {
  if (object.type === "ANGLE") {
    const first = Math.atan2((object.start.y - object.vertex.y) * height, (object.start.x - object.vertex.x) * width)
    const second = Math.atan2((object.end.y - object.vertex.y) * height, (object.end.x - object.vertex.x) * width)
    const degrees = Math.abs((second - first) * 180 / Math.PI)
    return `${(degrees > 180 ? 360 - degrees : degrees).toFixed(1)}°`
  }
  if (object.type === "TPLO") return `Rotação ${object.rotation_degrees.toFixed(1)}°`
  const a = object.type === "LINE" ? object.start : object.center
  const b = object.type === "LINE" ? object.end : object.edge
  const pixels = pointDistance(a, b, width, height) * (object.type === "CIRCLE" ? 2 : 1)
  return millimetersPerPixel ? `${(pixels * millimetersPerPixel).toFixed(1)} mm` : `${pixels.toFixed(0)} px`
}

function objectLabel(type: PlanObject["type"]): string {
  return ({ ANGLE: "Ângulo", CIRCLE: "Círculo", LINE: "Linha", TPLO: "TPLO" })[type]
}

function toolInstruction(tool: Tool, points: number): string {
  if (tool === "PAN") return "Arraste para mover · scroll para zoom"
  if (tool === "ANGLE") return points === 0 ? "Marque o primeiro eixo" : points === 1 ? "Marque o vértice" : "Marque o segundo eixo"
  if (tool === "CALIBRATION") return points === 0 ? "Marque o início da referência" : "Marque o fim da referência"
  return points === 0 ? "Marque o primeiro ponto" : "Marque o segundo ponto"
}

export { PlanningViewer }
