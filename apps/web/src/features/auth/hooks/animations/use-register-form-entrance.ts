"use client"

import type { RefObject } from "react"

import { useAuthFormEntrance } from "./use-auth-form-entrance"

function useRegisterFormEntrance(scope: RefObject<HTMLElement | null>) {
  useAuthFormEntrance({
    delay: 0.02,
    motionId: "register-form-entrance",
    scope,
    stagger: 0.05,
    stepSelector: "[data-register-step]",
    y: 10,
  })
}

export { useRegisterFormEntrance }
