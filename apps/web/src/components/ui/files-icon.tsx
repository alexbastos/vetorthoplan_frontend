import type { ComponentProps } from "react"

function FilesIcon(props: ComponentProps<"svg">) {
  return (
    <svg fill="none" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M6.5 5.25H5A2.75 2.75 0 0 0 2.25 8v11A2.75 2.75 0 0 0 5 21.75h10A2.75 2.75 0 0 0 17.75 19v-.5h-1.5v.5c0 .69-.56 1.25-1.25 1.25H5c-.69 0-1.25-.56-1.25-1.25V8c0-.69.56-1.25 1.25-1.25h1.5v-1.5Z"
        fill="currentColor"
      />
      <path
        clipRule="evenodd"
        d="M10 1.75A2.75 2.75 0 0 0 7.25 4.5V15A2.75 2.75 0 0 0 10 17.75h9A2.75 2.75 0 0 0 21.75 15V8.33c0-.73-.29-1.43-.81-1.95l-3.32-3.82a2.75 2.75 0 0 0-1.95-.81H10Zm5.25 1.5v3c0 .83.67 1.5 1.5 1.5h3.13l-4.1-4.5h-.53ZM10.5 10a.75.75 0 0 0 0 1.5h7a.75.75 0 0 0 0-1.5h-7Zm0 3a.75.75 0 0 0 0 1.5H15a.75.75 0 0 0 0-1.5h-4.5Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  )
}

export { FilesIcon }
