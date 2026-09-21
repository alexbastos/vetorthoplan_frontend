"use client"

import { useCallback } from "react"

import { useLoginHandoff } from "@/components/shared/login-handoff/login-handoff-provider"

import { LOGIN_AUTHENTICATION_MIN_DURATION } from "../lib/login-authentication"

type AuthenticationOutcome<Result> =
  | { result: Result; type: "success" }
  | { error: unknown; type: "error" }
  | { type: "cancelled" }

function useLoginAuthenticationFlow() {
  const { awaitDestination, beginHandoff, exitHandoff } = useLoginHandoff()

  const runAuthentication = useCallback(
    async <Result,>(authenticate: () => Promise<Result>): Promise<AuthenticationOutcome<Result>> => {
      if (!beginHandoff()) {
        return { type: "cancelled" }
      }

      const request = authenticate()
        .then((result) => ({ result, type: "success" }) as const)
        .catch((error: unknown) => ({ error, type: "error" }) as const)

      const [outcome] = await Promise.all([request, wait(LOGIN_AUTHENTICATION_MIN_DURATION)])

      return outcome
    },
    [beginHandoff],
  )

  const finishAuthentication = useCallback(() => exitHandoff(), [exitHandoff])

  return { awaitDestination, finishAuthentication, runAuthentication }
}

function wait(seconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, seconds * 1000))
}

export { useLoginAuthenticationFlow }
