import { measurementPreviewGeometry as geometry } from "./measurement-preview-geometry"
import styles from "./measurement-tools-preview.module.css"

type MeasurementViewerCopy = { file: string; value: string; unit: string; calibrated: string }

function MeasurementPreviewViewer({ copy, idPrefix }: { copy: MeasurementViewerCopy; idPrefix: string }) {
  const { start, end } = geometry.annotation
  const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }

  return (
    <g>
      <defs>
        <filter id={`${idPrefix}-viewer-shadow`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="5" stdDeviation="10" floodColor="#172b4d" floodOpacity=".07" />
        </filter>
        <clipPath id={`${idPrefix}-canvas-clip`}><rect {...geometry.canvas} /></clipPath>
      </defs>

      <rect {...geometry.viewer} fill="white" stroke="#e6e9ef" filter={`url(#${idPrefix}-viewer-shadow)`} />
      <path d="M34 61H366" stroke="#edf0f4" />
      {[49, 56, 63].map(x => <circle cx={x} cy="47.5" r="2.2" fill="#d8dce2" key={x} />)}
      <rect x="106" y="41" width="188" height="13" rx="4" fill="#f7f8fa" />
      <text className={styles.fileName} x="200" y="50.4" textAnchor="middle">{copy.file}</text>

      <g clipPath={`url(#${idPrefix}-canvas-clip)`}>
        <rect {...geometry.canvas} fill="#08090b" />
        <image href={geometry.radiograph.src} x={geometry.radiograph.x} y={geometry.radiograph.y}
          width={geometry.radiograph.width} height={geometry.radiograph.height} preserveAspectRatio="xMidYMid meet" />

        <path d={`M${start.x} ${start.y}L${end.x} ${end.y}`} stroke="#3686ff" strokeWidth="1.6" strokeLinecap="round" />
        {[start, end].map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="3.2" fill="#3686ff" stroke="white" strokeWidth="1" />)}
        <path d={`M${midpoint.x} ${midpoint.y}H178L187 193`} stroke="#3686ff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="187" y="183" width="67" height="20" rx="10" fill="white" stroke="#3686ff" strokeWidth=".8" />
        <text className={styles.annotationValue} textAnchor="middle" x="220.5" y="196">
          {copy.value} {copy.unit}
        </text>
      </g>

      <circle cx="50" cy="329" r="2" fill="#6ba88c" />
      <text className={styles.viewerCaption} x="57" y="332">{copy.calibrated}</text>
      <text className={styles.viewerCaption} x="349" y="332" textAnchor="end">{copy.unit}</text>
    </g>
  )
}

export { MeasurementPreviewViewer }
