"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { useEffect, useRef, type RefObject } from "react"

gsap.registerPlugin(useGSAP)

type EditalScannerAnimationRefs = {
  backFace: RefObject<HTMLDivElement | null>
  card3d: RefObject<HTMLDivElement | null>
  digitalLayer: RefObject<HTMLDivElement | null>
  finalDocument: RefObject<HTMLDivElement | null>
  frontFace: RefObject<HTMLDivElement | null>
  scanner: RefObject<HTMLDivElement | null>
  scope: RefObject<HTMLDivElement | null>
  statusDesc: RefObject<HTMLParagraphElement | null>
  statusTitle: RefObject<HTMLParagraphElement | null>
}

function useEditalScannerAnimation(
  {
    backFace,
    card3d,
    digitalLayer,
    finalDocument,
    frontFace,
    scanner,
    scope,
    statusDesc,
    statusTitle,
  }: EditalScannerAnimationRefs,
  onCycleComplete: () => void,
  isEnabled: boolean,
) {
  const entranceTweenRef = useRef<gsap.core.Tween | null>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)

  useEffect(() => {
    const syncVisibility = () => {
      if (document.visibilityState === "hidden") {
        entranceTweenRef.current?.pause()
        timelineRef.current?.pause()
        return
      }

      entranceTweenRef.current?.resume()
      timelineRef.current?.resume()
    }

    document.addEventListener("visibilitychange", syncVisibility)
    return () => document.removeEventListener("visibilitychange", syncVisibility)
  }, [])

  useGSAP(
    () => {
      // Estado absoluto zerado antes de iniciar (textos totalmente ocultos e documento preparado para fade-in)
      gsap.set([statusTitle.current, statusDesc.current], { opacity: 0, y: 6 })
      gsap.set(card3d.current, { autoAlpha: 0, scale: 0.92, y: 6 })

      if (!isEnabled) {
        return
      }

      const media = gsap.matchMedia()

      media.add("(prefers-reduced-motion: no-preference)", () => {
        // 1. ANIMAÇÃO DE ENTRADA DO DOCUMENTO (Roda APENAS UMA VEZ na abertura da página)
        const entranceTween = gsap.to(card3d.current, {
          autoAlpha: 1,
          duration: 0.45,
          ease: "power2.out",
          scale: 1,
          y: 0,
        })
        entranceTweenRef.current = entranceTween

        // 2. TIMELINE DE LOOP CONTINUO SEAMLESS (Roda em loop sem piscar ou reiniciar a opacidade)
        const tl = gsap.timeline({ repeat: -1 })
        timelineRef.current = tl

        if (document.visibilityState === "hidden") {
          entranceTween.pause()
          tl.pause()
        }

        // Configuração inicial das faces e documento no frame 0
        tl.set(card3d.current, {
          rotateY: 0,
          transformPerspective: 600,
        })
          .set(frontFace.current, {
            backfaceVisibility: "hidden",
            rotateY: 0,
          })
          .set(backFace.current, {
            backfaceVisibility: "hidden",
            rotateY: 180,
          })
          .set(finalDocument.current, {
            clipPath: "inset(0% 0% 0% 0%)",
            opacity: 1,
          })
          .set(digitalLayer.current, {
            opacity: 0,
          })
          .set(scanner.current, {
            opacity: 0,
            top: "0%",
          })
          .set([statusTitle.current, statusDesc.current], {
            opacity: 0,
            y: 6,
          })

        // =======================================================
        // FASE 1 — GIRO 3D (0,00 s – 0,75 s)
        // =======================================================
        tl.to([statusTitle.current, statusDesc.current], {
          duration: 0.2,
          ease: "power1.out",
          opacity: 0,
          y: -4,
        })
          .to(
            card3d.current,
            {
              duration: 0.2,
              ease: "power2.in",
              rotateY: 90,
            },
            "<",
          )
          .set(finalDocument.current, {
            clipPath: "inset(0% 0% 100% 0%)",
          })
          .to(card3d.current, {
            duration: 0.18,
            ease: "power1.inOut",
            rotateY: 180,
          })
          .to(card3d.current, {
            duration: 0.18,
            ease: "power1.inOut",
            rotateY: 270,
          })
          .to(card3d.current, {
            duration: 0.19,
            ease: "power2.out",
            rotateY: 360,
          })
          .set(card3d.current, { rotateY: 0 })

        // =======================================================
        // FASE 2 — ESTADO DIGITAL CRIPTOGRAFADO (0,75 s – 0,95 s)
        // =======================================================
        tl.to(digitalLayer.current, {
          duration: 0.2,
          ease: "power1.out",
          opacity: 0.85,
        })

        // =======================================================
        // FASE 3 — SCANNER BRAND PRIMARY E REVELAÇÃO (0,95 s – 1,65 s)
        // =======================================================
        tl.to(scanner.current, {
          duration: 0.04,
          opacity: 1,
        })
          .to(
            scanner.current,
            {
              duration: 0.66,
              ease: "none",
              top: "100%",
            },
            "<",
          )
          .to(
            finalDocument.current,
            {
              clipPath: "inset(0% 0% 0% 0%)",
              duration: 0.66,
              ease: "none",
            },
            "<",
          )
          .add(() => {
            onCycleComplete()
          }, 1.61)
          .fromTo(
            [statusTitle.current, statusDesc.current],
            { opacity: 0, y: 6 },
            {
              duration: 0.25,
              ease: "power2.out",
              opacity: 1,
              stagger: 0.08,
              y: 0,
            },
            1.62,
          )
          .to(scanner.current, {
            duration: 0.05,
            opacity: 0,
          })
          .to(
            digitalLayer.current,
            {
              duration: 0.05,
              opacity: 0,
            },
            "<",
          )

        // =======================================================
        // REPOUSO FINAL E LOOP SEAMLESS (1,65 s – 2,00 s)
        // =======================================================
        tl.to({}, { duration: 0.35 })

        return () => {
          entranceTween.kill()
          tl.kill()
          if (entranceTweenRef.current === entranceTween) {
            entranceTweenRef.current = null
          }
          if (timelineRef.current === tl) {
            timelineRef.current = null
          }
        }
      })

      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(card3d.current, { autoAlpha: 1, rotateY: 0, scale: 1, y: 0 })
        gsap.set(frontFace.current, { rotateY: 0 })
        gsap.set(backFace.current, { rotateY: 180 })
        gsap.set(finalDocument.current, { clipPath: "inset(0% 0% 0% 0%)", opacity: 1 })
        gsap.set(digitalLayer.current, { opacity: 0 })
        gsap.set(scanner.current, { opacity: 0 })
        gsap.set([statusTitle.current, statusDesc.current], { opacity: 1, y: 0 })
      })

      return () => media.revert()
    },
    { dependencies: [isEnabled], scope },
  )
}

export { useEditalScannerAnimation }
export type { EditalScannerAnimationRefs }
