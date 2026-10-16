"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

const THEME_PREFERENCE_STORAGE_KEY = "capta_theme_preference"

type AppThemePreference = "dark" | "light" | "system"
type ResolvedAppTheme = Exclude<AppThemePreference, "system">

type AppThemeContextValue = {
  preference: AppThemePreference
  resolvedTheme: ResolvedAppTheme
  setPreference: (preference: AppThemePreference) => void
}

const AppThemeContext = createContext<AppThemeContextValue | null>(null)

function AppThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<AppThemePreference>("system")
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedAppTheme>("light")

  useEffect(() => {
    const storedPreference = window.localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY)

    if (isAppThemePreference(storedPreference)) {
      setPreferenceState(storedPreference)
    }

    function syncStoredPreference(event: StorageEvent) {
      if (event.key === THEME_PREFERENCE_STORAGE_KEY && isAppThemePreference(event.newValue)) {
        setPreferenceState(event.newValue)
      }
    }

    window.addEventListener("storage", syncStoredPreference)

    return () => window.removeEventListener("storage", syncStoredPreference)
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    function applyTheme() {
      const resolvedTheme: ResolvedAppTheme = preference === "system"
        ? mediaQuery.matches ? "dark" : "light"
        : preference

      document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
      document.documentElement.style.colorScheme = resolvedTheme
      setResolvedTheme(resolvedTheme)
    }

    applyTheme()

    if (preference === "system") {
      mediaQuery.addEventListener("change", applyTheme)
    }

    return () => {
      mediaQuery.removeEventListener("change", applyTheme)
      document.documentElement.classList.remove("dark")
      document.documentElement.style.removeProperty("color-scheme")
    }
  }, [preference])

  const setPreference = useCallback((nextPreference: AppThemePreference) => {
    window.localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, nextPreference)
    setPreferenceState(nextPreference)
  }, [])

  const value = useMemo(() => ({ preference, resolvedTheme, setPreference }), [preference, resolvedTheme, setPreference])

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>
}

function useAppTheme() {
  const context = useContext(AppThemeContext)

  if (!context) {
    throw new Error("useAppTheme must be used within AppThemeProvider")
  }

  return context
}

function isAppThemePreference(value: string | null): value is AppThemePreference {
  return value === "dark" || value === "light" || value === "system"
}

export { AppThemeProvider, useAppTheme }
export type { AppThemePreference }
