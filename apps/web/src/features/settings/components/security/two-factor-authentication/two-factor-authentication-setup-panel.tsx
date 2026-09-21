"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { LoaderCircle, QrCode, RefreshCw } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"

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
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const lastAutoSubmittedCodeRef = useRef<string | undefined>(undefined)
  const wasCodeCompleteRef = useRef(false)
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
    lastAutoSubmittedCodeRef.current = undefined
    wasCodeCompleteRef.current = false

    if (qrCodeUrl) inputRefs.current[0]?.focus()
  }, [qrCodeUrl])

  useEffect(() => {
    if (code.length < 6) {
      lastAutoSubmittedCodeRef.current = undefined
      wasCodeCompleteRef.current = false
      return
    }

    if (!qrCodeUrl || isVerifying || wasCodeCompleteRef.current || lastAutoSubmittedCodeRef.current === code) return

    wasCodeCompleteRef.current = true
    lastAutoSubmittedCodeRef.current = code
    void onVerify(code)
  }, [code, isVerifying, onVerify, qrCodeUrl])

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

  return (
    <div aria-live="polite" className="border border-border bg-muted p-4" ref={panelRef}>
      <div className="flex items-start gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-token-md)] border border-border bg-card text-content-secondary">
          {qrCodeUrl ? (
            // The short-lived data URL is kept in memory only and never persisted.
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={t("qrCodeLabel")} className="size-full object-contain" src={qrCodeUrl} />
          ) : isLoading ? (
            <LoaderCircle aria-label={t("qrCodeLoadingLabel")} className="size-8 animate-spin" role="status" strokeWidth={1.5} />
          ) : (
            <QrCode aria-label={t("qrCodePlaceholderLabel")} className="size-12" role="img" strokeWidth={1.5} />
          )}
        </div>
        <div>
          <h4 className="text-caption font-semibold text-foreground">{t("setupTitle")}</h4>
          <p className="mt-1 text-caption text-content-secondary">{t("setupDescription")}</p>
          <p className="mt-2 text-caption text-muted-foreground">{qrCodeUrl ? t("setupReady") : t("setupPending")}</p>
        </div>
      </div>

          <div className="mt-4 border-t border-border pt-4">
            <fieldset disabled={!qrCodeUrl || isVerifying}>
              <legend className="text-caption font-semibold text-foreground">{t("verificationCode")}</legend>
              <div className="mt-2 flex gap-2" role="group">
                {digits.map((digit, index) => (
                  <input
                    aria-label={t("verificationCodeDigit", { digit: index + 1 })}
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    autoFocus={index === 0}
                    className="size-8 rounded-[var(--radius-token-sm)] border border-border bg-card text-center font-mono text-caption text-foreground outline-none disabled:cursor-not-allowed disabled:bg-muted"
                    inputMode="numeric"
                    key={index}
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
                    ref={(element) => { inputRefs.current[index] = element }}
                    type="text"
                    value={digit}
                  />
                ))}
              </div>
            </fieldset>
            {verificationError ? <p className="mt-2 text-caption text-destructive" role="alert">{verificationError}</p> : null}
            {verificationError && canRefresh ? (
              <Button className="mt-3 gap-2" disabled={isLoading || isVerifying} onClick={() => void onRefresh()} size="sm" type="button" variant="secondary">
                <RefreshCw aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
                {t("refreshQrCode")}
              </Button>
            ) : null}
            {isVerifying ? <p className="mt-2 text-caption text-muted-foreground" role="status">{t("verifyingCode")}</p> : null}
          </div>
    </div>
  )
}

export { TwoFactorAuthenticationSetupPanel }
