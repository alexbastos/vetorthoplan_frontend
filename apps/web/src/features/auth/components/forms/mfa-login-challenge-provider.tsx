"use client"

import { createContext, type ReactNode, useContext } from "react"

import { useMfaLoginChallenge } from "../../hooks/use-mfa-login-challenge"
import { MfaChallengeForm } from "./mfa-challenge-form"

type MfaLoginChallengeContextValue = ReturnType<typeof useMfaLoginChallenge>

type MfaLoginChallengeProviderProps = {
  children: ReactNode
  redirectTo?: string
}

const MfaLoginChallengeContext = createContext<MfaLoginChallengeContextValue | null>(null)

function MfaLoginChallengeProvider({ children, redirectTo }: MfaLoginChallengeProviderProps) {
  const challenge = useMfaLoginChallenge(redirectTo)

  return (
    <MfaLoginChallengeContext.Provider value={challenge}>
      {children}
    </MfaLoginChallengeContext.Provider>
  )
}

function useMfaLoginChallengeContext() {
  const context = useContext(MfaLoginChallengeContext)

  if (!context) {
    throw new Error("useMfaLoginChallengeContext must be used within MfaLoginChallengeProvider")
  }

  return context
}

function MfaLoginChallengeView() {
  const {
    availableMethods,
    discardChallenge,
    emailCooldownSeconds,
    form,
    isSendingEmailCode,
    isVerifying,
    method,
    selectMethod,
    sendEmailCode,
    verify,
  } = useMfaLoginChallengeContext()

  if (!availableMethods || !method) return null

  return (
    <MfaChallengeForm
      availableMethods={availableMethods}
      emailCooldownSeconds={emailCooldownSeconds}
      form={form}
      isSendingEmailCode={isSendingEmailCode}
      isVerifying={isVerifying}
      method={method}
      onBack={discardChallenge}
      onMethodChange={selectMethod}
      onSendEmailCode={sendEmailCode}
      onSubmit={verify}
    />
  )
}

export { MfaLoginChallengeProvider, MfaLoginChallengeView, useMfaLoginChallengeContext }
export type { MfaLoginChallengeProviderProps }
