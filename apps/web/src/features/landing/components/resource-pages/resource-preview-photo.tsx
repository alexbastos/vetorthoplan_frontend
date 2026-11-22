type PhotoRect = { x: number; y: number; width: number; height: number; rx: number }
type ResourcePreviewPhotoGeometry = {
  src: string
  bounds: PhotoRect
  clip: PhotoRect
  glow: PhotoRect
}
type ResourcePreviewNoteGeometry = {
  shape: string
  lines: readonly PhotoRect[]
}

// Shared foreground from the supplied photo/chat reference. The caller owns
// placement and image; clipping, edge lighting and the small chat note stay here.
function ResourcePreviewPhoto({ idPrefix, photo, note }: {
  idPrefix: string
  photo: ResourcePreviewPhotoGeometry
  note: ResourcePreviewNoteGeometry
}) {
  return (
    <g>
      <defs>
        <clipPath id={`${idPrefix}-photo`}><rect {...photo.clip} /></clipPath>
        <filter id={`${idPrefix}-photo-glow`} x="34.4516" y="25.5238" width="246.112" height="246.112"
          filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="4.95" />
        </filter>
        <filter id={`${idPrefix}-note-shadow`} x="12.5578" y="131.88" width="122.306" height="74.6852"
          filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="4" stdDeviation="8.85" floodColor="black" floodOpacity=".02" />
        </filter>
      </defs>
      <g clipPath={`url(#${idPrefix}-photo)`}>
        <rect {...photo.bounds} fill="white" />
        {photo.src ? <image href={photo.src} x={photo.bounds.x} y={photo.bounds.y}
          width={photo.bounds.width} height={photo.bounds.height} preserveAspectRatio="xMidYMid slice" /> : null}
        <g filter={`url(#${idPrefix}-photo-glow)`}>
          <rect {...photo.glow} stroke="white" strokeOpacity=".8" strokeWidth="10" />
        </g>
      </g>
      <path d={note.shape} fill="white" filter={`url(#${idPrefix}-note-shadow)`} />
      {note.lines.map((line, index) => <rect key={index} {...line} fill="#F2F2F2" />)}
    </g>
  )
}

export { ResourcePreviewPhoto }
