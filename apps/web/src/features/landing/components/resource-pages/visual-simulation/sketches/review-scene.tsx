"use client"

import { useId } from "react"

import styles from "../../sketches/resource-sketch.module.css"
import { PlanningTibiaContours } from "../../surgical-planning/sketches/planning-tibia-contours"
import { SimulationSketchCanvas } from "./simulation-sketch-canvas"
import { simulationSketchGeometry as anatomy } from "./simulation-sketch-geometry"
import { rotationSketchGeometry as rotation } from "./rotation-sketch-geometry"
import { reviewSketchGeometry as geometry } from "./review-sketch-geometry"

type ReviewCopy = { original: string; result: string; save: string; saved: string }

function ReviewScene({ copy }: { copy: ReviewCopy }) {
  const instance = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const thumbnailClipId = `simulation-review-thumbnail-${instance}`
  const fragmentClipId = `simulation-review-fragment-${instance}`
  const pointerId = `simulation-review-pointer-${instance}`

  return (
    <SimulationSketchCanvas contentClipId={`simulation-review-clip-${instance}`} tool="review" showAnatomy={false}>
      <defs>
        <clipPath id={thumbnailClipId}><rect {...geometry.thumbnail} /></clipPath>
        <clipPath id={fragmentClipId}><polygon points={anatomy.fragment.pointString} /></clipPath>
      </defs>
      <path id={pointerId} d={geometry.pointerPath} fill="none" stroke="none" />

      <rect className={`${styles.line} ${styles.thin}`} {...geometry.thumbnail} data-a="draw" data-t=".28" data-d=".12" />
      <g clipPath={`url(#${thumbnailClipId})`}>
        <g transform={geometry.thumbnailTransform}>
          <g transform={anatomy.anatomyTransform}>
            <PlanningTibiaContours strokeWidth={.8 / anatomy.zoom} />
          </g>
          <g opacity=".45">
            <path className={`${styles.line} ${styles.thin}`} d={anatomy.fragment.path}
              strokeDasharray="2 3" data-a="fade" data-t=".4" data-d=".08" />
          </g>
          <g data-a="fade" data-t=".5" data-d=".1">
            <g transform={rotation.finalTransform}>
              <g opacity=".12"><polygon points={anatomy.fragment.pointString} fill="var(--color-electric-iris)" /></g>
              <g clipPath={`url(#${fragmentClipId})`}>
                <g transform={anatomy.anatomyTransform}>
                  <PlanningTibiaContours bones={["tibia"]} strokeWidth={.8 / anatomy.zoom} />
                </g>
              </g>
            </g>
          </g>
          <polygon className={`${styles.accentLine} ${styles.emphasisLine}`} points={rotation.resultPointString}
            data-a="draw" data-t=".5" data-d=".18" />
        </g>
      </g>

      <path className={styles.type} d="M131 56H176" data-a="draw" data-t=".32" data-d=".08" />
      <g opacity=".45">
        <path className={`${styles.line} ${styles.thin}`} d="M131 65H199M131 71H183"
          data-a="draw" data-t=".36" data-d=".08" />
      </g>
      <g data-a="fade" data-t=".44" data-d=".08">
        <g opacity=".45"><path className={`${styles.line} ${styles.thin}`} d="M131 83H142" strokeDasharray="2 3" /></g>
        <text className={styles.mini} x="148" y="85.3">{copy.original}</text>
      </g>
      <g data-a="fade" data-t=".6" data-d=".08">
        <path className={`${styles.accentLine} ${styles.emphasisLine}`} d="M131 93H142" />
        <text className={styles.mini} x="148" y="95.3">{copy.result}</text>
      </g>

      <g data-a="click" data-t={geometry.clickAt} data-d=".06">
        <g data-a="fade" data-t=".68" data-d=".08" data-out={geometry.clickAt} data-out-o="0">
          <rect className={styles.ink} {...geometry.save} />
          <text className={styles.badge} x={geometry.saveCenter.x} y={geometry.saveCenter.y + 2.4} textAnchor="middle">{copy.save}</text>
        </g>
        <g data-a="fade" data-t={geometry.savedAt} data-d=".08">
          <rect className={styles.paper} {...geometry.save} />
          <rect className={styles.accentLine} {...geometry.save} />
          <text className={styles.mini} x="169" y={geometry.saveCenter.y + 2.4} textAnchor="middle">{copy.saved}</text>
        </g>
        <circle className={styles.accent} cx="141" cy={geometry.saveCenter.y} r="4.5"
          data-a="pop" data-t={geometry.savedAt + .02} data-d=".06" />
        <path className={styles.check} d="M138.7 111.5L140.4 113.2L143.3 109.8"
          data-a="draw" data-t={geometry.savedAt + .06} data-d=".05" />
      </g>
      <g data-a="follow" data-path={`#${pointerId}`} data-t={geometry.pointerStart} data-d={geometry.pointerDuration}
        data-out={geometry.clickAt + .03} data-out-o="0">
        <g transform="scale(.7)">
          <path className={styles.cursor} d="M0 0V12L3.2 9.2L5.6 14.4L7.68 13.52L5.36 8.4H9.6Z" />
        </g>
      </g>
    </SimulationSketchCanvas>
  )
}

export { ReviewScene }
