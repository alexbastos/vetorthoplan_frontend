"use client"

import { useState } from "react"
import { Building2, ChevronDown, Database, Link2, ScanSearch, UserCheck, UserPlus, type LucideIcon } from "lucide-react"

import { faqQuestionIds, type FaqContent, type FaqQuestionId } from "./faq-content"

const questionIcons: Record<FaqQuestionId, LucideIcon> = {
  audience: Building2,
  sources: Database,
  matching: ScanSearch,
  traceability: Link2,
  humanReview: UserCheck,
  gettingStarted: UserPlus,
}

type FaqAccordionProps = {
  questions: FaqContent["questions"]
}

function FaqAccordion({ questions }: FaqAccordionProps) {
  const [openQuestionId, setOpenQuestionId] = useState<FaqQuestionId | null>(null)

  return (
    <div>
      {faqQuestionIds.map((id) => {
        const Icon = questionIcons[id]
        const isOpen = openQuestionId === id
        const questionId = `landing-faq-question-${id}`
        const answerId = `landing-faq-answer-${id}`

        return (
          <div className="py-3 sm:py-4" data-landing-faq-question={id} key={id}>
            <div className="flex items-start gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3 py-2.5">
                <Icon aria-hidden="true" className="mt-1 size-4 shrink-0 text-capta-text-secondary" strokeWidth={1.5} />
                <h3 id={questionId} className="min-w-0 text-body leading-6 font-bold text-pretty text-capta-text-primary">
                  {questions[id].question}
                </h3>
              </div>
              <button
                type="button"
                aria-labelledby={questionId}
                aria-expanded={isOpen}
                aria-controls={answerId}
                className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm text-capta-text-secondary outline-none hover:text-capta-text-primary focus-visible:ring-2 focus-visible:ring-capta-border-focus focus-visible:ring-offset-2"
                onClick={() => setOpenQuestionId((current) => current === id ? null : id)}
              >
                <ChevronDown
                  aria-hidden="true"
                  className={`size-4 transition-transform duration-200 motion-reduce:transition-none ${isOpen ? "rotate-180" : "rotate-0"}`}
                />
              </button>
            </div>
            <div id={answerId} role="region" aria-labelledby={questionId} hidden={!isOpen}>
              <p className="mt-2 pr-14 pl-7 text-body leading-relaxed text-pretty text-capta-text-secondary">
                {questions[id].answer}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export { FaqAccordion }
