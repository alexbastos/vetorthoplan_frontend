import styles from "./platform-section.module.css"

// Coordinates match the cropped SVG; the bone clip keeps every screw inside its silhouette.
const screwPaths = [
  "M32.8 7.65 42.4 6.7",
  "M34.4 13.7 41.9 13.14",
  "M34.2 20 42.1 19.41",
  "M33.8 26.3 42.4 25.66",
  "M33.3 32.6 42.7 31.9",
  "M32.8 38.9 43 38.14",
  "M32.3 45.2 43.3 44.38",
] as const

function PlatformReviewIllustration() {
  return (
    <svg aria-hidden="true" className={styles.illustration} fill="none" focusable="false" viewBox="0 0 396 235">
      <defs>
        <linearGradient id="review-scene-fade" x1="0" x2="0" y1="151" y2="205" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#000000" />
        </linearGradient>
        <mask id="review-scene-mask" width="396" height="235" maskUnits="userSpaceOnUse" x="0" y="0">
          <rect fill="url(#review-scene-fade)" height="235" width="396" />
        </mask>
        <clipPath id="review-image-clip">
          <rect height="130" rx="11" width="187" x="104" y="57" />
        </clipPath>
        <clipPath id="review-bone-screw-clip" clipPathUnits="userSpaceOnUse">
          <path d="m30 46.53c1.65-4.54 3.65-12.21 4.31-21.97 0.53-7.99 0.44-20.23-0.42-24.26h9.22c-0.46 1.33-0.74 2.8-0.79 4.28 0.27 11.94 1.6 34.09 1.8 44.31l-4.21 0.14-3.15-2.06-5.68 0.52-1.08-0.96z" />
        </clipPath>
        <filter id="review-frame-shadow" width="330" height="230" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" x="43" y="5">
          <feDropShadow dx="0" dy="10" floodColor="#59616B" floodOpacity=".065" stdDeviation="12" />
        </filter>
        <filter id="review-report-shadow" width="150" height="126" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" x="231" y="82">
          <feDropShadow dx="0" dy="8" floodColor="#59616B" floodOpacity=".075" stdDeviation="10" />
        </filter>
      </defs>

      <g mask="url(#review-scene-mask)">
        <g className={styles.reviewFrame} filter="url(#review-frame-shadow)">
          <rect fill="#FFFFFF" height="169" rx="17.5" stroke="#ECEFF2" width="219" x="88.5" y="27.5" />
          <rect fill="#E3E8EC" height="5" rx="2.5" width="49" x="105" y="42" />
          <rect fill="#F6F8F9" height="130" rx="11" stroke="#EDF0F2" width="187" x="104" y="57" />
          <path d="M119 166h157M119 76h24" stroke="#E8EDF0" strokeLinecap="round" strokeWidth="1.2" />
        </g>

        <g className={styles.reviewAnatomy} clipPath="url(#review-image-clip)">
          <image height="155" href="/images/landing/knee_bones_implant_platform.svg" width="58" x="169" y="53" />
        </g>

        <g className={styles.reviewImplant} clipPath="url(#review-image-clip)">
          <image height="155" href="/images/landing/knee_bones_implant_hardware_platform.svg" width="58" x="169" y="53" />
        </g>

        <g clipPath="url(#review-image-clip)">
          <g transform="translate(169 53) scale(2.15) translate(-25 1)">
            <g clipPath="url(#review-bone-screw-clip)">
              {screwPaths.map((path, index) => (
                <g className={styles.reviewScrew} key={path} style={{ animationDelay: `${1020 + index * 85}ms` }}>
                  <path d={path} stroke="#8F9EAA" strokeLinecap="round" strokeWidth="1.15" />
                  <path d={path} stroke="#F5F8FA" strokeLinecap="round" strokeWidth=".8" />
                </g>
              ))}
            </g>
          </g>
        </g>

        <g className={styles.reviewVersion}>
          <rect fill="#FFFFFF" height="23" rx="8" stroke="#E8EDF1" width="49" x="245" y="39" />
          <circle cx="257" cy="50.5" fill="#E2E7EB" r="3" />
          <path d="M260 50.5h7" stroke="#D6DEE5" strokeLinecap="round" strokeWidth="1.5" />
          <circle cx="270" cy="50.5" fill="#4288FF" r="3" />
          <path d="M280 50h5" stroke="#B7C9DE" strokeLinecap="round" strokeWidth="2" />
        </g>

        <g className={styles.reviewReport} filter="url(#review-report-shadow)">
          <rect fill="#FFFFFF" height="80" rx="14" stroke="#E9EEF2" width="106" x="257" y="105" />
          <path d="M273 123h42" stroke="#DDE5EB" strokeLinecap="round" strokeWidth="5" />
          <path d="M273 138h57M273 149h42" stroke="#E6EBEF" strokeLinecap="round" strokeWidth="4.5" />
          <path d="M274 166h18" stroke="#D6E0E8" strokeLinecap="round" strokeWidth="1.5" />
          <circle cx="342" cy="162" fill="#F1F6FC" r="10" />
          <path d="m337 162 3 3 6-7" stroke="#4288FF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </g>
      </g>
    </svg>
  )
}

export { PlatformReviewIllustration }
