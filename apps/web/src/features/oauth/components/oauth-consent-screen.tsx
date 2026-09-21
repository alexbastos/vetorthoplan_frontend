import Link from "next/link"
import { useTranslations } from "next-intl"
import {
  AppWindow,
  Check,
  CircleAlert,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { CaptaBrandLogo } from "@/components/ui/capta-brand-logo"
import { Card } from "@/components/ui/card"

import { OAuthConsentActions } from "./oauth-consent-actions"

type OAuthConsentScreenProps = {
  account: {
    email: string
    name: string
  }
  clientId: string
  scopes: readonly string[]
  transactionId: string
}

type OAuthConsentErrorReason = "expired" | "invalid" | "unavailable"

const KNOWN_SCOPE_KEYS = {
  email: "email",
  offline_access: "offlineAccess",
  openid: "openid",
  profile: "profile",
} as const

function OAuthConsentScreen({
  account,
  clientId,
  scopes,
  transactionId,
}: OAuthConsentScreenProps) {
  const t = useTranslations("oauth.consent")

  return (
    <OAuthPageShell>
      <Card className="gap-0 overflow-hidden p-0" role="region" aria-labelledby="oauth-consent-title">
        <header className="space-y-3 px-5 pt-6 pb-5 sm:px-8 sm:pt-8 sm:pb-6">
          <div className="flex size-11 items-center justify-center rounded-[var(--radius-token-md)] bg-muted text-foreground">
            <LockKeyhole aria-hidden="true" className="size-5" />
          </div>
          <div className="space-y-2">
            <p className="text-overline text-content-secondary">{t("eyebrow")}</p>
            <h1 className="text-heading-3 text-foreground" id="oauth-consent-title">
              {t("title")}
            </h1>
            <p className="text-body text-content-secondary" id="oauth-consent-summary">
              {t("description")}
            </p>
          </div>
        </header>

        <div className="border-y border-border bg-muted px-5 py-4 sm:px-8">
          <dl className="grid gap-4 sm:grid-cols-2">
            <IdentityItem
              icon={<AppWindow aria-hidden="true" className="size-5" />}
              label={t("applicationLabel")}
              value={clientId}
              secondaryValue={t("applicationIdentifierHelp")}
              valueClassName="break-all font-mono text-caption"
            />
            <IdentityItem
              icon={<UserRound aria-hidden="true" className="size-5" />}
              label={t("accountLabel")}
              value={account.name}
              secondaryValue={account.email}
            />
          </dl>
        </div>

        <section aria-labelledby="oauth-permissions-title" className="space-y-4 px-5 py-6 sm:px-8">
          <div className="space-y-1">
            <h2 className="text-ui-semibold text-foreground" id="oauth-permissions-title">
              {t("permissionsTitle")}
            </h2>
            <p className="text-ui text-content-secondary">
              {t("permissionsDescription")}
            </p>
          </div>

          {scopes.length > 0 ? (
            <ul className="divide-y divide-border" role="list">
              {scopes.map((scope) => (
                <ScopeItem key={scope} scope={scope} />
              ))}
            </ul>
          ) : (
            <p className="rounded-[var(--radius-token-md)] bg-muted px-4 py-3 text-ui text-content-secondary">
              {t("noAdditionalPermissions")}
            </p>
          )}

          <div className="flex gap-3 rounded-[var(--radius-token-md)] border border-border bg-muted px-4 py-3">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-foreground" />
            <p className="text-caption text-content-secondary">{t("privacyNotice")}</p>
          </div>
        </section>

        <footer className="border-t border-border bg-raised px-5 py-5 sm:px-8">
          <OAuthConsentActions transactionId={transactionId} />
        </footer>
      </Card>
    </OAuthPageShell>
  )
}

function IdentityItem({
  icon,
  label,
  secondaryValue,
  value,
  valueClassName = "",
}: {
  icon: React.ReactNode
  label: string
  secondaryValue?: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex min-w-0 gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-content-secondary">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-caption text-muted-foreground">{label}</dt>
        <dd className={`text-ui-semibold text-foreground ${valueClassName}`}>{value}</dd>
        {secondaryValue ? (
          <dd className="break-all text-caption text-content-secondary">{secondaryValue}</dd>
        ) : null}
      </div>
    </div>
  )
}

function ScopeItem({ scope }: { scope: string }) {
  const t = useTranslations("oauth.consent")
  const knownScope = KNOWN_SCOPE_KEYS[scope as keyof typeof KNOWN_SCOPE_KEYS]
  const label = knownScope ? t(`scopes.${knownScope}.label`) : scope
  const description = knownScope
    ? t(`scopes.${knownScope}.description`)
    : t("scopes.other.description", { scope })

  return (
    <li className="flex gap-3 py-4 first:pt-1 last:pb-1">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
        <Check aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0">
        <h3 className="break-words text-ui-semibold text-foreground">{label}</h3>
        <p className="mt-0.5 text-caption text-content-secondary">{description}</p>
      </div>
    </li>
  )
}

function OAuthConsentError({ reason }: { reason: OAuthConsentErrorReason }) {
  const t = useTranslations("oauth.consent.errors")

  return (
    <OAuthPageShell>
      <Card className="items-center gap-5 px-5 py-8 text-center sm:px-8" role="alert">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-foreground">
          <CircleAlert aria-hidden="true" className="size-6" />
        </span>
        <div className="space-y-2">
          <h1 className="text-heading-4 text-foreground">{t(`${reason}.title`)}</h1>
          <p className="text-ui text-content-secondary">{t(`${reason}.description`)}</p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/">{t("backHome")}</Link>
        </Button>
      </Card>
    </OAuthPageShell>
  )
}

function OAuthPageShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("oauth.consent")

  return (
    <div className="min-h-dvh bg-background px-4 py-6 sm:px-6 sm:py-10">
      <main className="mx-auto flex w-full max-w-xl flex-col items-center gap-6">
        <CaptaBrandLogo alt={t("brandAlt")} className="h-auto w-[154px]" height={36} width={154} />
        {children}
      </main>
    </div>
  )
}

export { OAuthConsentError, OAuthConsentScreen }
export type { OAuthConsentErrorReason, OAuthConsentScreenProps }
