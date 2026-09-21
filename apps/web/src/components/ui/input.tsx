import * as React from "react"

import { cn } from "@/lib/utils"

type InputProps = React.ComponentPropsWithoutRef<"input"> & {
  leadingIcon?: React.ReactNode
  trailingIcon?: React.ReactNode
  wrapperClassName?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      wrapperClassName,
      leadingIcon,
      trailingIcon,
      type,
      disabled,
      ...props
    },
    ref
  ) => {
    const isInvalid = props["aria-invalid"] === true || props["aria-invalid"] === "true"

    return (
      <div
        data-slot="input"
        className={cn(
          "motion-interactive flex h-[var(--input-height)] w-full items-center gap-[var(--input-gap)] rounded-[var(--input-radius)] border bg-[var(--input-surface-default)] px-[var(--input-padding-inline)] py-[var(--input-padding-block)]",
          isInvalid
            ? "border-[var(--input-border-error)]"
            : "border-[var(--input-border-default)] focus-within:border-[var(--input-border-focus)]",
          disabled && "bg-[var(--input-surface-disabled)]",
          wrapperClassName
        )}
      >
        {leadingIcon ? (
          <span data-slot="input-leading-icon" aria-hidden="true" className="size-4 shrink-0 [&_svg]:size-4">
            {leadingIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          type={type}
          disabled={disabled}
          data-slot="input-control"
          className={cn(
            "min-w-0 flex-1 bg-transparent text-ui text-[var(--input-text)] outline-none placeholder:text-[var(--input-placeholder)] disabled:cursor-not-allowed disabled:text-[var(--input-text-disabled)] disabled:placeholder:text-[var(--input-text-disabled)]",
            className
          )}
          {...props}
        />
        {trailingIcon ? (
          <span data-slot="input-trailing-icon" className="flex size-7 shrink-0 items-center justify-center [&_svg]:size-4">
            {trailingIcon}
          </span>
        ) : null}
      </div>
    )
  }
)

Input.displayName = "Input"

export { Input }
