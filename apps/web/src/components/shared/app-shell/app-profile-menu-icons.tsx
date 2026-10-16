import type { ComponentProps } from "react"

type ProfileMenuIconProps = ComponentProps<"svg">

function AccountMenuIcon(props: ProfileMenuIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" color="currentColor" {...props}>
      <path d="M15.5 10.5C15.5 8.567 13.933 7 12 7C10.067 7 8.5 8.567 8.5 10.5C8.5 12.433 10.067 14 12 14C13.933 14 15.5 12.433 15.5 10.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="M22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="M18 20C18 16.6863 15.3137 14 12 14C8.68629 14 6 16.6863 6 20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  )
}

function ThemeMenuIcon(props: ProfileMenuIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" color="currentColor" {...props}>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 2V4M12 20V22M4.93 4.93L6.34 6.34M17.66 17.66L19.07 19.07M2 12H4M20 12H22M4.93 19.07L6.34 17.66M17.66 6.34L19.07 4.93" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  )
}

function LanguageMenuIcon(props: ProfileMenuIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" color="currentColor" {...props}>
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 12H21.5M12 2.5C9.5 5.1 8.5 8.4 8.5 12C8.5 15.6 9.5 18.9 12 21.5M12 2.5C14.5 5.1 15.5 8.4 15.5 12C15.5 15.6 14.5 18.9 12 21.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function HelpMenuIcon(props: ProfileMenuIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" color="currentColor" {...props}>
      <path d="M12 21.5C17.2467 21.5 21.5 17.2467 21.5 12C21.5 6.75329 17.2467 2.5 12 2.5C6.75329 2.5 2.5 6.75329 2.5 12C2.5 17.2467 6.75329 21.5 12 21.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="M9.75 9.25C9.75 8.00736 10.7574 7 12 7C13.2426 7 14.25 8.00736 14.25 9.25C14.25 10.4926 13.2426 11.5 12 11.5V13" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="M12 17H12.01" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
    </svg>
  )
}

function SignOutMenuIcon(props: ProfileMenuIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" color="currentColor" {...props}>
      <path d="M19.9999 6.99974C19.923 5.58247 19.7124 4.66414 19.1363 3.96217C18.9701 3.75963 18.7844 3.57392 18.5818 3.4077C17.4755 2.49974 15.8318 2.49974 12.5443 2.49974L11.9999 2.4999C8.2287 2.4999 6.34308 2.4999 5.17151 3.67147C3.99994 4.84305 3.99994 6.72866 3.99994 10.4999V13.4999C3.99994 17.2711 3.99994 19.1568 5.17151 20.3283C6.34308 21.4999 8.2287 21.4999 11.9999 21.4999L12.5443 21.4997C15.8318 21.4997 17.4755 21.4997 18.5818 20.5918C18.7844 20.4256 18.9701 20.2399 19.1363 20.0373C19.7124 19.3353 19.923 18.417 19.9999 16.9997" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      <path d="M16 7.99991C16 7.99991 20 10.9459 20 11.9999C20 13.054 16 15.9999 16 15.9999M19.5 11.9999H9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  )
}

export { AccountMenuIcon, HelpMenuIcon, LanguageMenuIcon, SignOutMenuIcon, ThemeMenuIcon }
