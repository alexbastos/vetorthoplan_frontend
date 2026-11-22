import Image from "next/image"
import { useLocale, useTranslations } from "next-intl"
import { Check, Crosshair, ImageIcon, Maximize2, Ruler, ScanLine, ZoomIn } from "lucide-react"

import { heroRadiograph } from "../hero-rebrand/hero-product-measurements"
import { heroTpaConstruction, heroTpaPoints } from "../hero-rebrand/hero-product-tpa"
import styles from "./planning-workspace-scene.module.css"

// The image and landmarks share the same native coordinates as the Hero.
// Only presentation is animated; the illustration does not change case data.
function PlanningWorkspaceScene() {
  const t = useTranslations("orthovetLanding.clinicalCaseStory.planningWorkspace")
  const locale = useLocale()
  const imageScale = 345 / heroRadiograph.heightPx
  const construction = heroTpaConstruction(4, undefined, imageScale, locale)
  const pixel = 1 / imageScale

  return (
    <div className={styles.root}>
      <div className={styles.stage}>
        <div className={styles.caseHeader}>
          <Image alt="" className={styles.avatar} src="/images/landing/3422243535333125.avif" width={52} height={52} />
          <span className={styles.caseIdentity}><strong>{t("patient")}</strong><small>{t("case")}</small></span>
          <span className={styles.headerStatus}><span />{t("planning")}</span>
        </div>

        <div className={styles.imageWindow}>
          <div className={styles.imageHeading}><ImageIcon /><span>{t("radiograph")}</span><Maximize2 /></div>
          <svg className={styles.radiograph} viewBox={`0 0 ${heroRadiograph.widthPx} ${heroRadiograph.heightPx}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <image href={heroRadiograph.src} width={heroRadiograph.widthPx} height={heroRadiograph.heightPx} />
            {(["plateau", "axis", "reference"] as const).map((kind) => {
              const segment = construction.segments[kind]
              if (!segment) return null
              return <path key={kind} className={`${styles.landmarkLine} ${styles[kind]}`} pathLength={1}
                d={`M${segment.start.x * heroRadiograph.widthPx} ${segment.start.y * heroRadiograph.heightPx} L${segment.end.x * heroRadiograph.widthPx} ${segment.end.y * heroRadiograph.heightPx}`}
                fill="none" stroke={kind === "reference" ? "#e4f5ff" : "#71c6ff"} strokeWidth={(kind === "reference" ? 1.3 : 1.8) * pixel} />
            })}
            {heroTpaPoints.map((point, index) => (
              <circle key={index} className={styles.landmarkPoint} data-point={index}
                cx={point.x * heroRadiograph.widthPx} cy={point.y * heroRadiograph.heightPx}
                r={3 * pixel} fill="#fff" stroke="#54adff" strokeWidth={1.5 * pixel} />
            ))}
            {construction.angle && <g className={styles.angle}>
              <path d={construction.angle.path} fill="none" stroke="#ffe0a4" strokeWidth={1.5 * pixel} />
              {construction.angle.label && <text x={construction.angle.label.x} y={construction.angle.label.y}
                fontSize={11 * pixel} fill="#fff0d6" textAnchor="middle" dominantBaseline="middle"
                fontFamily="var(--font-data), monospace">{construction.angle.value}</text>}
            </g>}
          </svg>
        </div>

        <div className={styles.toolbar}>
          <span className={styles.rulerTool}><Ruler /></span>
          <span className={styles.axisTool}><Crosshair /></span>
          <span><ScanLine /></span>
          <span><ZoomIn /></span>
        </div>

        <div className={styles.calibrationCard}>
          <span className={styles.calibrationIcon}><Ruler /></span>
          <span><small>{t("calibration")}</small><strong>{t("scaleDefined")}</strong></span>
          <Check className={styles.calibrationCheck} />
        </div>

        <div className={styles.referencePanel}>
          <div className={styles.panelTitle}><Crosshair /><strong>{t("references")}</strong><span>03</span></div>
          <div className={`${styles.referenceRow} ${styles.plateauRow}`}><span /><span>{t("plateau")}</span><Check /></div>
          <div className={`${styles.referenceRow} ${styles.axisRow}`}><span /><span>{t("axis")}</span><Check /></div>
          <div className={`${styles.referenceRow} ${styles.angleRow}`}><span /><span>{t("angle")}</span><strong>{construction.angle?.value}</strong></div>
          <div className={styles.panelFooter}><Check />{t("readyForReview")}</div>
        </div>

        <div className={styles.completion}><span><Check /></span>{t("referencesDefined")}</div>
      </div>
    </div>
  )
}

export { PlanningWorkspaceScene }
