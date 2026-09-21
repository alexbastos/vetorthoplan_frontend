import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"

import {
  OAuthConsentError,
  OAuthConsentScreen,
} from "@/features/oauth/components/oauth-consent-screen"
import { createAuthenticationApiClient } from "@/lib/server/authentication-api"
import { getOAuthServerEnvironment } from "@/lib/server/environment"
import { createOAuthAuthorizationResumePath } from "@/lib/server/oauth-authorization-flow"
import { getRequestedScopes } from "@/lib/server/oauth-authorization-request"
import {
  isOAuthTransactionBoundToSubject,
  readOAuthTransaction,
} from "@/lib/server/oauth-transaction"
import { resolveServerSession } from "@/lib/server/session"

type OAuthConsentPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("oauth.consent")

  return {
    robots: { follow: false, index: false },
    title: t("metadataTitle"),
  }
}

export default async function OAuthConsentPage({ searchParams }: OAuthConsentPageProps) {
  const transactionId = getTransactionId(await searchParams)

  if (!transactionId) {
    return <OAuthConsentError reason="invalid" />
  }

  const cookieStore = await cookies()
  let environment: ReturnType<typeof getOAuthServerEnvironment>
  let transactionResult: ReturnType<typeof readOAuthTransaction>

  try {
    environment = getOAuthServerEnvironment()
    transactionResult = readOAuthTransaction(cookieStore, {
      expectedTransactionId: transactionId,
      secret: environment.oauthTransactionSecret,
    })
  } catch (error) {
    logConsentPreparationFailure(error)
    return <OAuthConsentError reason="unavailable" />
  }

  if (transactionResult.status !== "valid") {
    return (
      <OAuthConsentError
        reason={transactionResult.status === "expired" ? "expired" : "invalid"}
      />
    )
  }

  if (transactionResult.transaction.phase === "approved") {
    redirect(createOAuthAuthorizationResumePath(transactionResult.transaction.id))
  }

  if (transactionResult.transaction.phase !== "consent") {
    return <OAuthConsentError reason="invalid" />
  }

  let session: Awaited<ReturnType<typeof resolveServerSession>>

  try {
    session = await resolveServerSession({
      client: createAuthenticationApiClient(environment),
      cookieReader: cookieStore,
    })
  } catch (error) {
    logConsentPreparationFailure(error)
    return <OAuthConsentError reason="unavailable" />
  }

  if (session.state === "anonymous" || session.state === "refresh-required") {
    redirect(createOAuthAuthorizationResumePath(transactionResult.transaction.id))
  }

  if (session.state === "unavailable") {
    return <OAuthConsentError reason="unavailable" />
  }

  if (!isOAuthTransactionBoundToSubject(transactionResult.transaction, session.user.id)) {
    redirect(createOAuthAuthorizationResumePath(transactionResult.transaction.id))
  }

  return (
    <OAuthConsentScreen
      account={{ email: session.user.email, name: session.user.name }}
      clientId={transactionResult.transaction.request.client_id}
      scopes={getRequestedScopes(transactionResult.transaction.request)}
      transactionId={transactionResult.transaction.id}
    />
  )
}

function getTransactionId(
  searchParams: Record<string, string | string[] | undefined>
): string | undefined {
  const entries = Object.entries(searchParams).filter(([, value]) => value !== undefined)

  if (
    entries.length !== 1 ||
    entries[0][0] !== "transaction" ||
    typeof entries[0][1] !== "string"
  ) {
    return undefined
  }

  return entries[0][1]
}

function logConsentPreparationFailure(error: unknown): void {
  console.error("OAuth consent page could not be prepared", {
    failureType: error instanceof Error ? error.name : "UnknownError",
  })
}
