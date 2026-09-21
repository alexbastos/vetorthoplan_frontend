"use client"

import { useRef, useState } from "react"
import { useTranslations } from "next-intl"

import { useAuthPageEntered } from "../shell/auth-page-motion"
import { useEditalScannerAnimation } from "../../hooks/animations/use-edital-scanner-animation"

const VARIATIONS = [
  {
    adherenceKey: "highMatch" as const,
    dotClass: "bg-capta-feedback-success",
    statusKey: "openApplications" as const,
  },
  {
    adherenceKey: "mediumMatch" as const,
    dotClass: "bg-capta-feedback-warning",
    statusKey: "eligibilityReview" as const,
  },
  {
    adherenceKey: "highMatch" as const,
    dotClass: "bg-capta-feedback-success",
    statusKey: "fundingAvailable" as const,
  },
  {
    adherenceKey: "mediumMatch" as const,
    dotClass: "bg-capta-feedback-warning",
    statusKey: "applicationsSoon" as const,
  },
]

export function EditalScannerAnimation() {
  const t = useTranslations("auth.showcase")
  const hasEntered = useAuthPageEntered()

  const containerRef = useRef<HTMLDivElement>(null)
  const card3dRef = useRef<HTMLDivElement>(null)
  const frontFaceRef = useRef<HTMLDivElement>(null)
  const backFaceRef = useRef<HTMLDivElement>(null)
  const digitalLayerRef = useRef<HTMLDivElement>(null)
  const finalDocumentRef = useRef<HTMLDivElement>(null)
  const scannerRef = useRef<HTMLDivElement>(null)

  const statusTitleRef = useRef<HTMLParagraphElement>(null)
  const statusDescRef = useRef<HTMLParagraphElement>(null)

  const [variationIndex, setVariationIndex] = useState(0)

  useEditalScannerAnimation(
    {
      backFace: backFaceRef,
      card3d: card3dRef,
      digitalLayer: digitalLayerRef,
      finalDocument: finalDocumentRef,
      frontFace: frontFaceRef,
      scanner: scannerRef,
      scope: containerRef,
      statusDesc: statusDescRef,
      statusTitle: statusTitleRef,
    },
    () => setVariationIndex((prev) => (prev + 1) % VARIATIONS.length),
    hasEntered,
  )

  const currentVariation = VARIATIONS[variationIndex]

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-3 select-none"
      aria-hidden="true"
    >
      {/* Ilustração do Cartão 3D Animado */}
      <div className="relative flex size-20 shrink-0 items-center justify-center sm:size-24">
        <div
          ref={card3dRef}
          className="relative h-[84px] w-[60px]"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* FACE TRASEIRA (Verso cinza claro limpo) */}
          <div
            ref={backFaceRef}
            className="absolute inset-0 rounded-[2px] border-2 border-capta-border-default bg-capta-surface-subtle shadow-sm"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          />

          {/* FACE FRONTAL */}
          <div
            ref={frontFaceRef}
            className="absolute inset-0 overflow-hidden rounded-[2px] border-2 border-capta-border-default bg-capta-surface-card shadow-sm"
            style={{ backfaceVisibility: "hidden" }}
          >
            {/* CAMADA 1: Dados Digitais Criptografados */}
            <div
              ref={digitalLayerRef}
              className="absolute inset-0 flex flex-col justify-between p-2 font-mono text-[5px] leading-tight text-capta-text-muted/80 select-none opacity-0"
            >
              <div className="flex items-center gap-1">
                <div className="size-2 rounded-full bg-capta-text-disabled" />
                <div className="h-1.5 w-6 rounded bg-capta-surface-subtle-hover" />
              </div>
              <div className="space-y-0.5 tracking-wider opacity-75">
                <p>1 0 1 1 0 1 0</p>
                <p># 8 % $ & * 9</p>
                <p>1 0 # % 8 1 0</p>
                <p>§ 0 1 8 % # 5</p>
                <p># 5 0 0 1 1 8</p>
                <p>% # # # 8 1 0</p>
              </div>
              <div className="flex justify-end">
                <div className="h-2.5 w-3.5 rounded-[1px] border border-capta-text-disabled bg-capta-surface-subtle" />
              </div>
            </div>

            {/* CAMADA 2: Documento Final Completo */}
            <div
              ref={finalDocumentRef}
              className="absolute inset-0 flex flex-col justify-between bg-capta-surface-card p-2 text-[6px] select-none"
            >
              {/* Cabeçalho com Avatar + Título */}
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 shrink-0 rounded-full bg-capta-text-disabled" />
                <div className="h-1.5 w-7 rounded-full bg-capta-text-disabled" />
              </div>

              {/* Linhas de Conteúdo */}
              <div className="space-y-1 py-0.5">
                <div className="h-1.5 w-full rounded-full bg-capta-text-disabled" />
                <div className="h-1.5 w-11/12 rounded-full bg-capta-surface-subtle-hover" />
                <div className="h-1.5 w-4/5 rounded-full bg-capta-surface-subtle-hover" />
              </div>

              {/* Pill de Destaque Alinhada à Direita */}
              <div className="flex justify-end pr-0.5">
                <div className="h-3 w-8 rounded-[2px] bg-capta-text-disabled" />
              </div>

              {/* Rodapé: Assinatura Orgânica + Carimbo */}
              <div className="flex items-end justify-between pt-0.5">
                <svg className="h-3 w-7 text-capta-text-muted" viewBox="0 0 28 10" fill="none">
                  <path
                    d="M2 6C7 2, 12 9, 17 4C21 1, 23 7, 26 5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex size-3.5 shrink-0 items-center justify-center rounded-[2px] border border-capta-text-disabled bg-capta-surface-subtle">
                  <div className="grid grid-cols-2 gap-0.5 p-0.5">
                    <div className="size-1 rounded-[0.5px] bg-capta-text-disabled" />
                    <div className="size-1 rounded-[0.5px] bg-capta-text-disabled" />
                    <div className="size-1 rounded-[0.5px] bg-capta-text-disabled" />
                    <div className="size-1 rounded-[0.5px] bg-capta-text-disabled" />
                  </div>
                </div>
              </div>
            </div>

            {/* CAMADA 3: Linha do scanner na cor primária da marca */}
            <div
              ref={scannerRef}
              className="pointer-events-none absolute -left-0.5 z-30 h-[2px] w-[64px] -translate-y-1/2 rounded-full bg-capta-brand-primary shadow-[0_0_6px_var(--color-brand-primary)] opacity-0"
            />
          </div>
        </div>
      </div>

      {/* LADO DIREITO: Status Dinâmico (Totalmente oculto na abertura inicial) */}
      <div className="flex h-12 min-w-[150px] flex-col justify-center space-y-1">
        <p
          ref={statusTitleRef}
          className="flex items-center gap-2 text-ui-semibold text-capta-text-primary whitespace-nowrap opacity-0"
        >
          <span
            aria-hidden="true"
            className={`size-2 shrink-0 rounded-full ${currentVariation.dotClass}`}
          />
          {t(currentVariation.adherenceKey)}
        </p>
        <p
          ref={statusDescRef}
          className="text-ui text-capta-text-secondary whitespace-nowrap opacity-0"
        >
          {t(currentVariation.statusKey)}
        </p>
      </div>
    </div>
  )
}
