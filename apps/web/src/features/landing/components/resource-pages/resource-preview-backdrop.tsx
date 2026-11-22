type ResourcePreviewBackdropProps = { idPrefix: string }

function ResourcePreviewVeilGradient({ idPrefix }: ResourcePreviewBackdropProps) {
  return (
    <linearGradient id={`${idPrefix}-veil`} gradientUnits="userSpaceOnUse" x1="314.5" y1="261.755" x2="314.5" y2="427">
      <stop stopColor="#FFFFFF" stopOpacity="0" />
      <stop offset="1" stopColor="#FFFFFF" stopOpacity="1" />
    </linearGradient>
  )
}

// Shared SVG lighting. Keep the sky below the future foreground and the veil
// above it: the painter's order dissolves the entire lower edge into white.
function ResourcePreviewBackdrop({ idPrefix }: ResourcePreviewBackdropProps) {
  return (
    <>
      <defs>
        <linearGradient id={`${idPrefix}-sky-fill`} x1="-354.762" y1="-1269.4" x2="-95.3934" y2="879.704" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#95C5FF" />
          <stop offset="0.62175" stopColor="#2C8BFF" />
          <stop offset="0.75239" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <filter height="180%" id={`${idPrefix}-wave-blur`} width="130%" x="-15%" y="-40%">
          <feGaussianBlur stdDeviation="21.4" />
        </filter>
        <ResourcePreviewVeilGradient idPrefix={idPrefix} />
      </defs>
      <g filter={`url(#${idPrefix}-wave-blur)`}>
        <polygon points="0,0 629,0 629,427 0,427" fill={`url(#${idPrefix}-sky-fill)`} />
        <path d="M-30 211C101 41 258 78 357 167S559 239 665 75" stroke="white" strokeWidth="9.9" />
      </g>
    </>
  )
}

function ResourcePreviewVeil({ idPrefix }: ResourcePreviewBackdropProps) {
  return <rect x="0" y="258.755" width="629" height="165.245" fill={`url(#${idPrefix}-veil)`} />
}

export { ResourcePreviewBackdrop, ResourcePreviewVeil, ResourcePreviewVeilGradient }
