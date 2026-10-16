import styles from "./platform-section.module.css"

function PlatformPrecisionIllustration() {
  return (
    <svg aria-hidden="true" className={styles.illustration} fill="none" focusable="false" viewBox="0 0 396 235">
      <defs>
        <linearGradient id="precision-scene-fade" x1="0" x2="0" y1="153" y2="199" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#000000" />
        </linearGradient>
        <mask id="precision-scene-mask" width="396" height="235" maskUnits="userSpaceOnUse" x="0" y="0">
          <rect fill="url(#precision-scene-fade)" height="235" width="396" />
        </mask>
        <clipPath id="precision-image-clip">
          <rect height="139" rx="10" width="194" x="101" y="48" />
        </clipPath>
        <filter id="precision-frame-shadow" width="300" height="230" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" x="48" y="8">
          <feDropShadow dx="0" dy="10" floodColor="#59616B" floodOpacity=".07" stdDeviation="12" />
        </filter>
        <filter id="precision-toolbar-shadow" width="112" height="190" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" x="38" y="35">
          <feDropShadow dx="0" dy="9" floodColor="#59616B" floodOpacity=".09" stdDeviation="10" />
        </filter>
      </defs>

      <g transform="translate(12 0)">
        <g mask="url(#precision-scene-mask)">
          <g className={styles.precisionFrame} filter="url(#precision-frame-shadow)">
            <rect fill="#FFFFFF" height="169" rx="17.5" stroke="#ECEFF2" width="219" x="88.5" y="27.5" />
            <rect fill="#E3E8EC" height="4" rx="2" width="46" x="103" y="37" />
            <rect fill="#F6F8F9" height="139" rx="10" stroke="#EDF0F2" width="194" x="101" y="48" />
          </g>

          <g className={styles.precisionAnatomy} clipPath="url(#precision-image-clip)">
            <image height="145" href="/images/landing/knee_bones_platform.svg" width="83" x="162" y="43" />
          </g>

          <g className={styles.precisionAngleField}>
            <path d="M190 109 173 100 A19 19 0 0 1 197 91Z" fill="#DDEBFA" fillOpacity=".55" />
            <circle cx="190" cy="109" r="19" stroke="#92B6DD" strokeDasharray="1.5 3.5" strokeWidth="1.2" />
          </g>

          <path className={styles.precisionAxis} d="M135 80 260 145" stroke="#8BBBE8" strokeLinecap="round" strokeWidth="1.6" />
          <path className={styles.precisionPlateau} d="M166 168 210 59" stroke="#70A9E1" strokeLinecap="round" strokeWidth="1.6" />
          <path className={styles.precisionAngle} d="M173 100 A19 19 0 0 1 197 91" stroke="#4288FF" strokeLinecap="round" strokeWidth="1.8" />

          <g className={styles.precisionPoints}>
            <circle cx="135" cy="80" fill="#F6F8F9" r="3.4" stroke="#8BBBE8" strokeWidth="1.4" />
            <circle cx="260" cy="145" fill="#F6F8F9" r="3.4" stroke="#8BBBE8" strokeWidth="1.4" />
            <circle cx="210" cy="59" fill="#F6F8F9" r="3.4" stroke="#70A9E1" strokeWidth="1.4" />
          </g>
        </g>

        <g className={styles.precisionToolbar} filter="url(#precision-toolbar-shadow)">
          <g transform="translate(18 19) scale(.84)">
            <rect fill="#FFFFFF" height="140" rx="12" stroke="#E9EEF2" width="44" x="72" y="52" />
            <path d="m87 74 14-12" stroke="#8293A2" strokeLinecap="round" strokeWidth="1.5" />
            <circle cx="87" cy="74" fill="#8293A2" r="1.7" />
            <circle cx="101" cy="62" fill="#8293A2" r="1.7" />

            <rect fill="#EDF5FF" height="28" rx="9" width="32" x="78" y="82" />
            <path d="M85 103h18m-18 0 12-12" stroke="#4288FF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
            <path d="M92 103a7 7 0 0 0-2-5" stroke="#4288FF" strokeLinecap="round" strokeWidth="1.3" />

            <circle cx="94" cy="124" r="7" stroke="#8293A2" strokeWidth="1.5" />
            <path d="M86 152h16m-8-8v16" stroke="#8293A2" strokeLinecap="round" strokeWidth="1.5" />
            <circle cx="86" cy="152" fill="#8293A2" r="1.5" />
            <circle cx="102" cy="152" fill="#8293A2" r="1.5" />
            <path d="m87 184 14-14m-5 0h5v5" stroke="#8293A2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          </g>
        </g>
      </g>
    </svg>
  )
}

export { PlatformPrecisionIllustration }
