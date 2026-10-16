import { MessageSquare, Search, UserPlus } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"

function HomeHeroBanner() {
  const t = useTranslations("home.hero")
  return (
    <section data-home-hero aria-labelledby="home-hero-title" className="relative mb-12 flex min-h-[340px] overflow-hidden rounded-[18px] shadow-[var(--shadow-stage)] md:min-h-[400px] md:rounded-[21px]">
      <Image
        alt={t("imageAlt")}
        className="object-cover object-[center_40%] will-change-transform"
        data-home-hero-image
        fill
        priority
        sizes="(max-width: 768px) 100vw, calc(100vw - var(--layout-sidebar-width-expanded) - 4rem)"
        src="/images/home/img_background_home.avif"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.85)_0%,rgba(0,36,92,0.25)_40%,rgba(8,123,193,0.12)_55%,transparent_70%)]" />

      <div className="relative z-10 flex w-full flex-col justify-between p-6 text-capta-text-inverse sm:p-10 md:p-12">
        <p data-home-hero-badge className="flex items-center gap-2 text-[13px] font-medium sm:text-[15px]">
          {t("badge")}
          <UserPlus aria-hidden="true" className="size-4" />
        </p>

        <div className="max-w-[680px]">
          <h2 id="home-hero-title" className="text-[28px] leading-[1.04] font-semibold tracking-[-0.03em] sm:text-[42px] lg:text-[50px]">
            <span data-home-hero-title-line className="block bg-[linear-gradient(180deg,#FFFFFF_30%,rgba(255,255,255,0.8)_100%)] bg-clip-text text-transparent [filter:drop-shadow(0_2px_5px_rgba(0,0,0,0.4))]">
              {t("titleLine1")}
            </span>
            <span data-home-hero-title-line className="block bg-[linear-gradient(180deg,#FFFFFF_30%,rgba(255,255,255,0.8)_100%)] bg-clip-text text-transparent [filter:drop-shadow(0_2px_5px_rgba(0,0,0,0.4))]">
              {t("titleLine2")}
            </span>
          </h2>
          <div data-home-hero-actions className="mt-5 flex flex-wrap gap-3 sm:mt-7">
            <Button asChild className="h-auto rounded-full border-0 !bg-[var(--color-neutral-0)] px-5 py-3 text-[14px] !text-[var(--color-neutral-900)] transition-[transform,box-shadow,background-color] hover:-translate-y-px hover:!bg-[var(--color-neutral-100)] hover:shadow-[var(--shadow-card)] active:translate-y-0 sm:text-[15px]" variant="secondary">
              <Link href="/app/editais">
                <Search aria-hidden="true" className="size-4" />
                {t("explore")}
              </Link>
            </Button>
            <Button asChild className="h-auto rounded-full !border-white/25 !bg-white/10 px-5 py-3 text-[14px] !text-white backdrop-blur-md transition-[background-color,border-color] hover:!border-white/45 hover:!bg-white/20 sm:text-[15px]" variant="ghost">
              <Link href="/app/troni">
                <MessageSquare aria-hidden="true" className="size-4" />
                {t("talkToTroni")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

export { HomeHeroBanner }
