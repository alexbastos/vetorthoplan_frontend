"use client"

import { useId } from "react"

import styles from "../../sketches/resource-sketch.module.css"
import { PlanningSketchResult } from "../../surgical-planning/sketches/planning-sketch-result"
import { PlanningTibiaContours } from "../../surgical-planning/sketches/planning-tibia-contours"
import { SimulationSketchCanvas } from "./simulation-sketch-canvas"
import { simulationSketchGeometry as anatomy } from "./simulation-sketch-geometry"
import { rotationSketchGeometry as geometry } from "./rotation-sketch-geometry"

function RotationScene({ value }: { value: string }) {
  const instance = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const fragmentClipId = `simulation-rotation-fragment-${instance}`
  const dragId = `simulation-rotation-drag-${instance}`

  return (
    <SimulationSketchCanvas contentClipId={`simulation-rotation-clip-${instance}`} tool="rotation" anatomyTransform={geometry.anatomyTransform}>
      <defs>
        <clipPath id={fragmentClipId}><polygon points={anatomy.fragment.pointString} /></clipPath>
      </defs>
      <g transform={geometry.viewTransform}>
        <path id={dragId} d={geometry.handlePath} fill="none" stroke="none" />
        <g opacity=".35">
          <path className={`${styles.line} ${styles.thin}`} d={anatomy.fragment.path} strokeDasharray="2 3"
            data-a="fade" data-t=".4" data-d=".1" />
        </g>
        <g opacity=".24">
          <path className={`${styles.line} ${styles.thin}`} d={anatomy.cutReference} strokeDasharray="2 3"
            data-a="fade" data-t=".36" data-d=".08" />
        </g>

        <g data-a="fade" data-t=".42" data-d=".1">
          <g transform={geometry.finalTransform} data-a="rotate" data-origin={geometry.origin}
            data-from="0" data-to={geometry.degrees} data-t={geometry.start} data-d={geometry.duration} data-ease="none">
            <g opacity=".12"><polygon points={anatomy.fragment.pointString} fill="var(--color-electric-iris)" /></g>
            <g clipPath={`url(#${fragmentClipId})`}>
              <g transform={anatomy.anatomyTransform}>
                <PlanningTibiaContours bones={["tibia"]} strokeWidth={.8 / anatomy.zoom} />
              </g>
            </g>
            <path className={`${styles.accentLine} ${styles.emphasisLine}`} d={anatomy.fragment.path} />
            <path className={styles.accentLine} d={geometry.spoke} strokeDasharray="2 3" style={{ strokeWidth: .8 }} />
            <circle className={styles.paper} cx={geometry.handleStart.x} cy={geometry.handleStart.y} r="3.2" />
            <circle className={styles.accentLine} cx={geometry.handleStart.x} cy={geometry.handleStart.y} r="3.2" />
          </g>
        </g>

        <g opacity=".3">
          <path className={styles.accentLine} d={geometry.handlePath} data-a="draw"
            data-t={geometry.start} data-d={geometry.duration} data-ease="none" />
        </g>
        <g opacity=".45">
          <path className={`${styles.line} ${styles.thin}`} d={geometry.pivotReference}
            data-a="fade" data-t=".5" data-d=".04" />
        </g>
        <g opacity=".45">
          <circle className={styles.accentLine} cx={geometry.handleStart.x} cy={geometry.handleStart.y} r="5.2"
            data-a="pop" data-t={geometry.start - .02} data-d=".025" data-out={geometry.start + .03} data-out-o="0" />
        </g>
        <g data-a="follow" data-path={`#${dragId}`} data-t={geometry.start} data-d={geometry.duration}
          data-out={geometry.end + .02} data-out-o="0">
          <g transform="scale(.7)">
            <path className={styles.cursor} d="M0 0V12L3.2 9.2L5.6 14.4L7.68 13.52L5.36 8.4H9.6Z" />
          </g>
        </g>
      </g>
      <g opacity=".5">
        <path className={styles.accentLine} d={geometry.labelConnection} data-a="draw" data-t={geometry.end + .06} data-d=".06" />
      </g>
      <PlanningSketchResult value={value} y={96} at={geometry.end + .14} width={geometry.resultWidth} />
    </SimulationSketchCanvas>
  )
}

export { RotationScene }
