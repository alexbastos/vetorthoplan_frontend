import { surgicalPreviewGeometry as geometry } from "./surgical-preview-geometry"

function SurgicalPreviewDefs({ idPrefix }: { idPrefix: string }) {
  return (
    <defs>
      <clipPath id={`${idPrefix}-viewport`}><rect {...geometry.viewport} /></clipPath>
      <clipPath id={`${idPrefix}-panel`}><rect {...geometry.panel.inner} /></clipPath>
      <clipPath id={`${idPrefix}-avatar`}><rect {...geometry.panel.avatarClip} /></clipPath>
      <clipPath id={`${idPrefix}-body`}><rect {...geometry.panel.bodyClip} /></clipPath>

      <linearGradient id={`${idPrefix}-abstract-note`} x1="403.141" y1="177.656" x2="244.662" y2="179.011" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F2F2F2" /><stop offset="1" stopColor="white" />
      </linearGradient>
      <linearGradient id={`${idPrefix}-abstract-line-0`} x1="384.289" y1="164.54" x2="238.637" y2="170.676" gradientUnits="userSpaceOnUse">
        <stop stopColor="#E3E3E3" /><stop offset="1" stopColor="white" />
      </linearGradient>
      <linearGradient id={`${idPrefix}-abstract-line-1`} x1="331.472" y1="184.368" x2="235.052" y2="187.054" gradientUnits="userSpaceOnUse">
        <stop stopColor="#E3E3E3" /><stop offset="1" stopColor="white" />
      </linearGradient>
      <linearGradient id={`${idPrefix}-panel-veil`} x1="408.66" y1="303" x2="408.66" y2="427" gradientUnits="userSpaceOnUse">
        <stop stopColor="white" stopOpacity="0" /><stop offset="1" stopColor="white" />
      </linearGradient>
    </defs>
  )
}

export { SurgicalPreviewDefs }
