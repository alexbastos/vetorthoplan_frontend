type FaqGridVolumeProps = {
  className: string
  side: "left" | "right"
  patternId: string
}

// A fixed multi-tone tile avoids uniform stripes and stays identical on every render.
const dotOpacities = [
  0.35, 0.8, 0.5, 0.95,
  0.65, 0.45, 1, 0.6,
  0.9, 0.55, 0.3, 0.75,
  0.5, 0.95, 0.7, 0.4,
] as const

function FaqGridVolume({ className, patternId, side }: FaqGridVolumeProps) {
  const fill = `url(#${patternId})`

  return (
    <svg
      aria-hidden="true"
      className={className}
      data-landing-faq-decoration-volume={side}
      focusable="false"
      viewBox="0 0 360 400"
      width="360"
      height="400"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id={patternId} width="28" height="28" patternUnits="userSpaceOnUse">
          {dotOpacities.map((opacity, index) => (
            <circle
              key={index}
              cx={3.5 + (index % 4) * 7}
              cy={3.5 + Math.floor(index / 4) * 7}
              r="1.1"
              fill="currentColor"
              opacity={opacity}
            />
          ))}
        </pattern>
      </defs>

      {/* Transform the dot grid with each face, retaining the isometric projection. */}
      <g transform="matrix(0.844444 0.488889 -0.844444 0.488889 180 30)" opacity="0.75">
        <path
          d="M 0 0 H 180 V 180 H 0 Z M 36 36 H 144 V 144 H 36 Z"
          fill={fill}
          fillRule="evenodd"
        />
      </g>
      <g transform="matrix(0.844444 0.488889 0 0.888889 28 118)" opacity="0.85">
        <rect width="180" height="180" fill={fill} />
      </g>
      <g transform="matrix(0.844444 -0.488889 0 0.888889 180 206)">
        <rect width="180" height="180" fill={fill} />
      </g>
    </svg>
  )
}

function FaqGridDecoration() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden text-capta-text-muted/75 lg:block"
      data-landing-faq-decoration
    >
      <FaqGridVolume
        className="absolute top-8 left-0 h-auto w-[clamp(14rem,23vw,25rem)] -translate-x-1/4"
        patternId="landing-faq-grid-left"
        side="left"
      />
      <FaqGridVolume
        className="absolute right-0 bottom-8 h-auto w-[clamp(14rem,23vw,25rem)] translate-x-1/4"
        patternId="landing-faq-grid-right"
        side="right"
      />
    </div>
  )
}

export { FaqGridDecoration }
