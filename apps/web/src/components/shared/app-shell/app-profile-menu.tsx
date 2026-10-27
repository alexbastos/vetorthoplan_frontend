"use client"

import { ArrowLeft, ChevronRight, LoaderCircle, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"
import { toast } from "@/lib/notifications"

import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { LocaleFlagIcon } from "@/components/ui/locale-flag-icon"
import { useLogout } from "@/features/auth/hooks/use-logout"
import { useProfileLocale } from "@/features/settings/hooks/use-profile-locale"
import { appLocales } from "@/i18n/config"

import { useAppUser } from "./app-user-context"
import { AppUserAvatar } from "./app-user-avatar"
import { HeaderProfileIndicator } from "./header-app"
import { AccountMenuIcon, HelpMenuIcon, LanguageMenuIcon, SignOutMenuIcon, ThemeMenuIcon } from "./app-profile-menu-icons"
import { useAppTheme } from "./app-theme-provider"
import { useUnsavedChangesGuard } from "./unsaved-changes-guard"

const menuItemClassName = "h-10 cursor-pointer gap-3 rounded-[0.625rem] px-3 py-1 text-[0.875rem] leading-5 font-medium tracking-[-0.01em] text-black focus:bg-black/[0.04] dark:text-white dark:focus:bg-white/[0.06]"
const menuIconClassName = "size-[1.125rem] shrink-0 text-muted-foreground"

function AppProfileMenu() {
  const t = useTranslations("common")
  const router = useRouter()
  const { avatarUrl, initials, name } = useAppUser()
  const { isLoggingOut, logout } = useLogout()
  const { resolvedTheme, setPreference } = useAppTheme()
  const { isSavingLocale, locale, selectLocale } = useProfileLocale()
  const { requestNavigation } = useUnsavedChangesGuard()
  const [isOpen, setIsOpen] = useState(false)
  const [menuView, setMenuView] = useState<"account" | "language">("account")
  const previousMenuView = useRef(menuView)
  const languageTriggerRef = useRef<HTMLDivElement>(null)
  const selectedLocaleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    if (menuView === "language") selectedLocaleRef.current?.focus()
    else if (previousMenuView.current === "language") languageTriggerRef.current?.focus()

    previousMenuView.current = menuView
  }, [isOpen, menuView])

  function handleOpenChange(open: boolean) {
    setIsOpen(open)
    if (!open) {
      setMenuView("account")
      previousMenuView.current = "account"
    }
  }

  function navigateToSettings() {
    setIsOpen(false)
    requestNavigation(() => router.push("/app/settings"))
  }

  function showUnavailableMessage() {
    toast.info(t("status.comingSoon"), { description: t("status.comingSoonDescription") })
  }

  function changeLocale(value: string) {
    requestNavigation(() => selectLocale(value))
  }

  async function handleLogout() {
    const succeeded = await logout()

    if (!succeeded) {
      toast.error(t("accountMenu.logoutErrorTitle"), { description: t("accountMenu.logoutErrorDescription") })
    }
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange} open={isOpen}>
      <DropdownMenuTrigger asChild>
        <HeaderProfileIndicator avatarUrl={avatarUrl} initials={initials} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        aria-label={t("accountMenu.label")}
        className="w-[16.5rem] min-w-[16.5rem] overflow-hidden rounded-[var(--radius-token-xl)] border border-border bg-card p-1.5 shadow-[var(--shadow-floating)]"
        onKeyDown={(event) => {
          if (menuView === "language" && event.key === "ArrowLeft") {
            event.preventDefault()
            setMenuView("account")
          }
        }}
        sideOffset={10}
      >
        <ProfileMenuHeader avatarUrl={avatarUrl} initials={initials} name={name} onSettingsClick={navigateToSettings} />
        <DropdownMenuGroup
          className={`animate-in fade-in duration-150 motion-reduce:animate-none ${menuView === "language" ? "slide-in-from-right-2" : "slide-in-from-left-2"}`}
          key={menuView}
        >
          {menuView === "account" ? (
            <>
              <DropdownMenuItem className={menuItemClassName} onSelect={showUnavailableMessage}>
                <AccountMenuIcon aria-hidden="true" className={menuIconClassName} />
                <span>{t("accountMenu.myAccount")}</span>
              </DropdownMenuItem>
              <DropdownMenuCheckboxItem
                aria-label={t("accountMenu.darkTheme")}
                checked={resolvedTheme === "dark"}
                className={`${menuItemClassName} pr-3 [&_[data-slot=dropdown-menu-checkbox-item-indicator]]:hidden`}
                onCheckedChange={(checked) => setPreference(checked ? "dark" : "light")}
                onSelect={(event) => event.preventDefault()}
              >
                <ThemeMenuIcon aria-hidden="true" className={menuIconClassName} />
                <span>{t("accountMenu.theme")}</span>
                <span aria-hidden="true" className={`ml-auto flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors motion-reduce:transition-none ${resolvedTheme === "dark" ? "bg-foreground" : "bg-muted"}`}>
                  <span className={`size-4 rounded-full bg-card shadow-sm transition-transform motion-reduce:transition-none ${resolvedTheme === "dark" ? "translate-x-4" : "translate-x-0"}`} />
                </span>
              </DropdownMenuCheckboxItem>
              <DropdownMenuItem
                className={`${menuItemClassName} pr-3`}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight") {
                    event.preventDefault()
                    setMenuView("language")
                  }
                }}
                onSelect={(event) => {
                  event.preventDefault()
                  setMenuView("language")
                }}
                ref={languageTriggerRef}
              >
                <LanguageMenuIcon aria-hidden="true" className={menuIconClassName} />
                <span>{t("accountMenu.language")}</span>
                <span className="ml-auto text-xs font-normal text-content-secondary">{locale.toUpperCase()}</span>
                <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
              </DropdownMenuItem>
              <DropdownMenuItem className={menuItemClassName} onSelect={showUnavailableMessage}>
                <HelpMenuIcon aria-hidden="true" className={menuIconClassName} />
                <span>{t("accountMenu.help")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className={`${menuItemClassName} mt-1.5`}
                disabled={isLoggingOut}
                onSelect={() => requestNavigation(() => void handleLogout())}
              >
                {isLoggingOut ? (
                  <LoaderCircle aria-hidden="true" className={`${menuIconClassName} animate-spin`} strokeWidth={1.5} />
                ) : (
                  <SignOutMenuIcon aria-hidden="true" className={menuIconClassName} />
                )}
                <span>{isLoggingOut ? t("actions.signingOut") : t("actions.signOut")}</span>
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem
                aria-label={t("accountMenu.backToAccountMenu")}
                className={`${menuItemClassName} mb-1`}
                onSelect={(event) => {
                  event.preventDefault()
                  setMenuView("account")
                }}
              >
                <ArrowLeft aria-hidden="true" className={menuIconClassName} strokeWidth={1.75} />
                <span>{t("accountMenu.language")}</span>
              </DropdownMenuItem>
              <DropdownMenuRadioGroup aria-label={t("accountMenu.language")} className="space-y-0.5" onValueChange={changeLocale} value={locale}>
                {appLocales.map((option) => (
                  <DropdownMenuRadioItem className={`${menuItemClassName} pr-10 data-[state=checked]:bg-black/[0.04] dark:data-[state=checked]:bg-white/[0.06] [&_[data-slot=dropdown-menu-radio-item-indicator]]:right-3`} disabled={isSavingLocale} key={option} ref={option === locale ? selectedLocaleRef : undefined} value={option}>
                    <LocaleFlagIcon className="size-[1.125rem]" locale={option} />
                    <span lang={option}>{t(`accountMenu.localeNames.${option}`)}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type ProfileMenuHeaderProps = {
  avatarUrl: string | null
  initials: string
  name: string
  onSettingsClick: () => void
}

function ProfileMenuHeader({ avatarUrl, initials, name, onSettingsClick }: ProfileMenuHeaderProps) {
  const t = useTranslations("common.accountMenu")
  return (
    <header className="flex items-center gap-2.5 px-2.5 pt-2 pb-2.5">
      <AppUserAvatar avatarUrl={avatarUrl} className="size-[2.125rem] text-[0.8125rem] leading-none" initials={initials} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.90625rem] leading-tight font-semibold tracking-[-0.01em] text-black dark:text-white">{name}</p>
        <p className="mt-0.5 truncate text-[0.78125rem] leading-tight text-content-secondary">{t("manage")}</p>
      </div>
      <button
        aria-label={t("openSettings")}
        className="motion-interactive flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[0.625rem] text-content-secondary outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onSettingsClick}
        type="button"
      >
        <Settings aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.5} />
      </button>
    </header>
  )
}

export { AppProfileMenu }
