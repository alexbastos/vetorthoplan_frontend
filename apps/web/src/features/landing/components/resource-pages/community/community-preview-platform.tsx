import { communityPreviewGeometry as geometry } from "./community-preview-geometry"

function CommunityPreviewPlatform({ idPrefix }: { idPrefix: string }) {
  const { panel, screen, screenSrc } = geometry

  return (
    <g>
      <defs>
        <clipPath id={`${idPrefix}-screen`}><rect {...screen} /></clipPath>
        <filter id={`${idPrefix}-panel-shadow`} x="-20%" y="-30%" width="140%" height="180%" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="6.6" stdDeviation="6.6" floodOpacity=".04" />
        </filter>
      </defs>
      <rect {...panel} fill="white" stroke="#e5e5e5" strokeWidth="1.65" filter={`url(#${idPrefix}-panel-shadow)`} />
      <g clipPath={`url(#${idPrefix}-screen)`}>
        <rect {...screen} fill="white" />
        <image href={screenSrc} x={screen.x} y={screen.y} width={screen.width} height={screen.height}
          preserveAspectRatio="xMinYMin meet" />
      </g>
    </g>
  )
}

export { CommunityPreviewPlatform }
