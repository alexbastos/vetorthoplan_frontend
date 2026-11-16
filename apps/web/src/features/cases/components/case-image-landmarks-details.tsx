import { ChevronDown } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

function CaseImageLandmarksDetails({ title, children, divider = true }: { title: string; children: ReactNode; divider?: boolean }) {
  return <details className={cn("group/tpa-details min-w-0", divider && "border-t border-white/10")}>
    <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 rounded-[var(--radius-token-sm)] px-3 py-2 text-[11px] text-white/80 outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/70 [&::-webkit-details-marker]:hidden">
      <span className="min-w-0">{title}</span><ChevronDown aria-hidden="true" className="size-3.5 shrink-0 group-open/tpa-details:rotate-180" />
    </summary>
    <div className="min-w-0 px-3 pb-3 text-[11px] text-white/75">{children}</div>
  </details>
}

export { CaseImageLandmarksDetails }
