"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Check, CircleDot, Save, Undo2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"

import { useImagePreview } from "../hooks/use-image-preview"
import { canPreviewCaseImage } from "../lib/case-image-state"
import { getImagePlan, getTploRotationTable, ImagePlanError, saveImagePlan, type PlanDocument } from "../services/image-plan-api"
import type { CaseImage } from "../types/case-image"

type Point = { x: number; y: number }
type LandmarkName = "plateau_cranial" | "plateau_caudal" | "intercondylar_midpoint" | "talus_center"
type Tool = "calibration" | LandmarkName | "osteotomy" | "fragment"
type Geometry = Record<string, unknown>

const landmarks: readonly { id: LandmarkName; label: string }[] = [
  { id: "plateau_cranial", label: "Borda cranial do platô" },
  { id: "plateau_caudal", label: "Borda caudal do platô" },
  { id: "intercondylar_midpoint", label: "Ponto médio intercondilar" },
  { id: "talus_center", label: "Centro do tálus" },
]

function TploPlanningPanel({ caseId, image, caseTitle, onBack }: { caseId: string; image: CaseImage; caseTitle: string; onBack: () => void }) {
  const queryClient = useQueryClient()
  const preview = useImagePreview(caseId, image.id, canPreviewCaseImage(image))
  const query = useQuery({ queryKey: ["image-plan", caseId, image.id], queryFn: ({ signal }) => getImagePlan(caseId, image.id, signal), enabled: canPreviewCaseImage(image), retry: false })
  const [document, setDocument] = useState<PlanDocument | null>(null)
  const [revision, setRevision] = useState(0)
  const [tool, setTool] = useState<Tool>("calibration")
  const [referenceLength, setReferenceLength] = useState("25")
  const [rotation, setRotation] = useState("0")
  const [bladeDiameter, setBladeDiameter] = useState("24")
  const [tableTpa, setTableTpa] = useState("")
  const [laterality, setLaterality] = useState<"LEFT" | "RIGHT">("RIGHT")
  const [fragmentDraft, setFragmentDraft] = useState<Point[]>([])
  const [calibrationStartDraft, setCalibrationStartDraft] = useState<Point | null>(null)
  const [osteotomyCenterDraft, setOsteotomyCenterDraft] = useState<Point | null>(null)

  useEffect(() => {
    if (!query.data) return
    setDocument(query.data.document)
    setRevision(query.data.revision)
    const meta = query.data.document.tplo as { laterality?: "LEFT" | "RIGHT" } | undefined
    if (meta?.laterality) setLaterality(meta.laterality)
    const savedCalibration = query.data.document.calibration as { known_length_mm?: number } | null | undefined
    if (savedCalibration?.known_length_mm) setReferenceLength(String(savedCalibration.known_length_mm))
    const savedTplo = (query.data.document.objects as Geometry[] | undefined)?.find((item) => item.type === "TPLO")
    if (typeof savedTplo?.rotation_degrees === "number") setRotation(String(savedTplo.rotation_degrees))
    const savedMeasurement = query.data.document.tplo_measurement as { tpa_degrees?: number } | undefined
    if (typeof savedMeasurement?.tpa_degrees === "number") setTableTpa(String(savedMeasurement.tpa_degrees))
  }, [query.data])

  const save = useMutation({
    mutationFn: (nextDocument: PlanDocument) => saveImagePlan(caseId, image.id, revision, nextDocument),
    onSuccess: (saved) => {
      setDocument(saved.document)
      setRevision(saved.revision)
      void queryClient.setQueryData(["image-plan", caseId, image.id], saved)
    },
  })
  const tploMeasurement = document?.tplo_measurement as { status?: string; tpa_degrees?: number; plateau_length_mm?: number; tibial_axis_length_mm?: number; calibration_id?: string } | undefined
  const rotationTable = useMutation({
    mutationFn: () => Number.isFinite(Number(tableTpa)) && tableTpa.trim() !== ""
      ? getTploRotationTable(Number(tableTpa), Number(bladeDiameter))
      : Promise.reject(new ImagePlanError("TPA_REQUIRED", false)),
  })
  const objects = (document?.objects ?? []) as Geometry[]
  const simulation = objects.find((item) => item.type === "TPLO") as Geometry | undefined
  const result = simulation?.simulation as { status?: string; radius_mm?: number; rotation_degrees?: number; affine_matrix?: number[][]; calibration_id?: string } | undefined
  const calibration = document?.calibration as Geometry | null | undefined
  const landmarkPoints = document?.tplo_landmarks as Record<LandmarkName, Point> | undefined
  const visiblePreview = preview.data

  function patchDocument(patch: Record<string, unknown>) {
    setDocument((current) => ({ schema_version: 1, ...(current ?? {}), ...patch }))
  }

  function addPoint(point: Point) {
    if (!document) return
    if (tool === "calibration") {
      if (!calibrationStartDraft) setCalibrationStartDraft(point)
      else {
        patchDocument({ calibration: { kind: "REFERENCE_LINE", start: calibrationStartDraft, end: point, known_length_mm: Number(referenceLength) } })
        setCalibrationStartDraft(null)
      }
      return
    }
    if (landmarks.some((item) => item.id === tool)) {
      patchDocument({ tplo_landmarks: { ...(document.tplo_landmarks as object ?? {}), [tool]: point } })
      return
    }
    if (tool === "osteotomy") {
      if (!osteotomyCenterDraft) { setOsteotomyCenterDraft(point); return }
      const old = (document.objects as Geometry[] ?? []).find((item) => item.type === "TPLO")
      const next = old ? { ...old, center: osteotomyCenterDraft, edge: point, rotation_degrees: Number(rotation) }
        : { id: crypto.randomUUID(), type: "TPLO", center: osteotomyCenterDraft, edge: point, rotation_degrees: Number(rotation), label: "Simulação TPLO" }
      patchDocument({ objects: [...(document.objects as Geometry[] ?? []).filter((item) => item.type !== "TPLO"), next] })
      setOsteotomyCenterDraft(null)
      return
    }
    if (tool === "fragment") setFragmentDraft((current) => [...current, point])
  }

  function commitFragment() {
    if (!document || fragmentDraft.length < 3) return
    const previous = (document.objects as Geometry[] ?? []).find((item) => item.type === "TPLO")
    if (!previous) return
    const next = { ...previous, fragment: { points: fragmentDraft, label: "Fragmento proximal" } }
    patchDocument({ objects: [...(document.objects as Geometry[] ?? []).filter((item) => item.type !== "TPLO"), next] })
    setFragmentDraft([])
  }

  function saveDocument() {
    if (!document) return
    const enteredLandmarks = document.tplo_landmarks as Record<LandmarkName, Point> | null | undefined
    const completeLandmarks = enteredLandmarks && landmarks.every(({ id }) => enteredLandmarks[id]) ? enteredLandmarks : null
    const nextDocument = { ...document, tplo_landmarks: completeLandmarks, tplo: { projection: "MEDIOLATERAL", image_quality: "LIMITED", eligibility: "PENDING", eligibility_reasons: [], ...(document.tplo as object ?? {}), laterality } }
    setDocument(nextDocument)
    void save.mutateAsync(nextDocument).catch(() => undefined)
  }

  function setRotationValue(value: string) {
    setRotation(value)
    const current = (document?.objects as Geometry[] ?? []).find((item) => item.type === "TPLO")
    if (!current) return
    patchDocument({ objects: [...(document?.objects as Geometry[] ?? []).filter((item) => item.type !== "TPLO"), { ...current, rotation_degrees: Number(value) }] })
  }

  function setQualityValue(key: string, value: "PASS" | "FAIL" | "NOT_ASSESSED") {
    patchDocument({ radiographic_quality: { ...((document?.radiographic_quality as object | undefined) ?? {}), [key]: value } })
  }

  const isDirty = Boolean(document && query.data && JSON.stringify(document) !== JSON.stringify(query.data.document))
  useEffect(() => {
    if (!isDirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [isDirty])
  function leaveEditor() {
    if (isDirty && !window.confirm("Há alterações não salvas. Sair e descartá-las?")) return
    onBack()
  }
  const statusMessage = save.error instanceof ImagePlanError
    ? save.error.code === "PLAN_REVISION_CONFLICT" ? "O plano mudou em outra sessão. Recarregue para continuar." : "Não foi possível salvar o plano. Tente novamente."
    : query.isError ? "Não foi possível carregar o plano." : isDirty ? "Alterações ainda não salvas" : `Salvo · revisão ${revision}`

  const simTransform = useMemo(() => {
    const matrix = result?.affine_matrix
    const width = visiblePreview?.widthPx
    const height = visiblePreview?.heightPx
    if (result?.status !== "SIMULATED" || !matrix || !width || !height) return undefined
    const [[a, c, e], [b, d, f]] = matrix
    return `matrix(${a},${b * width / height},${c * height / width},${d},${e / width},${f / height})`
  }, [result, visiblePreview?.heightPx, visiblePreview?.widthPx])

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--case-editor-canvas)] text-foreground lg:h-dvh lg:min-h-0">
      <header className="flex min-h-16 items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <Button onClick={leaveEditor} size="sm" type="button" variant="ghost"><ArrowLeft aria-hidden="true" />Voltar ao caso</Button>
        <h1 className="truncate text-sm font-semibold">TPLO · {caseTitle}</h1>
        <Button disabled={!document || save.isPending || !visiblePreview} onClick={saveDocument} size="sm" type="button"><Save aria-hidden="true" />{save.isPending ? "Salvando…" : "Salvar plano"}</Button>
      </header>
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className="order-2 space-y-4 overflow-y-auto rounded-lg border border-border bg-card p-4 lg:order-1">
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Configuração do exame</h2>
            <label className="block text-xs text-description">Lateralidade
              <select className="mt-1 w-full rounded-md border border-border bg-background p-2 text-foreground" onChange={(event) => setLaterality(event.target.value as "LEFT" | "RIGHT")} value={laterality}><option value="RIGHT">Direita</option><option value="LEFT">Esquerda</option></select>
            </label>
            <p className="pt-1 text-xs font-medium">Qualidade da incidência lateral</p>
            {[
              ["true_lateral", "Incidência lateral verdadeira"],
              ["femoral_condyles_superimposed", "Côndilos sobrepostos"],
              ["stifle_and_tarsus_included", "Joelho e tarso incluídos"],
              ["tibial_axis_centered", "Eixo tibial centrado"],
              ["tibial_plateau_visible", "Platô tibial visível"],
            ].map(([key, label]) => {
              const quality = document?.radiographic_quality as Record<string, "PASS" | "FAIL" | "NOT_ASSESSED"> | undefined
              return <label className="flex items-center justify-between gap-2 text-xs text-description" key={key}>{label}<select className="rounded-md border border-border bg-background p-1.5 text-foreground" onChange={(event) => setQualityValue(key, event.target.value as "PASS" | "FAIL" | "NOT_ASSESSED")} value={quality?.[key] ?? "NOT_ASSESSED"}><option value="NOT_ASSESSED">Não avaliado</option><option value="PASS">Adequado</option><option value="FAIL">Insuficiente</option></select></label>
            })}
          </section>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Calibração manual</h2>
            <label className="block text-xs text-description">Comprimento conhecido (mm)<input className="mt-1 w-full rounded-md border border-border bg-background p-2 text-foreground" min="0.1" onChange={(event) => setReferenceLength(event.target.value)} step="any" type="number" value={referenceLength} /></label>
            <ToolButton active={tool === "calibration"} onClick={() => setTool("calibration")}>Marcar os dois extremos da referência</ToolButton>
            <p className="text-xs text-description">Use uma referência radiopaca conhecida, próxima ao joelho e no mesmo plano.</p>
            {calibration && (calibration as { result?: { mm_per_pixel?: number } }).result ? <p className="font-data text-xs">Escala: {((calibration as { result: { mm_per_pixel: number } }).result.mm_per_pixel).toFixed(4)} mm/px</p> : null}
          </section>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Marcos para TPA</h2>
            <p className="text-xs text-description">Marque cada ponto na imagem. O resultado vem do backend após salvar.</p>
            {landmarks.map((item) => <ToolButton key={item.id} active={tool === item.id} onClick={() => setTool(item.id)}>{item.label}{landmarkPoints?.[item.id] ? <Check aria-label="marcado" className="size-3" /> : null}</ToolButton>)}
            <div aria-live="polite" className="rounded-md bg-muted/50 p-3 text-sm">TPA: {typeof tploMeasurement?.tpa_degrees === "number" ? `${tploMeasurement.tpa_degrees.toFixed(1)}°` : "marque os quatro pontos e salve"}
              {tploMeasurement?.status && tploMeasurement.status !== "CALCULATED" ? <p className="mt-1 text-xs text-description">{tploMeasurement.status === "IMAGE_DIMENSIONS_REQUIRED" ? "Dimensões da imagem indisponíveis." : "Conclua a marcação anatômica."}</p> : null}
              <p className="mt-1 text-[11px] text-description">Cálculo geométrico para revisão profissional; não validado clinicamente.</p>
            </div>
          </section>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Simulação da osteotomia</h2>
            <label className="block text-xs text-description">Diâmetro da lâmina (mm)<input className="mt-1 w-full rounded-md border border-border bg-background p-2 text-foreground" min="8" max="33" onChange={(event) => setBladeDiameter(event.target.value)} step="1" type="number" value={bladeDiameter} /></label>
            <label className="block text-xs text-description">TPA para consulta exata<input className="mt-1 w-full rounded-md border border-border bg-background p-2 text-foreground" max="90" min="0" onChange={(event) => setTableTpa(event.target.value)} step="any" type="number" value={tableTpa} /></label>
            <Button disabled={rotationTable.isPending || !tableTpa.trim() || !Number.isFinite(Number(tableTpa))} onClick={() => rotationTable.mutate()} size="sm" type="button" variant="secondary">{rotationTable.isPending ? "Consultando…" : "Consultar tabela de referência"}</Button>
            {rotationTable.data ? <div className="rounded-md bg-muted/50 p-3 text-xs" aria-live="polite">
              {rotationTable.data.match_count ? <><p>Referência da tabela {rotationTable.data.table_version}: {rotationTable.data.entries.map((entry) => `${entry.rotation_mm} mm`).join(", ")}{rotationTable.data.target_slope_degrees ? ` · slope alvo publicado ${rotationTable.data.target_slope_degrees}°` : ""}</p><p className="mt-1 text-description">Correspondência exata por TPA e lâmina. Confira a fonte e a indicação com o cirurgião; o sistema não interpola nem recomenda rotação.</p></>
                : <p>Nenhuma linha exata encontrada para estes parâmetros.</p>}
              {rotationTable.data.source_url ? <a className="mt-1 inline-block underline" href={rotationTable.data.source_url} rel="noreferrer" target="_blank">Fonte: {rotationTable.data.source}</a> : null}
            </div> : null}
            <ToolButton active={tool === "osteotomy"} onClick={() => { setOsteotomyCenterDraft(null); setTool("osteotomy") }}><CircleDot aria-hidden="true" className="size-4" />Marcar centro e raio</ToolButton>
            <label className="block text-xs text-description">Rotação geométrica (graus)<input className="mt-1 w-full rounded-md border border-border bg-background p-2 text-foreground" max="180" min="-180" onChange={(event) => setRotationValue(event.target.value)} step="0.1" type="number" value={rotation} /></label>
            {simulation ? <ToolButton active={tool === "fragment"} onClick={() => { setTool("fragment"); setFragmentDraft([]) }}>Marcar contorno do fragmento</ToolButton> : null}
            {tool === "fragment" ? <div className="flex gap-2"><Button disabled={fragmentDraft.length < 3} onClick={commitFragment} size="sm" type="button" variant="secondary">Fechar contorno ({fragmentDraft.length})</Button><Button onClick={() => setFragmentDraft([])} size="sm" type="button" variant="ghost"><Undo2 aria-hidden="true" /></Button></div> : null}
            <p className="text-xs text-description">Estado: {result?.status ?? "aguardando centro, raio e contorno"}. A rotação é uma prévia geométrica, não uma recomendação cirúrgica.</p>
            {typeof result?.radius_mm === "number" ? <p className="font-data text-xs">Raio: {result.radius_mm.toFixed(1)} mm · rotação: {result.rotation_degrees?.toFixed(1)}°</p> : null}
          </section>
          <div aria-live="polite" className="border-t border-border pt-3 text-xs text-description">{statusMessage}{save.error instanceof ImagePlanError && save.error.code === "PLAN_REVISION_CONFLICT" ? <Button className="mt-2" onClick={() => { void query.refetch() }} size="sm" type="button" variant="secondary">Recarregar versão salva</Button> : null}</div>
        </aside>
        <section className="order-1 flex min-h-[55vh] flex-col items-center justify-center overflow-auto rounded-lg border border-border bg-[var(--case-viewer-shell)] p-3 text-white lg:order-2" aria-label="Editor da radiografia TPLO">
          {!canPreviewCaseImage(image) ? <p>Esta imagem ainda não está pronta para planejamento.</p>
            : !visiblePreview ? <p>{preview.isError ? "Prévia indisponível. Atualize a página para tentar novamente." : "Carregando radiografia…"}</p>
              : !document ? <p>{query.error instanceof ImagePlanError && query.error.code === "IMAGE_NOT_READY" ? "A imagem precisa estar pronta." : "Carregando plano…"}</p>
                : <div className="relative w-full max-w-[min(100%,1200px)] touch-none" onPointerDown={(event) => {
                  if (event.button !== 0 || !["calibration", ...landmarks.map((item) => item.id), "osteotomy", "fragment"].includes(tool)) return
                  const rect = event.currentTarget.getBoundingClientRect()
                  addPoint({ x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) })
                }} style={{ aspectRatio: `${visiblePreview.widthPx} / ${visiblePreview.heightPx}` }}>
                  <img alt={`Radiografia para planejamento TPLO: ${image.originalFilename}`} className="absolute inset-0 size-full select-none object-fill" draggable={false} src={visiblePreview.url} />
                  <svg aria-label="Marcação anatômica" className="absolute inset-0 size-full" role="img" viewBox="0 0 1 1">
                    {calibration ? <line x1={(calibration as { start: Point }).start.x} y1={(calibration as { start: Point }).start.y} x2={(calibration as { end: Point }).end.x} y2={(calibration as { end: Point }).end.y} stroke="#42d4b3" strokeWidth="0.003" /> : null}
                    {calibrationStartDraft ? <circle cx={calibrationStartDraft.x} cy={calibrationStartDraft.y} r="0.008" fill="#42d4b3" /> : null}
                    {landmarks.map((item) => { const p = landmarkPoints?.[item.id]; return p ? <g key={item.id}><circle cx={p.x} cy={p.y} r="0.009" fill="#ffcf5c" /><text fill="white" fontSize="0.018" x={p.x + 0.012} y={p.y}>{item.label}</text></g> : null })}
                    {fragmentDraft.length > 1 ? <polyline fill="rgba(255,100,80,.12)" points={fragmentDraft.map((p) => `${p.x},${p.y}`).join(" ")} stroke="#ff806b" strokeWidth="0.003" /> : null}
                    {((simulation?.fragment as { points?: Point[] } | undefined)?.points ?? []).length > 2 ? <><polygon fill="none" points={((simulation?.fragment as { points: Point[] }).points).map((p) => `${p.x},${p.y}`).join(" ")} stroke="#ff806b" strokeDasharray="0.008 0.006" strokeWidth="0.002" /><polygon fill="rgba(255,100,80,.16)" points={((simulation?.fragment as { points: Point[] }).points).map((p) => `${p.x},${p.y}`).join(" ")} stroke="#ff806b" strokeWidth="0.003" transform={simTransform} /></> : null}
                    {simulation ? <g><circle cx={(simulation.center as Point).x} cy={(simulation.center as Point).y} r="0.009" fill="#f8fafc" /><ellipse cx={(simulation.center as Point).x} cy={(simulation.center as Point).y} rx={visiblePreview ? Math.hypot((((simulation.edge as Point).x - (simulation.center as Point).x) * visiblePreview.widthPx), (((simulation.edge as Point).y - (simulation.center as Point).y) * visiblePreview.heightPx)) / visiblePreview.widthPx : 0} ry={visiblePreview ? Math.hypot((((simulation.edge as Point).x - (simulation.center as Point).x) * visiblePreview.widthPx), (((simulation.edge as Point).y - (simulation.center as Point).y) * visiblePreview.heightPx)) / visiblePreview.heightPx : 0} fill="none" stroke="#63adff" strokeWidth="0.003" /></g> : null}
                    {osteotomyCenterDraft ? <circle cx={osteotomyCenterDraft.x} cy={osteotomyCenterDraft.y} r="0.009" fill="#63adff" /> : null}
                  </svg>
                </div>}
        </section>
      </main>
    </div>
  )
}

function ToolButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button aria-pressed={active} className={`flex min-h-9 w-full items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-left text-xs ${active ? "border-primary bg-primary/10 text-foreground" : "border-border text-foreground hover:bg-muted/50"}`} onClick={onClick} type="button">{children}</button>
}

export { TploPlanningPanel }
