"use client"

import { CircleHelp, LoaderCircle, LogOut, Settings, Settings2, ShieldCheck, UserRound } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SlideMenu, type SlideMenuItem } from "@/components/ui/slide-menu"
import { useLogout } from "@/features/auth/hooks/use-logout"

import { useAppUser } from "./app-user-context"
import { HeaderProfileIndicator } from "./header-app"
import { useUnsavedChangesGuard } from "./unsaved-changes-guard"

type ProfileMenuLabels = { account: string; help: string; preferences: string; profile: string; security: string; settings: string; signOut: string; signingOut: string }

function getProfileMenuItems({ isLoggingOut, labels, onLogout, onUnavailable }: { isLoggingOut: boolean; labels: ProfileMenuLabels; onLogout: () => void; onUnavailable: () => void }): SlideMenuItem[] {
  return [
    {
      children: [
        { icon: <UserRound aria-hidden="true" className="size-4" />, id: "profile-details", label: labels.profile, onSelect: onUnavailable },
        { icon: <ShieldCheck aria-hidden="true" className="size-4" />, id: "profile-security", label: labels.security, onSelect: onUnavailable },
      ],
      icon: <UserRound aria-hidden="true" className="size-4" />,
      id: "account",
      label: labels.account,
    },
    {
      children: [
        { icon: <Settings2 aria-hidden="true" className="size-4" />, id: "preferences", label: labels.preferences, onSelect: onUnavailable },
      ],
      icon: <Settings2 aria-hidden="true" className="size-4" />,
      id: "settings",
      label: labels.settings,
    },
    { icon: <CircleHelp aria-hidden="true" className="size-4" />, id: "help", label: labels.help, onSelect: onUnavailable },
    {
      disabled: isLoggingOut,
      icon: isLoggingOut ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <LogOut aria-hidden="true" className="size-4" />,
      id: "logout",
      label: isLoggingOut ? labels.signingOut : labels.signOut,
      onSelect: onLogout,
      separatorBefore: true,
      variant: "destructive",
    },
  ]
}

function AppProfileMenu({ initials }: { initials: string }) {
  const t = useTranslations("common")
  const { name } = useAppUser()
  const { isLoggingOut, logout } = useLogout()
  const { requestNavigation } = useUnsavedChangesGuard()
  const [isOpen, setIsOpen] = useState(false)
  const [path, setPath] = useState<string[]>([])

  function handleOpenChange(nextOpen: boolean) {
    setIsOpen(nextOpen)
    if (!nextOpen) {
      setPath([])
    }
  }

  async function handleLogout() {
    const succeeded = await logout()

    if (!succeeded) {
      toast.error(t("accountMenu.logoutErrorTitle"), { description: t("accountMenu.logoutErrorDescription") })
    }
  }

  const profileMenuItems = getProfileMenuItems({
    isLoggingOut,
    labels: { account: t("accountMenu.myAccount"), help: t("accountMenu.help"), preferences: t("accountMenu.preferences"), profile: t("accountMenu.myProfile"), security: t("accountMenu.security"), settings: t("accountMenu.settings"), signOut: t("actions.signOut"), signingOut: t("actions.signingOut") },
    onLogout: () => requestNavigation(() => void handleLogout()),
    onUnavailable: () => toast.info(t("status.comingSoon"), { description: t("status.comingSoonDescription") }),
  })

  return (
    <DropdownMenu onOpenChange={handleOpenChange} open={isOpen}>
      <DropdownMenuTrigger asChild>
        <HeaderProfileIndicator initials={initials} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        aria-label={t("accountMenu.label")}
        className="w-[19.5rem] min-w-[19.5rem] overflow-hidden rounded-[1.125rem] border border-capta-border-default bg-capta-surface-card p-0 shadow-[0_1.25rem_2.5rem_rgb(23_23_23_/_12%)]"
        sideOffset={10}
      >
        {path.length === 0 ? (
          <ProfileMenuHeader initials={initials} name={name} onSettingsClick={() => setPath(["settings"])} />
        ) : null}
        <SlideMenu hideScrollbar items={profileMenuItems} onPathChange={setPath} path={path} rootLabel={t("accountMenu.label")} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type ProfileMenuHeaderProps = {
  initials: string
  name: string
  onSettingsClick: () => void
}

function ProfileMenuHeader({ initials, name, onSettingsClick }: ProfileMenuHeaderProps) {
  const t = useTranslations("common.accountMenu")
  return (
    <header className="flex items-center gap-4 border-b border-capta-border-default px-5 py-4">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-capta-brand-secondary text-ui font-bold text-capta-text-inverse">
        {initials.slice(0, 2).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-ui-semibold text-capta-text-primary">{name}</p>
        <p className="mt-1 text-ui text-capta-text-secondary">{t("manage")}</p>
      </div>
      <button
        aria-label={t("openSettings")}
        className="motion-interactive flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-capta-text-secondary outline-none hover:bg-capta-surface-subtle hover:text-capta-text-primary focus-visible:ring-2 focus-visible:ring-capta-border-focus"
        onClick={onSettingsClick}
        type="button"
      >
        <Settings aria-hidden="true" className="size-[1.125rem]" />
      </button>
    </header>
  )
}

export { AppProfileMenu }
