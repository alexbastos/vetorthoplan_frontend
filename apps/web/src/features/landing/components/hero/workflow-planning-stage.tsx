import { Check, CircleDot, Expand, Images, Minus, MousePointer2, Move, Plus, Ruler, ScanLine, ZoomIn } from "lucide-react"
import Image from "next/image"

import { workflowRadiographs, workflowRadiographSequence } from "./workflow-radiographs"
import type { WorkflowWorkspaceProps } from "./workflow-workspace-types"

function WorkflowPlanningStage({ activeStep = 0, copy }: WorkflowWorkspaceProps) {
  return (
    <main className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-tl-[1.25rem] bg-stage shadow-[var(--shadow-stage)]">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 sm:px-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{copy.caseLabel}</p>
          <p className="mt-1 truncate text-[11px] text-content-secondary">{copy.imageLabel}</p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <span className="rounded-full border border-border bg-background px-3 py-1.5 text-[10px] font-medium text-content-secondary">{copy.version}</span>
          <span className="flex size-8 items-center justify-center rounded-full bg-brand-secondary text-white">
            <Check aria-hidden="true" className="size-3.5" />
          </span>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 p-2 sm:p-3 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <RadiographViewer activeStep={activeStep} copy={copy} />
        <PlanningSummary activeStep={activeStep} copy={copy} />
      </div>
    </main>
  )
}

