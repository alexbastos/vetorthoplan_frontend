"use client"

import { Search, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useId, useRef, useState } from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

function CasesSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const t = useTranslations("cases.list.search")
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const expanded = open || value.length > 0
  const actionLabel = expanded ? t(value ? "clear" : "close") : t("open")

  useEffect(() => {
    if (open) inputRef.current?.focus({ preventScroll: true })
  }, [open])

  function close() {
    onChange("")
    setOpen(false)
    triggerRef.current?.focus({ preventScroll: true })
  }

  return (
    <>
      <div
        aria-hidden={!expanded}
        aria-label={t("label")}
        className={cn(
          "col-span-2 col-start-1 row-start-2 grid min-w-0 transition-[grid-template-rows,opacity,margin,width] duration-200 ease-out motion-reduce:transition-none xl:col-span-1 xl:col-start-2 xl:row-start-1 xl:mb-0 xl:self-start",
          expanded ? "mb-3 grid-rows-[1fr] opacity-100 xl:w-64" : "grid-rows-[0fr] opacity-0 xl:w-0",
        )}
        id={`${id}-region`}
        role="search"
      >
        <div className="min-h-0 overflow-hidden">
          <label className="sr-only" htmlFor={id}>{t("label")}</label>
          <Input
            aria-describedby={`${id}-description`}
            autoComplete="off"
            className="text-base placeholder:text-base sm:text-[13px] sm:leading-[1.4] sm:placeholder:text-[13px] [&::-webkit-search-cancel-button]:appearance-none"
            disabled={!expanded}
            id={id}
            maxLength={200}
            onChange={(event) => onChange(event.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !value.trim()) {
                event.preventDefault()
                close()
              }
            }}
            placeholder={t("placeholder")}
            ref={inputRef}
            title={t("description")}
            type="search"
            value={value}
            wrapperClassName="h-8 rounded-[var(--radius-token-md)] px-3 py-0"
          />
          <span className="sr-only" id={`${id}-description`}>{t("description")}</span>
        </div>
      </div>
      <button
        aria-controls={`${id}-region`}
        aria-expanded={expanded}
        aria-label={actionLabel}
        className={cn(
          "motion-interactive col-start-2 row-start-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-token-md)] text-content-secondary outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card xl:col-start-3",
          expanded && "bg-muted text-foreground",
        )}
        onClick={() => expanded ? close() : setOpen(true)}
        ref={triggerRef}
        title={actionLabel}
        type="button"
      >
        {expanded ? <X aria-hidden="true" className="size-4" strokeWidth={1.5} /> : <Search aria-hidden="true" className="size-4" strokeWidth={1.5} />}
      </button>
    </>
  )
}

export { CasesSearch }
