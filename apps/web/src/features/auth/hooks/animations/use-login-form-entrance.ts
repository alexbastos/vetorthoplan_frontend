"use client"

import type { RefObject } from "react"

import { useAuthFormEntrance } from "./use-auth-form-entrance"

function useLoginFormEntrance(scope: RefObject<HTMLElement | null>) {
  useAuthFormEntrance({
    delay: 0.02,
    motionId: "login-form-entrance",
    scope,
    stagger: 0.05,
    stepSelector: "[data-login-step]",
    y: 10,
  })
}

export { useLoginFormEntrance }