function RadiographViewer({ activeStep = 0, copy }: WorkflowWorkspaceProps) {
  const imageLabels = [copy.imageLabel, copy.imageSecondary, copy.imageTertiary]

  return (
    <section aria-label={copy.imageLabel} className="relative min-h-0 overflow-hidden rounded-xl bg-black">
      <Image
        alt=""
        aria-hidden="true"
        className="object-contain opacity-90"
        fill
        priority
        sizes="(min-width: 1024px) 42rem, 100vw"
        src={workflowRadiographs.lateral.src}
      />
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-1 rounded-xl border border-white/10 bg-[#111820]/85 p-1 text-white/70 shadow-xl backdrop-blur-md">
        {[MousePointer2, Move, Ruler, ScanLine, ZoomIn, Expand].map((Icon, index) => (
          <span className={`flex size-8 items-center justify-center rounded-lg transition-colors duration-300 ${index === Math.min(activeStep + 1, 5) ? "bg-brand-secondary text-white" : ""}`} key={index}>
            <Icon aria-hidden="true" className="size-3.5" />
          </span>
        ))}
      </div>

      <div aria-hidden="true" className={`absolute left-[38%] top-[19%] h-[61%] w-px -rotate-[8deg] bg-[#73c7ff]/75 shadow-[0_0_12px_rgb(115_199_255_/_35%)] transition-opacity duration-500 ${activeStep >= 1 ? "opacity-100" : "opacity-25"}`} />
      <div aria-hidden="true" className={`absolute left-[25%] top-[52%] h-px w-[48%] bg-[#73c7ff]/65 transition-opacity duration-500 ${activeStep >= 1 ? "opacity-100" : "opacity-25"}`} />
      <div aria-hidden="true" className={`absolute left-[37%] top-[49%] size-3 rounded-full border border-[#b8e2ff] bg-[#73c7ff]/25 transition-opacity duration-500 ${activeStep >= 1 ? "opacity-100" : "opacity-25"}`} />
      <div aria-hidden="true" className={`absolute left-[68%] top-[49%] size-3 rounded-full border border-[#b8e2ff] bg-[#73c7ff]/25 transition-opacity duration-500 ${activeStep >= 1 ? "opacity-100" : "opacity-25"}`} />

      <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full border border-white/10 bg-[#111820]/80 px-3 py-2 text-[10px] font-medium text-white/80 backdrop-blur-md">
        <CircleDot aria-hidden="true" className="size-3 text-[#73c7ff]" />
        <span>{copy.measurementAxis}</span>
        <span className="text-white">87,0°</span>
      </div>

      <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-3">
        <div className="flex min-w-0 gap-2 rounded-xl border border-white/10 bg-[#111820]/80 p-2 shadow-xl backdrop-blur-md">
          {imageLabels.map((label, index) => (
            <div className={`flex min-w-0 items-center gap-2 rounded-lg p-1.5 transition-colors duration-300 ${index === Math.min(activeStep, 2) ? "bg-white/12" : ""}`} key={label}>
              <div className="relative h-9 w-11 shrink-0 overflow-hidden rounded-md bg-black">
                <Image
                  alt=""
                  aria-hidden="true"
                  className="object-cover opacity-85"
                  fill
                  sizes="44px"
                  src={workflowRadiographSequence[index]?.src ?? workflowRadiographs.lateral.src}
                  style={{ objectPosition: workflowRadiographSequence[index]?.objectPosition }}
                />
              </div>
              <span className="hidden max-w-24 truncate text-[10px] font-medium text-white/75 xl:block">{label}</span>
            </div>
          ))}
        </div>

        <div className="hidden items-center rounded-full border border-white/10 bg-[#111820]/80 p-1 text-white/75 backdrop-blur-md sm:flex">
          <span className="flex size-7 items-center justify-center"><Minus aria-hidden="true" className="size-3" /></span>
          <span className="px-1 text-[10px] font-medium">100%</span>
          <span className="flex size-7 items-center justify-center"><Plus aria-hidden="true" className="size-3" /></span>
        </div>
      </div>
    </section>
  )
}

function PlanningSummary({ activeStep = 0, copy }: WorkflowWorkspaceProps) {
  return (
    <aside className="hidden min-h-0 flex-col rounded-xl border border-border bg-background p-4 lg:flex">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[9px] font-medium tracking-[0.08em] text-muted-foreground uppercase">{copy.tools}</p>
          <h3 className="mt-1.5 text-sm font-semibold text-foreground">{copy.measurements}</h3>
        </div>
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand-secondary/12 text-brand-secondary">
          <Ruler aria-hidden="true" className="size-4" />
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Metric label={copy.measurementAxis} value="87,0°" />
        <Metric label={copy.measurementAngle} value="24,5" unit="mm" />
      </div>

      <div className="mt-4 rounded-xl bg-stage p-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-foreground">
          <span className="flex size-5 items-center justify-center rounded-full bg-success/15 text-success"><Check aria-hidden="true" className="size-3" /></span>
          {copy.calibration}
        </div>
        <p className="mt-2 text-[10px] leading-4 text-content-secondary">{copy.reference}</p>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="font-mono text-[9px] font-medium tracking-[0.08em] text-muted-foreground uppercase">{copy.caseLabel}</p>
        <ol className="mt-3 space-y-3">
          {[copy.images, copy.measurements, copy.surgical, copy.sharing].map((label, index) => (
            <li className="flex items-center gap-2.5" key={label}>
              <span className={`flex size-6 items-center justify-center rounded-full text-[9px] font-semibold transition-colors duration-300 ${index <= activeStep ? "bg-brand-secondary text-white" : "border border-border text-content-secondary"}`}>
                {index < activeStep ? <Check aria-hidden="true" className="size-3" /> : index + 1}
              </span>
              <span className={`text-[11px] font-medium transition-colors duration-300 ${index === activeStep ? "text-foreground" : "text-content-secondary"}`}>{label}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-auto flex items-center gap-2 rounded-xl border border-border p-3">
        <Images aria-hidden="true" className="size-4 text-brand-secondary" />
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-foreground">{copy.imageLabel}</p>
          <p className="mt-0.5 text-[9px] text-content-secondary">{copy.version}</p>
        </div>
      </div>
    </aside>
  )
}

function Metric({ label, unit, value }: { label: string; unit?: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="truncate text-[9px] text-content-secondary">{label}</p>
      <p className="mt-2 text-base font-semibold tracking-[-0.02em] text-foreground">
        {value} {unit ? <span className="text-[9px] font-medium text-content-secondary">{unit}</span> : null}
      </p>
    </div>
  )
}

export { WorkflowPlanningStage }
