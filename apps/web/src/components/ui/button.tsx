import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { LoaderCircle } from "lucide-react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button motion-interactive inline-flex shrink-0 cursor-pointer items-center justify-center rounded-[var(--button-radius)] border border-transparent bg-clip-padding text-ui-semibold whitespace-nowrap outline-none select-none focus-visible:ring-[var(--button-focus-weight)] focus-visible:ring-[var(--button-focus-color)] disabled:pointer-events-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--button-primary-background-default)] text-[var(--button-text-inverse)] hover:bg-[var(--button-primary-background-hover)] active:bg-[var(--button-primary-background-active)] disabled:bg-[var(--button-primary-background-disabled)] disabled:text-[var(--button-primary-text-disabled)]",
        secondary:
          "border-[var(--button-border-default)] bg-[var(--button-secondary-background-default)] text-[var(--button-text-default)] hover:bg-[var(--button-secondary-background-hover)] active:bg-[var(--button-secondary-background-active)] disabled:text-[var(--button-text-disabled)]",
        ghost:
          "bg-transparent text-[var(--button-text-default)] hover:bg-[var(--button-ghost-background-hover)] active:bg-[var(--button-ghost-background-active)] disabled:text-[var(--button-text-disabled)]",
        danger:
          "bg-[var(--button-danger-background-default)] text-[var(--button-text-inverse)] hover:bg-[var(--button-danger-background-hover)] active:bg-[var(--button-danger-background-active)] disabled:bg-[var(--button-danger-background-disabled)] disabled:text-[var(--button-danger-text-disabled)]",
      },
      size: {
        sm: "h-[var(--button-height-sm)] gap-[var(--button-gap-sm)] px-[var(--button-padding-inline-sm)] [&_svg:not([class*='size-'])]:size-3.5",
        md: "h-[var(--button-height-md)] gap-[var(--button-gap-md)] px-[var(--button-padding-inline-md)] [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

function Button({
  className,
  variant = "primary",
  size = "md",
  asChild = false,
  children,
  disabled,
  loading = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
          {children}
        </>
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
