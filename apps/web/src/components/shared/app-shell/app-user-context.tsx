"use client"

import { createContext, type ReactNode, useContext } from "react"

type AppUser = {
  initials: string
  name: string
}

const AppUserContext = createContext<AppUser | null>(null)

function AppUserProvider({ children, name }: { children: ReactNode; name: string }) {
  return <AppUserContext.Provider value={{ initials: getUserInitials(name), name }}>{children}</AppUserContext.Provider>
}

function useAppUser(): AppUser {
  const user = useContext(AppUserContext)

  if (!user) {
    throw new Error("useAppUser must be used within AppUserProvider")
  }

  return user
}

function getUserInitials(name: string): string {
  const nameParts = name.trim().split(/\s+/).filter(Boolean)

  if (nameParts.length === 0) {
    return "U"
  }

  return nameParts.length === 1 ? nameParts[0].slice(0, 2) : `${nameParts[0][0]}${nameParts.at(-1)?.[0] ?? ""}`
}

export { AppUserProvider, getUserInitials, useAppUser }
export type { AppUser }
