import { ProtectedAreaUnavailable, ProtectedSessionRefreshGate } from "@/components/shared/protected-session-refresh-gate"
import { AppShell } from "@/components/shared/app-shell"
import { resolveServerSession } from "@/lib/server/session"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  robots: { follow: false, index: false },
}

export default async function ProtectedAppLayout({ children }: LayoutProps<"/app">) {
  const cookieStore = await cookies()
  const session = await resolveServerSession({ cookieReader: cookieStore })

  if (session.state === "authenticated") {
    return (
      <AppShell userAvatarUrl={session.user.profile.avatarUrl} userName={session.user.name}>
        {children}
      </AppShell>
    )
  }

  if (session.state === "refresh-required") {
    return <ProtectedSessionRefreshGate />
  }

  if (session.state === "unavailable") {
    return <ProtectedAreaUnavailable />
  }

  redirect("/login?from=%2Fapp")
}
