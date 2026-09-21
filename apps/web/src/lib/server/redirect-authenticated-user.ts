import "server-only"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { resolveServerSession } from "./session"

async function redirectAuthenticatedUser(): Promise<void> {
  const cookieStore = await cookies()
  const session = await resolveServerSession({ cookieReader: cookieStore })

  if (session.state === "authenticated" || session.state === "refresh-required") {
    redirect("/app")
  }
}

export { redirectAuthenticatedUser }
