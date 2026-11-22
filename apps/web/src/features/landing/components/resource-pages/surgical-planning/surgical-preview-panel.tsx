import { surgicalPreviewGeometry as geometry } from "./surgical-preview-geometry"
import styles from "./surgical-planning-preview.module.css"

type SurgicalPreviewPanelCopy = { badge: string; firstLine: string; secondLine: string; reviewed: string }

function SurgicalPreviewPanel({ idPrefix, copy }: { idPrefix: string; copy: SurgicalPreviewPanelCopy }) {
  const { panel } = geometry

  return (
    <g>
      <rect {...panel.outer} fill="#FAFAFA" />
      <g clipPath={`url(#${idPrefix}-panel)`}>
        <rect {...panel.inner} fill="white" />
        <path d="M219 73H603V127H219V73Z" fill="white" />
        <rect {...panel.avatar} fill="#E7F2FF" />
        <g clipPath={`url(#${idPrefix}-avatar)`} className={styles.panelAvatar}>
          <path d="M248.53 99.2995C250.06 99.2995 251.301 98.0585 251.301 96.5277C251.301 94.9968 250.06 93.7559 248.53 93.7559C246.999 93.7559 245.758 94.9968 245.758 96.5277C245.758 98.0585 246.999 99.2995 248.53 99.2995Z" />
          <path d="M248.524 100.685C245.746 100.685 243.484 102.547 243.484 104.842C243.484 104.997 243.606 105.119 243.762 105.119H253.286C253.441 105.119 253.563 104.997 253.563 104.842C253.563 102.547 251.301 100.685 248.524 100.685Z" />
        </g>
        <rect {...panel.badge} className={styles.panelBadge} />
        <text className={styles.panelBadgeLabel} x="560.63" y="102.6" textAnchor="middle">{copy.badge}</text>
        <rect {...panel.headerLine} fill="#F2F2F2" />

        <g transform={geometry.contentTransform}>
          <g clipPath={`url(#${idPrefix}-body)`}>
            <rect {...panel.abstractNote} fill={`url(#${idPrefix}-abstract-note)`} />
            {panel.abstractLines.map((line, index) => (
              <rect key={index} {...line} fill={`url(#${idPrefix}-abstract-line-${index})`} />
            ))}
          </g>
          <path d={panel.message} fill="#F5F9FF" stroke="#E7F2FF" />
          <text className={styles.panelMessage} x="565.5" y="249.8" textAnchor="end">
            {copy.firstLine}<tspan x="565.5" y="269.8">{copy.secondLine}</tspan>
          </text>
          <g className={styles.reviewIcon} transform="translate(526 293.5)">
            <circle cx="7.6" cy="7.6" r="6.2" />
            <path d="M4.5 7.6l2.1 2.1 4.1-4.2" />
          </g>
          <text className={styles.panelReview} x="545.5" y="304.6">{copy.reviewed}</text>
        </g>
      </g>
      <rect {...panel.outline} stroke="#F2F2F2" strokeWidth=".739148" />
    </g>
  )
}

export { SurgicalPreviewPanel }
