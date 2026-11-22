import { measurementPreviewGeometry as geometry } from "./measurement-preview-geometry"
import styles from "./measurement-tools-preview.module.css"

const tools = ["distance", "angle", "circle"] as const
type Tool = typeof tools[number]
type MeasurementToolsPanelCopy = {
  title: string; tools: Record<Tool, string>; measurement: string; value: string; unit: string
  pointsLabel: string; points: string; scaleLabel: string; calibrated: string; confirm: string
}

function MeasurementToolIcon({ tool }: { tool: Tool }) {
  if (tool === "circle") return <circle cx="6" cy="6" r="4.3" />
  if (tool === "angle") return <path d="M1 10H11M1 10L10 2M5 10A4 4 0 0 0 3.8 7.2" />
  return <path d="M1 6H11M1 6L3.5 3.5M1 6L3.5 8.5M11 6L8.5 3.5M11 6L8.5 8.5" />
}

function MeasurementPreviewToolsPanel({ copy, idPrefix }: { copy: MeasurementToolsPanelCopy; idPrefix: string }) {
  return (
    <g>
      <defs>
        <filter id={`${idPrefix}-tools-shadow`} x="-20%" y="-25%" width="140%" height="160%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#172b4d" floodOpacity=".09" />
        </filter>
      </defs>
      <rect {...geometry.panel} fill="white" stroke="#e6e9ef" filter={`url(#${idPrefix}-tools-shadow)`} />
      <text className={styles.panelTitle} x="309" y="112">{copy.title}</text>
      <g stroke="#9ca3af" strokeWidth="1" strokeLinecap="round">
        <path d="M564 107H572M568 103V111" />
      </g>

      <rect x="305" y="128" width="268" height="36" rx="9" fill="#f6f8fb" stroke="#edf0f4" />
      {tools.map((tool, index) => {
        const x = 309 + index * 88
        const active = index === 0
        return (
          <g key={tool}>
            {active ? <rect x={x} y="132" width="84" height="28" rx="7" fill="white" stroke="#e1ecff" /> : null}
            <g transform={`translate(${x + 9} 140)`} stroke={active ? "#3686ff" : "#7d8592"}
              fill="none" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round">
              <MeasurementToolIcon tool={tool} />
            </g>
            <text className={styles.toolLabel} x={x + 27} y="149.5" fill={active ? "#3686ff" : "#7d8592"}>{copy.tools[tool]}</text>
          </g>
        )
      })}

      <text className={styles.fieldLabel} x="309" y="185">{copy.measurement}</text>
      <text className={styles.measurementValue} x="309" y="219">
        {copy.value}<tspan dx="6" className={styles.measurementUnit}>{copy.unit}</tspan>
      </text>
      <path d={`M309 ${geometry.detailsDividerY}H573`} stroke="#edf0f4" />
      <text className={styles.fieldLabel} x="309" y="253">{copy.pointsLabel}</text>
      <text className={styles.fieldValue} x="573" y="253" textAnchor="end">{copy.points}</text>
      <text className={styles.fieldLabel} x="309" y="273">{copy.scaleLabel}</text>
      <circle cx="521" cy="270" r="2.2" fill="#6ba88c" />
      <text className={styles.fieldValue} x="573" y="273" textAnchor="end">{copy.calibrated}</text>

      {/* Decorative confirmation, ready for a later choreography rather than a live control. */}
      <rect x="309" y="288" width="264" height="26" rx="13" fill="#171719" />
      <path d="M384 300.5l2.5 2.5l4.5 -5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <text className={styles.confirmLabel} x="447" y="304" textAnchor="middle">{copy.confirm}</text>
    </g>
  )
}

export { MeasurementPreviewToolsPanel }
