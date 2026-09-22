"use client"

import type { RefObject } from "react"

import { useAuthFormEntrance } from "./use-auth-form-entrance"

function useEmailVerificationSentEntrance(scope: RefObject<HTMLElement | null>) {
  useAuthFormEntrance({
    delay: 0.15,
    motionId: "email-verification-sent-entrance",
    scope,
    stagger: 0.06,
    stepSelector: "[data-email-verification-step]",
    y: 12,
  })
}

export { useEmailVerificationSentEntrance }
