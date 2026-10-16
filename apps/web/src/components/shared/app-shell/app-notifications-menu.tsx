"use client"

import type { ComponentProps } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

function AppNotificationsMenu() {
  const t = useTranslations("common")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("header.notifications")}
          className="motion-interactive flex size-9 cursor-pointer items-center justify-center rounded-[var(--radius-token-md)] text-sidebar-icon outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-raised data-[state=open]:bg-muted"
          type="button"
        >
          <NotificationIcon aria-hidden="true" className="size-[1.1875rem]" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        aria-label={t("header.notifications")}
        className="w-[22.5rem] max-w-[calc(100vw-1rem)] min-w-0 overflow-x-hidden overflow-y-auto rounded-[var(--radius-token-2xl)] border border-border/70 bg-card p-0 text-card-foreground shadow-md"
        sideOffset={8}
      >
        <div className="flex h-[2.625rem] items-center border-b border-border px-4 text-[0.8125rem] font-medium">
          {t("header.notifications")}
        </div>

        <div className="flex min-h-40 flex-col items-center justify-center gap-2 py-6">
          <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <NotificationIcon className="size-[1.125rem]" />
          </span>
          <p className="text-xs text-muted-foreground">{t("notificationMenu.empty")}</p>
        </div>

        <DropdownMenuItem
          className="flex h-[2.625rem] w-full cursor-pointer justify-center rounded-none border-t border-border text-center text-xs font-medium text-content-secondary hover:bg-muted focus:bg-transparent focus:text-foreground focus-visible:bg-muted"
          onSelect={() => toast.info(t("status.comingSoon"), { description: t("status.comingSoonDescription") })}
        >
          {t("notificationMenu.viewAll")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NotificationIcon(props: ComponentProps<"svg">) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" color="currentColor" {...props}>
      <path d="M15.5 18C15.5 19.933 13.933 21.5 12 21.5C10.067 21.5 8.5 19.933 8.5 18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="M19.2311 18H4.76887C3.79195 18 3 17.208 3 16.2311C3 15.762 3.18636 15.3121 3.51809 14.9803L4.12132 14.3771C4.68393 13.8145 5 13.0514 5 12.2558V9.5C5 5.63401 8.13401 2.5 12 2.5C15.866 2.5 19 5.634 19 9.5V12.2558C19 13.0514 19.3161 13.8145 19.8787 14.3771L20.4819 14.9803C20.8136 15.3121 21 15.762 21 16.2311C21 17.208 20.208 18 19.2311 18Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  )
}

export { AppNotificationsMenu }
