import styles from "./home-page.module.css"

function HomeCommunityBrowser({ comment }: { comment: readonly [string, string] }) {
  return (
    <svg
      aria-hidden="true"
      className={styles.communityBrowser}
      focusable="false"
      viewBox="0 0 300 292"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="8.5" y="11.5" width="291" height="269" rx="17" fill="var(--color-surface-stage)" stroke="var(--community-illustration-line)" />
      <path d="M9 50.5h290" stroke="var(--community-illustration-line)" />
      <g fill="var(--community-illustration-dot)">
        <circle cx="26" cy="31" r="3" />
        <circle cx="37" cy="31" r="3" />
        <circle cx="48" cy="31" r="3" />
      </g>
      <rect x="76" y="22" width="162" height="18" rx="9" fill="var(--color-surface-subtle)" />
      <text x="157" y="34.5" textAnchor="middle" fill="var(--color-text-muted)" fontFamily="Arial, sans-serif" fontSize="8">app.orthovet.com.br</text>

      {/* A quiet author row anchors the illustration as a conversation. */}
      <circle cx="40" cy="80" r="13" fill="var(--color-surface-subtle)" />
      <circle cx="40" cy="76" r="4" fill="var(--community-illustration-detail)" />
      <path d="M33 87a7 7 0 0 1 14 0" fill="var(--community-illustration-detail)" />
      {/* Illustrative author and comment; this is not a verified customer testimonial. */}
      <text x="62" y="78" fill="var(--community-illustration-text)" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="600">Arthur Matos</text>
      <path d="M62 87h40" stroke="var(--community-illustration-line)" strokeWidth="3" strokeLinecap="round" />
      <g fill="var(--community-illustration-detail)">
        <circle cx="244" cy="79" r="1.5" />
        <circle cx="250" cy="79" r="1.5" />
        <circle cx="256" cy="79" r="1.5" />
      </g>

      {/* One message and one inset reply, instead of a panel of skeleton bars. */}
      <path d="M42 107h216a12 12 0 0 1 12 12v57a12 12 0 0 1-12 12H65l-15 11v-11h-8a12 12 0 0 1-12-12v-57a12 12 0 0 1 12-12Z" fill="var(--color-surface-subtle)" stroke="var(--community-illustration-line)" />
      <path d="M45 129v-4c0-4 2-6 6-7v3c-2 .5-3 1.5-3 3h3v5Zm10 0v-4c0-4 2-6 6-7v3c-2 .5-3 1.5-3 3h3v5Z" fill="var(--community-illustration-detail)" />
      <text x="45" y="149" fill="var(--community-illustration-text)" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="500" letterSpacing="-.25">
        <tspan x="45">{comment[0]}</tspan>
        <tspan x="45" dy="19">{comment[1]}</tspan>
      </text>

      <path d="M42 210v19a10 10 0 0 0 10 10h11" fill="none" stroke="var(--community-illustration-line)" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="64" y="205" width="209" height="55" rx="12" fill="var(--color-surface-stage)" stroke="var(--community-illustration-line)" />
      <circle cx="85" cy="230" r="10" fill="var(--color-surface-subtle)" />
      <circle cx="85" cy="227" r="3" fill="var(--community-illustration-detail)" />
      <path d="M79.5 235a5.5 5.5 0 0 1 11 0" fill="var(--community-illustration-detail)" />
      <g strokeLinecap="round">
        <path d="M104 221h48" stroke="var(--community-illustration-detail)" strokeWidth="3" />
        <path d="M104 233h113m-113 9h82" stroke="var(--community-illustration-line)" strokeWidth="3" />
      </g>
    </svg>
  )
}

export { HomeCommunityBrowser }
