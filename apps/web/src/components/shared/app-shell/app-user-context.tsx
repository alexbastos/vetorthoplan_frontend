"use client"

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react"

type AppUserIdentity = {
  avatarUrl: string | null
  name: string
}

type AppUser = AppUserIdentity & {
  initials: string
  updateUser: (updates: Partial<AppUserIdentity>) => void
}

const AppUserContext = createContext<AppUser | null>(null)

function AppUserProvider({ avatarUrl, children, name }: AppUserIdentity & { children: ReactNode }) {
  const [user, setUser] = useState<AppUserIdentity>(() => ({ avatarUrl, name }))

  useEffect(() => {
    setUser((currentUser) => currentUser.avatarUrl === avatarUrl && currentUser.name === name
      ? currentUser
      : { avatarUrl, name })
  }, [avatarUrl, name])

  const updateUser = useCallback((updates: Partial<AppUserIdentity>) => {
    setUser((currentUser) => ({ ...currentUser, ...updates }))
  }, [])
  const value = useMemo<AppUser>(() => ({
    ...user,
    initials: getUserInitials(user.name),
    updateUser,
  }), [updateUser, user])

  return <AppUserContext.Provider value={value}>{children}</AppUserContext.Provider>
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
export type { AppUser, AppUserIdentity }
