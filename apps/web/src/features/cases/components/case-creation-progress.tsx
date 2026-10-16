import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

type CaseCreationStep = "case-details" | "file-import"

type CaseCreationProgressProps = {
  caseCompletion: number
  currentStep: CaseCreationStep
  fileCompletion: number
}

const STEPS: readonly CaseCreationStep[] = ["case-details", "file-import"]

function CaseCreationProgress({ caseCompletion, currentStep, fileCompletion }: CaseCreationProgressProps) {
  const t = useTranslations("cases.newCase.progress")
  const currentStepIndex = STEPS.indexOf(currentStep)

  return (
    <nav
      aria-label={t("label")}
      className="mx-auto w-full max-w-[42.5rem] px-2"
    >
      <ol className="grid grid-cols-2 gap-4 sm:gap-6">
        {STEPS.map((step, index) => {
          const isComplete = index < currentStepIndex
          const isCurrent = step === currentStep
          const measuredProgress = step === "case-details" ? caseCompletion : fileCompletion
          const progress = isComplete ? 100 : Math.max(0, Math.min(measuredProgress, 100))
          const label = t(step)

          return (
            <li aria-current={isCurrent ? "step" : undefined} key={step}>
              <div className="flex min-w-0 flex-col items-center text-center">
                <span className={cn(
                  "max-w-full truncate text-[12px] leading-[1.4] font-normal text-[var(--case-progress-label)] transition-colors",
                  (isCurrent || isComplete) && "text-[var(--case-progress-label-active)]",
                )}>
                  {label}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-1.5 size-1.5 rounded-full bg-[var(--case-progress-track)] transition-colors",
                    (isCurrent || isComplete) && "bg-[var(--case-progress-fill)]",
                  )}
                />
              </div>
              <span
                aria-label={t("progressValue", { progress, step: label })}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={progress}
                className="relative mt-2 block h-1.5 overflow-hidden rounded-full bg-[var(--case-progress-track)]"
                role="progressbar"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 rounded-full bg-[var(--case-progress-fill)] transition-[width] duration-300 ease-out motion-reduce:transition-none"
                  style={{ width: `${progress}%` }}
                />
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export { CaseCreationProgress }
export type { CaseCreationStep }
