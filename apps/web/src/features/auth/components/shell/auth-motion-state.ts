"use client"

import gsap from "gsap"

import type { AuthVisualMode } from "./auth-transition-provider"

function getAuthRecoveryLogoX() {
  return 0
}

function positionAuthLogoForVisualMode(_visualMode: AuthVisualMode) {
  const logoElement = document.querySelector("[data-auth-logo]")

  if (logoElement) {
    gsap.set(logoElement, { x: 0 })
  }
}

function applyAuthShellFinalState(_visualMode: AuthVisualMode, includeForm = true) {
  const backElement = document.querySelector("[data-auth-back]")
  const flowElement = document.querySelector("[data-auth-flow]")
  const formElement = document.querySelector("[data-auth-form]")
  const logoElement = document.querySelector("[data-auth-logo]")
  const footerElement = document.querySelector("[data-auth-footer]")

  if (backElement) {
    gsap.set(backElement, { autoAlpha: 1, x: 0, y: 0 })
  }

  if (includeForm && formElement) {
    gsap.set(formElement, { autoAlpha: 1, x: 0, y: 0 })
  }

  if (flowElement) {
    gsap.set(flowElement, { autoAlpha: 1 })
  }

  if (logoElement) {
    gsap.set(logoElement, { autoAlpha: 1, x: 0, y: 0 })
  }

  if (footerElement) {
    gsap.set(footerElement, { autoAlpha: 1, x: 0, y: 0 })
  }

  gsap.set("[data-auth-stage-bg]", { autoAlpha: 1 })
}

export { applyAuthShellFinalState, getAuthRecoveryLogoX, positionAuthLogoForVisualMode }
