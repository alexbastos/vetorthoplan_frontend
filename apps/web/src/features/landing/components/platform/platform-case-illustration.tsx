import styles from "./platform-section.module.css"

function PlatformCaseIllustration() {
  return (
    <svg aria-hidden="true" className={styles.illustration} fill="none" focusable="false" viewBox="0 0 396 235">
      <defs>
        <linearGradient id="case-film" x1="33" x2="163" y1="88" y2="185" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F3F5F6" />
          <stop offset="1" stopColor="#ECEFF1" />
        </linearGradient>
        <linearGradient id="case-bone" x1="64" x2="105" y1="97" y2="180" gradientUnits="userSpaceOnUse">
          <stop stopColor="#BFC8D0" stopOpacity=".62" />
          <stop offset="1" stopColor="#D2D8DE" stopOpacity=".3" />
        </linearGradient>
        <linearGradient id="case-bottom-fade" x1="0" x2="0" y1="0" y2="235" gradientUnits="userSpaceOnUse">
          <stop offset=".73" stopColor="#FFFFFF" />
          <stop offset=".97" stopColor="#000000" />
        </linearGradient>
        <mask id="case-illustration-mask" width="396" height="235" maskUnits="userSpaceOnUse" x="0" y="0">
          <rect fill="url(#case-bottom-fade)" height="235" width="396" />
        </mask>
        <linearGradient id="case-radiograph-fade" x1="0" x2="0" y1="80" y2="207" gradientUnits="userSpaceOnUse">
          <stop offset=".38" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#000000" />
        </linearGradient>
        <mask id="case-radiograph-mask" width="200" height="235" maskUnits="userSpaceOnUse" x="0" y="0">
          <rect fill="url(#case-radiograph-fade)" height="235" width="200" />
        </mask>
        <filter id="case-soft-shadow" width="396" height="235" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" x="0" y="0">
          <feDropShadow dx="0" dy="8" floodColor="#59616B" floodOpacity=".055" stdDeviation="11" />
        </filter>
        <filter id="case-front-shadow" width="396" height="235" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" x="0" y="0">
          <feDropShadow dx="0" dy="13" floodColor="#59616B" floodOpacity=".07" stdDeviation="14" />
        </filter>
        <clipPath id="case-film-clip">
          <rect height="98" rx="11" width="132" x="32" y="88" />
        </clipPath>
      </defs>

      <g mask="url(#case-illustration-mask)">
        <g className={styles.caseRadiograph} filter="url(#case-soft-shadow)" mask="url(#case-radiograph-mask)">
          <rect fill="#FFFFFF" height="133" rx="17.5" stroke="#EBEEF1" width="158" x="18.5" y="68.5" />
          <rect fill="url(#case-film)" height="98" rx="11" width="132" x="32" y="88" />
          <g clipPath="url(#case-film-clip)">
            <circle cx="101" cy="132" fill="#FFFFFF" opacity=".18" r="48" />
            <path d="M66 97c11 2 19 10 22 21l6 23c2 9 1 18-4 25l-5 10-15-6 4-11c2-6 2-12 0-18l-8-25c-2-6-5-11-9-15l9-4Z" fill="url(#case-bone)" />
            <path d="M100 99c10 1 17 7 20 16l8 24c2 7 5 14 10 19l-8 11c-9-5-14-13-17-22l-8-24c-2-5-5-8-10-10l5-14Z" fill="#C4CCD3" opacity=".46" />
            <path d="M63 108c10 3 17 11 19 21l6 25M106 107c8 3 12 9 15 18l9 27" opacity=".72" stroke="#F8FBFF" strokeLinecap="round" strokeWidth="3" />
            <path d="M69 137h27" stroke="#88B7EF" strokeLinecap="round" strokeWidth="1.6" />
            <path d="M69 132v10m27-10v10m-20-8v6m7-5v5m7-6v6" stroke="#88B7EF" strokeLinecap="round" strokeWidth="1.3" />
            <circle cx="69" cy="137" fill="#88B7EF" r="2" />
            <circle cx="96" cy="137" fill="#88B7EF" r="2" />
          </g>
          <rect fill="#E2E7EC" height="4" rx="2" width="41" x="32" y="78" />
          <circle cx="155" cy="80" fill="#E4E8EC" r="2" />
        </g>

        <g className={styles.caseSheet} filter="url(#case-front-shadow)">
          <rect fill="#FFFFFF" height="169" rx="18.5" stroke="#ECEFF2" width="219" x="130.5" y="27.5" />
          <rect fill="#E6EAEE" height="7" rx="3.5" width="58" x="147" y="44" />
          <rect fill="#F4F6F8" height="40" rx="12" width="40" x="148" y="78" />
          <circle cx="158.5" cy="91.5" fill="#A4C8F1" r="3" />
          <circle cx="165" cy="87.5" fill="#A4C8F1" r="3.1" />
          <circle cx="172.5" cy="87.5" fill="#A4C8F1" r="3.1" />
          <circle cx="179" cy="91.5" fill="#A4C8F1" r="3" />
          <path d="M168.7 96c-3.6 0-5.4 3.8-8.5 6.8-2.2 2.2-2.4 5.1-.6 6.8 2.1 2 5 .8 9.1.8 4.1 0 7 1.2 9.1-.8 1.8-1.7 1.6-4.6-.6-6.8-3.1-3-4.9-6.8-8.5-6.8Z" fill="#88B7EF" />
          <rect fill="#D7DDE3" height="7" rx="3.5" width="99" x="201" y="81" />
          <rect fill="#E8ECEF" height="6" rx="3" width="72" x="201" y="95" />
          <rect fill="#EDF0F2" height="5" rx="2.5" width="52" x="201" y="108" />
          <rect fill="#FAFBFC" height="44" rx="10.5" stroke="#EBEEF1" width="181" x="148.5" y="133.5" />
          <rect fill="#EFF2F4" height="29" rx="6" width="31" x="158" y="141" />
          <path d="M164 162c5-13 11-16 18-11M166 165c6-7 11-8 16-7" opacity=".9" stroke="#CBD3DB" strokeLinecap="round" strokeWidth="2.5" />
          <rect fill="#DDE3E8" height="6" rx="3" width="69" x="200" y="144" />
          <rect fill="#E9EDF0" height="5" rx="2.5" width="48" x="200" y="156" />
          <circle cx="311" cy="155" fill="#F0F2F4" r="9" />
          <path d="M307 155h8m-4-4v8" stroke="#C3CBD3" strokeLinecap="round" strokeWidth="1.5" />
        </g>

        <g className={styles.caseNote} filter="url(#case-soft-shadow)">
          <rect fill="#FFFFFF" height="76" rx="14.5" stroke="#ECEFF2" width="114" x="264.5" y="121.5" />
          <rect fill="#DEE4E9" height="5" rx="2.5" width="24" x="278" y="136" />
          <rect fill="#E5E9ED" height="5" rx="2.5" width="75" x="278" y="150" />
          <rect fill="#EDF0F2" height="5" rx="2.5" width="61" x="278" y="161" />
          <path d="M279 181c7-7 9 4 16-2 4-4 7-5 11-1 4 3 8 2 12-1" stroke="#88B7EF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </g>

        <g className={styles.caseSignal}>
          <circle className={styles.caseSignalHalo} cx="322" cy="78" fill="#E9F3FF" r="8" />
          <circle cx="322" cy="78" fill="#4288FF" r="3.5" />
        </g>
      </g>
    </svg>
  )
}

export { PlatformCaseIllustration }
