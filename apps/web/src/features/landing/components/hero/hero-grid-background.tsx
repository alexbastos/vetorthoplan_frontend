type HeroGridPatternProps = {
  className: string
  patternId: string
}

function HeroGridPattern({ className, patternId }: HeroGridPatternProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      height="100%"
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id={patternId} width="60" height="60" x="-1" y="0" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="transparent" stroke="currentColor" strokeWidth="2" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  )
}

function HeroGridBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-[calc(100vw-2px)] -translate-x-1/2 overflow-hidden opacity-100 [mask-composite:intersect] [mask-image:linear-gradient(transparent,black),radial-gradient(130%_50%_at_50%_100%,transparent,black)]"
    >
      <HeroGridPattern
        patternId="hero-grid-pattern"
        className="absolute bottom-0 left-1/2 h-[600px] w-[var(--layout-landing-max-width)] -translate-x-1/2 text-[var(--landing-grid-line)]"
      />
      <HeroGridPattern
        patternId="hero-grid-pattern-left"
        className="absolute right-[calc(50%+var(--layout-landing-half-width))] bottom-0 hidden h-[600px] w-[360px] text-[var(--landing-grid-line)] 2xl:block [mask-image:linear-gradient(90deg,transparent,black)]"
      />
      <HeroGridPattern
        patternId="hero-grid-pattern-right"
        className="absolute bottom-0 left-[calc(50%+var(--layout-landing-half-width))] hidden h-[600px] w-[360px] text-[var(--landing-grid-line)] 2xl:block [mask-image:linear-gradient(270deg,transparent,black)]"
      />
    </div>
  )
}

export { HeroGridBackground }
