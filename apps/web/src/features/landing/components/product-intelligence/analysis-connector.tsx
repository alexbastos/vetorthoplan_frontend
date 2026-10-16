import { ChevronDown } from "lucide-react"

function AnalysisConnector() {
  return (
    <div aria-hidden="true" className="relative z-30 ml-[8.125rem] h-10 w-5">
      <div data-analysis-connector className="absolute inset-0 origin-top scale-y-0">
        <span className="absolute top-0 bottom-2 left-1/2 w-px -translate-x-1/2 bg-capta-border-default" />
        <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full border border-capta-border-default bg-capta-surface-workspace" />
        <ChevronDown className="absolute bottom-0 left-1/2 size-3 -translate-x-1/2 text-capta-text-muted" strokeWidth={1.8} />
      </div>
    </div>
  )
}

export { AnalysisConnector }
