function SocialChannelIcon({ channel, className, size = 20 }: {
  channel: "instagram" | "linkedin"
  className?: string
  size?: number
}) {
  if (channel === "instagram") {
    return (
      <svg aria-hidden="true" focusable="false" className={className} fill="none" width={size} height={size} stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect height="18" rx="5" width="18" x="3" y="3" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" fill="currentColor" r="1" stroke="none" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" focusable="false" className={className} fill="currentColor" width={size} height={size} viewBox="0 0 24 24">
      <circle cx="5" cy="6" r="1.4" />
      <rect height="11" rx=".3" width="2.3" x="4" y="9" />
      <path d="M10 9h2.2v1.5c.6-1.1 1.7-1.8 3.3-1.8 2.6 0 4 1.6 4 4.4V20h-2.4v-6.5c0-1.7-.6-2.5-2-2.5-1.5 0-2.3 1-2.3 2.8V20H10V9Z" />
    </svg>
  )
}

export { SocialChannelIcon }
