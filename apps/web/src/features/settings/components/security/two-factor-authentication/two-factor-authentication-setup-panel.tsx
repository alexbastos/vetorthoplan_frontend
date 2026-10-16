"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ArrowRight, LoaderCircle, QrCode, RefreshCw } from "lucide-react"
import { useTranslations } from "next-intl"
import { Fragment, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"

gsap.registerPlugin(useGSAP)

/** Painel de provisão TOTP, pronto para receber QR code e segredo temporário da API. */
type TwoFactorAuthenticationSetupPanelProps = {
  canRefresh: boolean
  isLoading: boolean
  isVerifying: boolean
  onRefresh: () => Promise<void>
  onVerify: (code: string) => Promise<void>
  qrCodeUrl?: string
  verificationError?: string
}

function TwoFactorAuthenticationSetupPanel({
  canRefresh,
  isLoading,
  isVerifying,
  onRefresh,
  onVerify,
  qrCodeUrl,
  verificationError,
}: TwoFactorAuthenticationSetupPanelProps) {
  const t = useTranslations("settings.twoFactorAuthentication")
  const panelRef = useRef<HTMLFormElement>(null)
  const scannerRef = useRef<HTMLSpanElement>(null)
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const [digits, setDigits] = useState<string[]>(() => Array.from({ length: 6 }, () => ""))
  const code = digits.join("")

  const focusDigit = (index: number) => inputRefs.current[index]?.focus()
  const setCodeFromDigits = (value: string) => {
    const nextDigits = value.replace(/\D/g, "").slice(0, 6).split("")
    setDigits(Array.from({ length: 6 }, (_, index) => nextDigits[index] ?? ""))
    focusDigit(Math.min(nextDigits.length, 5))
  }

  const setDigit = (index: number, value: string) => {
    const numericValue = value.replace(/\D/g, "")

    if (numericValue.length > 1) {
      setCodeFromDigits(numericValue)
      return
    }

    setDigits((currentDigits) => currentDigits.map((digit, digitIndex) => digitIndex === index ? numericValue : digit))
    if (numericValue && index < 5) focusDigit(index + 1)
  }

  useEffect(() => {
    setDigits(Array.from({ length: 6 }, () => ""))

    if (qrCodeUrl) inputRefs.current[0]?.focus()
  }, [qrCodeUrl])

  useGSAP(() => {
    const panel = panelRef.current

    if (!panel) return undefined

    const media = gsap.matchMedia()
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const tween = gsap.fromTo(panel, { autoAlpha: 0, y: -8 }, { autoAlpha: 1, duration: 0.2, ease: "power2.out", y: 0 })

      return () => tween.kill()
    })
    media.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set(panel, { autoAlpha: 1, y: 0 })
      return undefined
    })

    return () => media.revert()
  }, { scope: panelRef })

  useGSAP(() => {
    const scanner = scannerRef.current

    if (!scanner || !qrCodeUrl) return undefined

    const media = gsap.matchMedia()
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const timeline = gsap.timeline({ repeat: -1, repeatDelay: 0.7 })

      timeline
        .fromTo(
          scanner,
          { autoAlpha: 0, y: () => -scanner.offsetHeight },
          { autoAlpha: 0.72, duration: 0.2, ease: "power1.out", y: () => -scanner.offsetHeight },
        )
        .to(scanner, {
          autoAlpha: 0.72,
          duration: 1.8,
          ease: "power1.inOut",
          y: () => scanner.parentElement?.clientHeight ?? 0,
        })
        .to(scanner, { autoAlpha: 0, duration: 0.2, ease: "power1.in" })

      return () => timeline.kill()
    })
    media.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set(scanner, { autoAlpha: 0, y: 0 })
      return undefined
    })

    return () => media.revert()
  }, { dependencies: [qrCodeUrl], revertOnUpdate: true, scope: panelRef })

  return (
    <form
      aria-live="polite"
      onSubmit={(event) => {
        event.preventDefault()
        if (code.length === 6 && qrCodeUrl && !isVerifying) void onVerify(code)
      }}
      ref={panelRef}
    >
      <div className="flex min-h-44 items-center justify-center py-2">
        <div className="relative overflow-hidden p-3">
          <span aria-hidden="true" className="absolute top-0 left-0 z-20 size-3 border-t border-l border-[var(--case-editor-radio-active)]" />
          <span aria-hidden="true" className="absolute top-0 right-0 z-20 size-3 border-t border-r border-[var(--case-editor-radio-active)]" />
          <span aria-hidden="true" className="absolute bottom-0 left-0 z-20 size-3 border-b border-l border-[var(--case-editor-radio-active)]" />
          <span aria-hidden="true" className="absolute right-0 bottom-0 z-20 size-3 border-r border-b border-[var(--case-editor-radio-active)]" />

          <div className="relative flex size-32 items-center justify-center overflow-hidden rounded-[var(--radius-token-md)] border border-border bg-card p-2 text-content-secondary shadow-[var(--shadow-sm)] sm:size-36">
            {qrCodeUrl ? (
              <>
                {/* The short-lived data URL is kept in memory only and never persisted. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={t("qrCodeLabel")} className="size-full object-contain" src={qrCodeUrl} />
              </>
            ) : isLoading ? (
              <LoaderCircle aria-label={t("qrCodeLoadingLabel")} className="size-8 animate-spin" role="status" strokeWidth={1.5} />
            ) : (
              <QrCode aria-label={t("qrCodePlaceholderLabel")} className="size-12" role="img" strokeWidth={1.5} />
            )}
          </div>
          {qrCodeUrl ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 border-b border-[color-mix(in_srgb,var(--case-editor-radio-active)_55%,transparent)] bg-[linear-gradient(180deg,transparent_0%,color-mix(in_srgb,var(--case-editor-radio-active)_4%,transparent)_36%,color-mix(in_srgb,var(--case-editor-radio-active)_16%,transparent)_100%)] opacity-0"
              ref={scannerRef}
            />
          ) : null}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />
          <span className="font-data text-[0.625rem] leading-4 text-description">{t("verificationStep")}</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <fieldset disabled={!qrCodeUrl || isVerifying}>
          <legend className="sr-only">{t("verificationCode")}</legend>
          <div className="mt-4 flex items-center justify-center gap-1.5 sm:gap-2" role="group">
            {digits.map((digit, index) => (
              <Fragment key={index}>
                {index === 3 ? <span aria-hidden="true" className="mx-0.5 text-caption text-description">—</span> : null}
                <input
                  aria-label={t("verificationCodeDigit", { digit: index + 1 })}
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  autoFocus={index === 0}
                  className="size-8 rounded-[var(--radius-token-sm)] border border-border bg-card text-center font-data text-ui text-foreground outline-none placeholder:text-description focus:border-[var(--input-border-focus)] focus:ring-[var(--button-focus-weight)] focus:ring-[var(--button-focus-color)] disabled:cursor-not-allowed disabled:bg-muted sm:size-9"
                  inputMode="numeric"
                  maxLength={1}
                  onChange={(event) => setDigit(index, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Backspace" && !digit && index > 0) focusDigit(index - 1)
                    if (event.key === "ArrowLeft" && index > 0) focusDigit(index - 1)
                    if (event.key === "ArrowRight" && index < 5) focusDigit(index + 1)
                  }}
                  onPaste={(event) => {
                    event.preventDefault()
                    setCodeFromDigits(event.clipboardData.getData("text"))
                  }}
                  placeholder="0"
                  ref={(element) => { inputRefs.current[index] = element }}
                  type="text"
                  value={digit}
                />
              </Fragment>
            ))}
          </div>
        </fieldset>
        {!qrCodeUrl ? <p className="mt-3 text-center text-caption text-description">{t("setupPending")}</p> : null}
        {verificationError ? <p className="mt-2 text-center text-caption text-destructive" role="alert">{verificationError}</p> : null}
        {verificationError && canRefresh ? (
          <Button className="mt-4 w-full gap-2" disabled={isLoading || isVerifying} onClick={() => void onRefresh()} type="button" variant="secondary">
            <RefreshCw aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
            {t("refreshQrCode")}
          </Button>
        ) : null}
        <div className="-mx-5 mt-5 border-t border-border px-5 pt-5 sm:-mx-6 sm:px-6">
          <Button className="w-full bg-[var(--case-editor-radio-active)] text-white hover:bg-[var(--case-editor-radio-active)] hover:opacity-90 active:bg-[var(--case-editor-radio-active)] disabled:bg-[var(--button-primary-background-disabled)] disabled:text-[var(--button-primary-text-disabled)] disabled:opacity-100 dark:bg-[var(--button-primary-background-default)] dark:text-[var(--button-text-inverse)] dark:hover:bg-[var(--button-primary-background-hover)] dark:active:bg-[var(--button-primary-background-active)] dark:disabled:bg-[var(--button-primary-background-disabled)] dark:disabled:text-[var(--button-primary-text-disabled)] dark:disabled:opacity-100" disabled={!qrCodeUrl || code.length !== 6} loading={isVerifying} type="submit">
            {t("verifyAndEnable")}
            {!isVerifying ? <ArrowRight aria-hidden="true" /> : null}
          </Button>
        </div>
      </div>
    </form>
  )
}

export { TwoFactorAuthenticationSetupPanel }
