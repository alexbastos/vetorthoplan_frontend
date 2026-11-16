import { useFormatter, useTranslations } from "next-intl"
import type { RefObject } from "react"

import { AppUserAvatar } from "@/components/shared/app-shell/app-user-avatar"

import { demoProfiles, type DemoMember } from "../lib/demo-conversations"
import styles from "./community-conversation.module.css"
import { CloseIcon, ExperienceIcon, LocationIcon, MemberIcon, TimeIcon } from "./community-profile-icons"

type CommunityProfileProps = {
  conversation: DemoMember
  id: string
  closeButton: RefObject<HTMLButtonElement | null>
  onClose: () => void
}

function CommunityProfile({ conversation, id, closeButton, onClose }: CommunityProfileProps) {
  const t = useTranslations("community")
  const actions = useTranslations("common.actions")
  const format = useFormatter()
  const specialty = t(`specialties.${conversation.id}`)
  const profile = demoProfiles[conversation.id]
  const details = [
    { icon: LocationIcon, text: profile.city },
    { icon: TimeIcon, text: "America/Sao_Paulo" },
    { icon: ExperienceIcon, text: t("profile.experience", { years: profile.experience }) },
    {
      icon: MemberIcon,
      text: t("profile.memberSince", {
        date: format.dateTime(new Date(profile.joinedAt), { month: "long", year: "numeric", timeZone: "UTC" }),
      }),
    },
    { icon: TimeIcon, text: t("profile.profession") },
  ]
  const sectionClass = "border-b border-[color:var(--community-divider)] px-5 py-4"
  const sectionTitleClass = "mb-2.5 text-[11px] font-semibold text-foreground"
  const tagClass = "rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"

  return (
    <aside aria-labelledby={`${id}-title`} className={styles.profile} id={id}>
      <header className="flex shrink-0 items-center justify-between border-b border-[color:var(--community-divider)] px-4 py-3">
        <h2 className="text-[12px] font-semibold text-foreground" id={`${id}-title`}>{t("profile.title")}</h2>
        <button aria-label={actions("close")} className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring" onClick={onClose} ref={closeButton} type="button">
          <CloseIcon />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex flex-col items-center gap-2 border-b border-[color:var(--community-divider)] px-5 pt-6 pb-4 text-center">
          <AppUserAvatar avatarUrl={null} className="size-16 rounded-full text-lg" initials={conversation.initials} />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-foreground">{conversation.name}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{specialty}</p>
          </div>
        </div>
        <ul className={`${sectionClass} flex flex-col gap-2.5 text-[12px] text-muted-foreground`}>
          {details.map(({ icon: Icon, text }) => (
            <li className="flex items-center gap-2" key={text}>
              <span className="shrink-0 text-description"><Icon /></span>
              <span className="min-w-0 break-words">{text}</span>
            </li>
          ))}
        </ul>
        <div className={sectionClass}>
          <h3 className={sectionTitleClass}>{t("profile.about")}</h3>
          <p className="text-[12px] leading-relaxed text-muted-foreground">{t(`profile.bio.${conversation.id}`)}</p>
        </div>
        <div className={sectionClass}>
          <h3 className={sectionTitleClass}>{t("profile.areas")}</h3>
          <ul className="flex flex-wrap gap-1.5">
            <li className={tagClass}>{specialty}</li>
            <li className={tagClass}>{t(`profile.focus.${conversation.id}`)}</li>
          </ul>
        </div>
        <div className="px-5 py-4">
          <h3 className={sectionTitleClass}>{t("profile.languages")}</h3>
          <ul className="flex flex-wrap gap-1.5">
            {profile.languages.map((language) => <li className={tagClass} key={language}>{t(`profile.language.${language}`)}</li>)}
          </ul>
        </div>
      </div>
    </aside>
  )
}

export { CommunityProfile }
