"use client"

import Image from "next/image"
import { useTranslations } from "next-intl"

import { useAppTheme, useAppUser } from "@/components/shared/app-shell"

function HomeGreeting() {
  const t = useTranslations("home")
  const { initials, name } = useAppUser()
  const { resolvedTheme } = useAppTheme()
  const firstName = name.trim().split(/\s+/).filter(Boolean)[0] ?? ""

  return (
    <header data-home-greeting className="mb-6 flex items-center gap-3 sm:mb-8 sm:gap-3.5">
      <span data-home-greeting-avatar aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-capta-brand-secondary text-[16px] font-bold text-capta-text-inverse sm:size-11 sm:text-[18px]">
        {initials}
      </span>
      <div className="min-w-0">
        <p data-home-greeting-salutation className="text-[13px] font-medium text-capta-text-secondary sm:text-[13.5px]">{t("greeting", { firstName })}</p>
        <h1 data-home-greeting-title className="flex flex-wrap items-center gap-x-1 text-[22px] leading-tight font-medium tracking-[-0.03em] text-capta-text-primary sm:text-[27px]">
          <span>{t("welcome")}</span>
          <Image alt="CAPTAGOV" className="-ml-1 h-auto w-[92px] sm:w-[112px]" height={28} src={resolvedTheme === "dark" ? "/brand/logo_white.svg" : "/brand/logo_black.svg"} width={112} />
        </h1>
      </div>
    </header>
  )
}

export { HomeGreeting }
