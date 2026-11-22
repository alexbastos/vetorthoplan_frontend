"use client"

import { useId } from "react"

import styles from "../../sketches/resource-sketch.module.css"
import { PlanningSketchResult } from "../../surgical-planning/sketches/planning-sketch-result"
import { SimulationSketchCanvas } from "./simulation-sketch-canvas"
import { simulationSketchGeometry as geometry } from "./simulation-sketch-geometry"

function FragmentScene({ label }: { label: string }) {
  const instance = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const routeId = `simulation-fragment-route-${instance}`
  const fragment = geometry.fragment

  return (
    <SimulationSketchCanvas contentClipId={`simulation-fragment-clip-${instance}`}>
      <path id={routeId} d={fragment.path} fill="none" stroke="none" />
      <g opacity=".24">
        <path className={`${styles.line} ${styles.thin}`} d={geometry.cutReference} strokeDasharray="2 3"
          data-a="fade" data-t=".36" data-d=".08" />
      </g>
      <g opacity=".12">
        <polygon points={fragment.pointString} fill="var(--color-electric-iris)"
          data-a="fade" data-t={fragment.fillAt} data-d=".1" />
      </g>
      {fragment.segments.map((segment, index) => (
        <path className={styles.accentLine} d={segment.path} key={index}
          data-a="draw" data-t={fragment.drawingStart + fragment.drawingDuration * segment.progress}
          data-d={fragment.drawingDuration * segment.durationRatio} data-ease="none" />
      ))}
      {fragment.points.map((point, index) => {
        const at = fragment.drawingStart + fragment.drawingDuration * fragment.segments[index].progress
        return (
          <g key={index}>
            <circle cx={point.x} cy={point.y} r="1.4" fill="var(--color-electric-iris)" stroke="white" strokeWidth=".5"
              data-a="pop" data-t={at} data-d=".035" />
            <g opacity=".45">
              <circle className={styles.accentLine} cx={point.x} cy={point.y} r="2.6"
                data-a="pop" data-t={at} data-d=".025" data-out={at + .03} data-out-o="0" />
            </g>
          </g>
        )
      })}
      <g opacity=".45">
        <circle className={styles.accentLine} cx={fragment.points[0].x} cy={fragment.points[0].y} r="2.6"
          data-a="pop" data-t={fragment.drawingEnd} data-d=".025" data-out={fragment.drawingEnd + .03} data-out-o="0" />
      </g>
      <g data-a="follow" data-path={`#${routeId}`} data-path-stops={fragment.pathStops}
        data-t={fragment.drawingStart} data-d={fragment.drawingDuration} data-out={fragment.drawingEnd + .02} data-out-o="0">
        <g transform="scale(.7)">
          <path className={styles.cursor} d="M0 0V12L3.2 9.2L5.6 14.4L7.68 13.52L5.36 8.4H9.6Z" />
        </g>
      </g>
      <g opacity=".5">
        <path className={styles.accentLine} d={fragment.labelConnection} data-a="draw"
          data-t={fragment.fillAt + .1} data-d=".04" />
      </g>
      <PlanningSketchResult value={label} y={96} at={fragment.labelAt} />
    </SimulationSketchCanvas>
  )
}

export { FragmentScene }
