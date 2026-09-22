"use client"

import type { RefObject } from "react"

import { useAuthFormEntrance } from "./use-auth-form-entrance"

function useForgotPasswordFormEntrance(scope: RefObject<HTMLElement | null>) {
  useAuthFormEntrance({
    delay: 0.15,
    motionId: "forgot-password-form-entrance",
    scope,
    stagger: 0.06,
    stepSelector: "[data-forgot-password-step]",
    y: 12,
  })
}

export { useForgotPasswordFormEntrance }
