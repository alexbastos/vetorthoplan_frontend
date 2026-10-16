"use client"

import gsap from "gsap"

import type { AuthVisualMode } from "./auth-transition-provider"

function getAuthRecoveryLogoX(logoElement: Element) {
  const stageElement = document.querySelector("[data-auth-stage]")

  if (!stageElement) {
    return 0
  }

  return (stageElement.clientWidth - logoElement.clientWidth) / 2 - 24
}

function positionAuthLogoForVisualMode(visualMode: AuthVisualMode) {
  const logoElement = document.querySelector("[data-auth-logo]")

  if (!logoElement || visualMode === "split") {
    return
  }

  gsap.set(logoElement, { x: getAuthRecoveryLogoX(logoElement) })
}

function applyAuthShellFinalState(visualMode: AuthVisualMode) {
  const logoElement = document.querySelector("[data-auth-logo]")
  const backElement = document.querySelector("[data-auth-back]")
  const formElement = document.querySelector("[data-auth-form]")
  const panelElement = document.querySelector("[data-auth-panel]")

  if (backElement) {
    gsap.set(backElement, { autoAlpha: 1, x: 0, y: 0 })
  }

  if (formElement) {
    gsap.set(formElement, { autoAlpha: 1, y: 0 })
  }

  if (visualMode !== "split") {
    gsap.set("[data-auth-stage-bg]", { autoAlpha: 1 })

    if (logoElement) {
      gsap.set(logoElement, { autoAlpha: 1, x: getAuthRecoveryLogoX(logoElement), y: 0 })
    }

    if (panelElement) {
      gsap.set(panelElement, { autoAlpha: 0, x: 0 })
    }

    return
  }

  if (logoElement) {
    gsap.set(logoElement, { autoAlpha: 1, x: 0, y: 0 })
  }

  if (panelElement) {
    gsap.set(panelElement, { autoAlpha: 1, x: 0 })
    gsap.set("[data-auth-stage-bg]", { autoAlpha: 1 })
    gsap.set("[data-auth-panel-bg]", { autoAlpha: 1 })
    gsap.set("[data-auth-source]", { autoAlpha: 1, x: 0 })
    gsap.set("[data-auth-showcase]", { autoAlpha: 1, x: 0, y: 0 })
    gsap.set("[data-auth-tagline]", { autoAlpha: 1, y: 0 })
  }
}

export { applyAuthShellFinalState, getAuthRecoveryLogoX, positionAuthLogoForVisualMode }
