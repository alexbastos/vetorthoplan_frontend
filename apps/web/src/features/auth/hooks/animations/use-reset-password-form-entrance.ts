"use client"

import type { RefObject } from "react"

import { useAuthFormEntrance } from "./use-auth-form-entrance"

function useResetPasswordFormEntrance(scope: RefObject<HTMLElement | null>) {
  useAuthFormEntrance({
    delay: 0.15,
    motionId: "reset-password-form-entrance",
    scope,
    stagger: 0.06,
    stepSelector: "[data-reset-password-step]",
    y: 12,
  })
}

export { useResetPasswordFormEntrance }
