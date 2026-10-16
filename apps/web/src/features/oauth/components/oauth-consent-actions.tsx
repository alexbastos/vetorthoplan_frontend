"use client"

import { useRef, useState, type FormEvent } from "react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"

type ConsentDecision = "allow" | "deny"

type OAuthConsentActionsProps = {
  transactionId: string
}

const CONSENT_DECISION_PATH = "/api/oauth/consent"

function OAuthConsentActions({ transactionId }: OAuthConsentActionsProps) {
  const t = useTranslations("oauth.consent")
  const submissionStarted = useRef(false)
  const [pendingDecision, setPendingDecision] = useState<ConsentDecision | null>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>, decision: ConsentDecision) => {
    if (submissionStarted.current) {
      event.preventDefault()
      return
    }

    submissionStarted.current = true
    setPendingDecision(decision)
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <form
          action={CONSENT_DECISION_PATH}
          method="post"
          onSubmit={(event) => handleSubmit(event, "deny")}
        >
          <input name="decision" type="hidden" value="deny" />
          <input name="transaction" type="hidden" value={transactionId} />
          <Button
            className="w-full"
            disabled={pendingDecision !== null}
            loading={pendingDecision === "deny"}
            type="submit"
            variant="secondary"
          >
            {pendingDecision === "deny" ? t("cancelling") : t("cancel")}
          </Button>
        </form>

        <form
          action={CONSENT_DECISION_PATH}
          method="post"
          onSubmit={(event) => handleSubmit(event, "allow")}
        >
          <input name="decision" type="hidden" value="allow" />
          <input name="transaction" type="hidden" value={transactionId} />
          <Button
            className="w-full"
            disabled={pendingDecision !== null}
            loading={pendingDecision === "allow"}
            type="submit"
          >
            {pendingDecision === "allow" ? t("allowing") : t("allow")}
          </Button>
        </form>
      </div>

      <p aria-live="polite" className="sr-only" role="status">
        {pendingDecision === "allow"
          ? t("allowingStatus")
          : pendingDecision === "deny"
            ? t("cancellingStatus")
            : ""}
      </p>
    </div>
  )
}

export { OAuthConsentActions }
