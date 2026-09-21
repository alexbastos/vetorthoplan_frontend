"use client"

import { ArrowUpRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useTranslations } from "next-intl"

import { useAppTheme } from "@/components/shared/app-shell"

import type { HomeShortcut } from "../types"

type HomeShortcutCardProps = {
  shortcut: HomeShortcut
}

function HomeShortcutCard({ shortcut }: HomeShortcutCardProps) {
  const t = useTranslations("home.shortcuts")
  const { resolvedTheme } = useAppTheme()
  const imageSrc = resolvedTheme === "dark" ? shortcut.imageDark ?? shortcut.image : shortcut.image

  return (
    <Link
      data-home-shortcut-card
      className="group flex overflow-hidden rounded-2xl border border-capta-border-default bg-capta-surface-card shadow-[0_1px_2px_rgb(0_0_0_/_0.04)] outline-none transition-[transform,box-shadow,border-color] duration-[250ms] hover:-translate-y-0.5 hover:border-capta-text-disabled hover:shadow-[var(--shadow-card)] focus-visible:ring-2 focus-visible:ring-capta-border-focus focus-visible:ring-offset-2"
      href={shortcut.href}
    >
      <article className="flex w-full flex-col">
        <div className="relative h-[180px] overflow-hidden bg-capta-surface-card p-4 sm:h-[210px] sm:p-5">
          <Image alt={t(shortcut.imageAltKey)} className="object-contain transition-transform duration-[250ms] group-hover:-translate-y-1.5 group-hover:scale-[1.04]" fill sizes="(max-width: 768px) 100vw, 33vw" src={imageSrc} />
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-capta-border-default bg-capta-surface-workspace px-5 py-[18px] sm:px-6 sm:py-5">
          <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-capta-text-primary sm:text-[18px]">{t(shortcut.titleKey)}</h3>
          <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full border border-capta-border-default text-capta-text-secondary transition-[background-color,color] duration-[250ms] group-hover:bg-capta-text-primary group-hover:text-capta-text-inverse">
            <ArrowUpRight className="size-4 transition-transform duration-[250ms] group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </div>
      </article>
    </Link>
  )
}

export { HomeShortcutCard }
