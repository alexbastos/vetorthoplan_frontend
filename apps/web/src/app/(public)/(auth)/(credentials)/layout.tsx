import type { ReactNode } from "react"

import { redirectAuthenticatedUser } from "@/lib/server/redirect-authenticated-user"

type CredentialsLayoutProps = {
  children: ReactNode
}

export default async function CredentialsLayout({ children }: CredentialsLayoutProps) {
  await redirectAuthenticatedUser()

  return children
}
