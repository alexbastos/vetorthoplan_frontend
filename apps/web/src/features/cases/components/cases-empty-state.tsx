"use client"

import Image from "next/image"
import Link from "next/link"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"

import { CasesContentMotion } from "./cases-content-motion"

function CasesEmptyState() {
  const t = useTranslations("cases")

  return (
    <CasesContentMotion className="max-w-sm" variant="empty">
      <EmptyState
        action={
          <Button asChild size="sm">
            <Link href="/app/cases/new">{t("actions.createCase")}</Link>
          </Button>
        }
        className="max-w-sm"
        description={t("empty.description")}
        descriptionClassName="text-[13px] leading-[1.4] text-description"
        illustration={<CasesEmptyStateVisual />}
        title={t("empty.title")}
        titleClassName="font-bold text-[var(--color-obsidian)] dark:text-foreground"
      />
    </CasesContentMotion>
  )
}

function CasesEmptyStateVisual() {
  return (
    <>
      <Image
        alt=""
        aria-hidden="true"
        className="h-auto w-[10.5rem] dark:hidden"
        height={114}
        src="/images/cases/empty-cases.svg"
        width={142}
      />
      <Image
        alt=""
        aria-hidden="true"
        className="hidden h-auto w-[10.5rem] dark:block"
        height={114}
        src="/images/cases/empty-cases-dark.svg"
        width={142}
      />
    </>
  )
}

export { CasesEmptyState }
