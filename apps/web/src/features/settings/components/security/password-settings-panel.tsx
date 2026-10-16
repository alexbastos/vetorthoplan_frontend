"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { useTranslations } from "next-intl"

import { useUnsavedChangesGuard } from "@/components/shared/app-shell/unsaved-changes-guard"
import { Button } from "@/components/ui/button"
import { PasswordSettingsField } from "./password-settings-field"
import { usePasswordSettingsEntrance } from "../../hooks/animations/use-password-settings-entrance"
import { usePasswordSettings } from "../../hooks/use-password-settings"

type PasswordSettingsPanelProps = {
  isActive: boolean
}

type PasswordStep = "confirmation" | "current" | "new"

const passwordStepFields = {
  confirmation: "confirmPassword",
  current: "currentPassword",
  new: "newPassword",
} as const

const passwordStepPositions: Record<PasswordStep, number> = {
  confirmation: 2,
  current: 0,
  new: 1,
}

gsap.registerPlugin(useGSAP)

function PasswordSettingsPanel({ isActive }: PasswordSettingsPanelProps) {
  const t = useTranslations("settings.password")
  const tActions = useTranslations("common.actions")
  const [isEditing, setIsEditing] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [step, setStep] = useState<PasswordStep>("current")
  const handlePasswordChanged = useCallback(() => {
    setIsEditing(false)
    setStep("current")
  }, [])
  const { form, isSaving, onSubmit } = usePasswordSettings({ onPasswordChanged: handlePasswordChanged })
  const { registerUnsavedChangesHandler } = useUnsavedChangesGuard()
  const formRef = useRef<HTMLFormElement>(null)
  const stepContentRef = useRef<HTMLDivElement>(null)
  const exitTweenRef = useRef<gsap.core.Tween | null>(null)
  const shouldAnimateStepEntryRef = useRef(false)
  const transitionDirectionRef = useRef<-1 | 1>(-1)
  const discardChanges = useCallback(() => form.reset(), [form])
  const hasUnsavedChanges = useCallback(() => form.formState.isDirty, [form.formState.isDirty])
  const currentStepField = passwordStepFields[step]
  const currentStepValue = form.watch(currentStepField)
  const isCurrentStepValid = Boolean(currentStepValue) && !form.formState.errors[currentStepField]
  const getUnsavedChanges = useCallback(
    () => [{ field: "password", label: t("title"), previousValue: "", value: t("pendingChanges") }],
    [t],
  )

  usePasswordSettingsEntrance(formRef, isActive)

  useEffect(() => {
    if (!isActive) return

    return registerUnsavedChangesHandler({ discardChanges, getUnsavedChanges, hasUnsavedChanges })
  }, [discardChanges, getUnsavedChanges, hasUnsavedChanges, isActive, registerUnsavedChangesHandler])

  useEffect(() => {
    if (!isActive || !form.formState.isDirty) return

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", warnBeforeUnload)

    return () => window.removeEventListener("beforeunload", warnBeforeUnload)
  }, [form.formState.isDirty, isActive])

  useEffect(() => {
    if (!isActive || !isEditing) return

    const frame = window.requestAnimationFrame(() => form.setFocus(passwordStepFields[step]))

    return () => window.cancelAnimationFrame(frame)
  }, [form, isActive, isEditing, step])

  useEffect(() => {
    return () => {
      exitTweenRef.current?.kill()
    }
  }, [])

  useGSAP(
    () => {
      const content = stepContentRef.current

      if (!content || !isActive) return undefined

      if (!shouldAnimateStepEntryRef.current) {
        gsap.set(content, { autoAlpha: 1, x: 0 })
        return undefined
      }

      shouldAnimateStepEntryRef.current = false
      const media = gsap.matchMedia()

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const tween = gsap.fromTo(
          content,
          { autoAlpha: 0, x: transitionDirectionRef.current * -8 },
          { autoAlpha: 1, duration: 0.18, ease: "power2.out", x: 0 },
        )

        return () => tween.kill()
      })

      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(content, { autoAlpha: 1, x: 0 })
        return undefined
      })

      return () => media.revert()
    },
    { dependencies: [isActive, isEditing, step], scope: stepContentRef },
  )

  async function advanceStep() {
    const isValid = await form.trigger(passwordStepFields[step])

    if (!isValid || isTransitioning || step === "confirmation") return

    transitionTo(step === "current" ? "new" : "confirmation")
  }

  function returnToPreviousStep() {
    if (isTransitioning || step === "current") return
    transitionTo(step === "confirmation" ? "new" : "current")
  }

  function beginEditing() {
    form.reset()
    setStep("current")
    setIsEditing(true)
  }

  function cancelEditing() {
    if (isTransitioning || isSaving) return

    form.reset()
    setStep("current")
    setIsEditing(false)
  }

  function transitionTo(nextStep: PasswordStep) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (reducedMotion) {
      setStep(nextStep)
      return
    }

    transitionDirectionRef.current = passwordStepPositions[nextStep] > passwordStepPositions[step] ? -1 : 1
    setIsTransitioning(true)
    exitTweenRef.current?.kill()
    exitTweenRef.current = gsap.to(stepContentRef.current, {
      autoAlpha: 0,
      duration: 0.16,
      ease: "power2.in",
      onComplete: () => {
        exitTweenRef.current = null
        shouldAnimateStepEntryRef.current = true
        setStep(nextStep)
        setIsTransitioning(false)
      },
      x: transitionDirectionRef.current * 8,
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (step === "confirmation") {
      onSubmit(event)
      return
    }

    event.preventDefault()
    void advanceStep()
  }

  return (
    <form ref={formRef} className="space-y-6 border-t border-capta-border-default px-6 py-6 sm:px-8" noValidate onSubmit={handleSubmit}>
      <section aria-labelledby="security-password-title" className="space-y-4" data-settings-password-group>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-ui-semibold text-capta-text-primary" id="security-password-title">{t("title")}</h3>
            <p className="mt-1 max-w-xl text-ui text-capta-text-secondary">{t("description")}</p>
          </div>
          {!isEditing ? (
            <Button className="!h-7 px-2 text-caption font-semibold" onClick={beginEditing} size="sm" type="button" variant="secondary">
              {t("changeAction")}
            </Button>
          ) : null}
        </div>

        {isEditing ? (
          <div aria-live="polite" className="max-w-md" key={step} ref={stepContentRef}>
            {step === "current" ? <PasswordSettingsField autoComplete="current-password" error={form.formState.errors.currentPassword?.message} hidePasswordLabel={t("hidePassword")} label={t("currentPassword")} placeholder={t("currentPasswordPlaceholder")} registration={form.register("currentPassword")} showPasswordLabel={t("showPassword")} /> : null}
            {step === "new" ? <PasswordSettingsField autoComplete="new-password" error={form.formState.errors.newPassword?.message} hidePasswordLabel={t("hidePassword")} label={t("newPassword")} placeholder={t("newPasswordPlaceholder")} registration={form.register("newPassword")} showPasswordLabel={t("showPassword")} /> : null}
            {step === "confirmation" ? <PasswordSettingsField autoComplete="new-password" error={form.formState.errors.confirmPassword?.message} hidePasswordLabel={t("hidePassword")} label={t("confirmPassword")} placeholder={t("confirmPasswordPlaceholder")} registration={form.register("confirmPassword")} showPasswordLabel={t("showPassword")} /> : null}
          </div>
        ) : null}
      </section>

      {isEditing ? <div className="flex max-w-md justify-end gap-3 pt-2" data-settings-password-group>
        {step === "current" ? (
          <Button disabled={isTransitioning || isSaving} onClick={cancelEditing} type="button" variant="ghost">
            {tActions("cancel")}
          </Button>
        ) : null}
        {step !== "current" ? (
          <Button disabled={isTransitioning || isSaving} onClick={returnToPreviousStep} type="button" variant="secondary">
            {t("back")}
          </Button>
        ) : null}
        <Button disabled={isTransitioning || !isCurrentStepValid} loading={step === "confirmation" && isSaving} type="submit">
          {step === "confirmation" ? t("submit") : tActions("continue")}
        </Button>
      </div> : null}
    </form>
  )
}

export { PasswordSettingsPanel }
