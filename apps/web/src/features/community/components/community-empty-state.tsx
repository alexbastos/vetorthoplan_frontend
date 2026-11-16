import Image from "next/image"
import { useTranslations } from "next-intl"
import type { ReactNode } from "react"

import { EmptyState } from "@/components/ui/empty-state"

function CommunityEmptyState({ variant, action }: { variant: "inbox" | "conversation"; action?: ReactNode }) {
  const t = useTranslations("community.empty")

  return (
    <div className="flex grow shrink-0 items-center justify-center py-8">
      <EmptyState
        action={action}
        className="max-w-sm"
        description={t(`${variant}.description`)}
        descriptionClassName="text-[13px] leading-[1.4] text-description"
        illustration={
          <>
            <Image
              alt=""
              aria-hidden="true"
              className="h-auto w-[10.5rem] dark:hidden"
              height={114}
              src="/images/community/empty-conversations.svg"
              width={142}
            />
            <Image
              alt=""
              aria-hidden="true"
              className="hidden h-auto w-[10.5rem] dark:block"
              height={114}
              src="/images/community/empty-conversations-dark.svg"
              width={142}
            />
          </>
        }
        title={t(`${variant}.title`)}
        titleClassName="font-bold text-[var(--color-obsidian)] dark:text-foreground"
      />
    </div>
  )
}

export { CommunityEmptyState }
