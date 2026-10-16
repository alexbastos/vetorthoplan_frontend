import {
  BookOpen,
  Building2,
  Cpu,
  HeartPulse,
  Leaf,
  Zap,
} from "lucide-react"

import type { NoticeCategory } from "../types"

const categoryIcons = {
  education: BookOpen,
  energy: Zap,
  health: HeartPulse,
  infrastructure: Building2,
  sustainability: Leaf,
  technology: Cpu,
} satisfies Record<NoticeCategory, typeof Cpu>

type PipelineCategoryIconProps = {
  category: NoticeCategory
  className?: string
}

function PipelineCategoryIcon({ category, className }: PipelineCategoryIconProps) {
  const Icon = categoryIcons[category]

  return <Icon aria-hidden="true" className={className} strokeWidth={1.8} />
}

export { PipelineCategoryIcon }
export type { PipelineCategoryIconProps }
