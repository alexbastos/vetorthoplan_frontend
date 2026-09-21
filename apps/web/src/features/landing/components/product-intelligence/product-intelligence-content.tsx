import { ArrowRight, Building2, FileSearch, ScanSearch } from "lucide-react"
import Link from "next/link"

import type { ProductCapability, ProductCapabilityIcon } from "./types"

const capabilityIcons = {
  adherence: ScanSearch,
  profile: Building2,
  requirements: FileSearch,
} satisfies Record<ProductCapabilityIcon, typeof Building2>

type ProductIntelligenceContentProps = {
  action: string
  capabilities: ProductCapability[]
  description: string
  eyebrow: string
  title: string
}

function ProductIntelligenceContent({
  action,
  capabilities,
  description,
  eyebrow,
  title,
}: ProductIntelligenceContentProps) {
  return (
    <div className="max-w-[27rem] self-center py-20 lg:py-28">
      <p className="text-overline text-capta-text-secondary">{eyebrow}</p>
      <h2 id="product-intelligence-title" className="mt-5 font-heading text-heading-3 font-medium tracking-[-0.02em] text-capta-text-primary lg:whitespace-nowrap">
        {title}
      </h2>
      <p className="mt-4 max-w-[27rem] text-body text-capta-text-secondary">{description}</p>

      <Link
        href="/register"
        className="group mt-7 inline-flex items-center gap-2 rounded-sm text-ui font-semibold text-capta-brand-primary outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-color)] focus-visible:ring-offset-4"
      >
        {action}
        <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
      </Link>

      <ul className="mt-10 border-t border-capta-border-default" role="list">
        {capabilities.map((capability) => {
          const Icon = capabilityIcons[capability.icon]

          return (
            <li className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-4 border-b border-capta-border-default py-5" key={capability.icon}>
              <Icon aria-hidden="true" className="mt-0.5 size-5 text-capta-text-secondary" strokeWidth={1.7} />
              <div>
                <h3 className="text-ui font-semibold text-capta-text-primary">{capability.title}</h3>
                <p className="mt-1 text-ui text-capta-text-secondary">{capability.description}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export { ProductIntelligenceContent }
export type { ProductIntelligenceContentProps }
