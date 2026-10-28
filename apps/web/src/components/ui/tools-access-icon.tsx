import type { ComponentProps } from "react"

function ToolsAccessIcon(props: ComponentProps<"svg">) {
  return (
    <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
      viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="m14.7 6.3 3 3 3.4-3.4a5.7 5.7 0 0 1-7.2 7.2l-7.7 7.7a2.1 2.1 0 0 1-3-3l7.7-7.7a5.7 5.7 0 0 1 7.2-7.2l-3.4 3.4Z" />
      <path d="m4.1 3.1 3.6 1.2 2 3.6M3.1 4.1l1.2 3.6 3.6 2M14.8 15.8l4.1 4.1a1.4 1.4 0 0 0 2-2l-4.1-4.1" />
    </svg>
  )
}

export { ToolsAccessIcon }
