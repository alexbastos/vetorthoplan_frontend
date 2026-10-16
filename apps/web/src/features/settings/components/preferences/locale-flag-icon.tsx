import type { AppLocale } from "@/i18n/config"

type LocaleFlagIconProps = {
  locale: AppLocale
}

function LocaleFlagIcon({ locale }: LocaleFlagIconProps) {
  return (
    <span aria-hidden="true" className="flex size-7 shrink-0 overflow-hidden rounded-full">
      {locale === "pt-BR" ? <BrazilFlag /> : <UnitedStatesFlag />}
    </span>
  )
}

function BrazilFlag() {
  return (
    <svg className="size-full" fill="none" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" fill="#229E45" r="16" />
      <path d="m16 5.5 11 10.5L16 26.5 5 16 16 5.5Z" fill="#FFDF00" />
      <circle cx="16" cy="16" fill="#1E4AA8" r="5.8" />
      <path d="M10.45 14.85c3.1-.72 6.7-.12 10.55 1.8" stroke="white" strokeWidth="1.15" />
    </svg>
  )
}

function UnitedStatesFlag() {
  return (
    <svg className="size-full" fill="none" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="us-flag-circle">
          <circle cx="16" cy="16" r="16" />
        </clipPath>
      </defs>
      <g clipPath="url(#us-flag-circle)">
        <rect fill="white" height="32" width="32" />
        {[2, 6, 10, 14, 18, 22, 26, 30].map((y) => <rect fill="#C83A45" height="2" key={y} width="32" y={y} />)}
        <rect fill="#315FCD" height="15" width="15" />
        <path d="m3 3 1 1.7L2 4.1h2L2.1 5.3 3 3Zm5 0 1 1.7L7 4.1h2L7.1 5.3 8 3Zm4 0 1 1.7-2-.6h2l-1.9 1.2L12 3ZM5.5 7l1 1.7-2-.6h2L4.6 9.3 5.5 7Zm5 0 1 1.7-2-.6h2L9.6 9.3l.9-2.3ZM3 11l1 1.7-2-.6h2L2.1 13.3 3 11Zm5 0 1 1.7-2-.6h2L7.1 13.3 8 11Zm4 0 1 1.7-2-.6h2l-1.9 1.2L12 11Z" fill="white" />
      </g>
    </svg>
  )
}

export { LocaleFlagIcon }
