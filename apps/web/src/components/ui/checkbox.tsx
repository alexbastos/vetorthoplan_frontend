"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { CheckIcon } from "lucide-react"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer motion-interactive group/checkbox relative flex size-[var(--checkbox-size)] shrink-0 items-center justify-center rounded-[var(--checkbox-radius)] border-[var(--checkbox-border-width-default)] border-[var(--checkbox-border-default)] bg-[var(--checkbox-surface-default)] text-[var(--checkbox-icon)] outline-none after:absolute after:-inset-x-3 after:-inset-y-2 hover:border hover:border-[var(--checkbox-border-hover)] focus-visible:border focus-visible:border-[var(--checkbox-border-focus)] disabled:cursor-not-allowed disabled:border disabled:border-[var(--checkbox-border-disabled)] disabled:opacity-100 data-[state=checked]:border data-[state=checked]:border-[var(--checkbox-surface-checked)] data-[state=checked]:bg-[var(--checkbox-surface-checked)] data-[state=indeterminate]:border data-[state=indeterminate]:border-[var(--checkbox-surface-checked)] data-[state=indeterminate]:bg-[var(--checkbox-surface-checked)] hover:data-[state=checked]:border-[var(--checkbox-surface-hover)] hover:data-[state=checked]:bg-[var(--checkbox-surface-hover)] hover:data-[state=indeterminate]:border-[var(--checkbox-surface-hover)] hover:data-[state=indeterminate]:bg-[var(--checkbox-surface-hover)] focus-visible:data-[state=checked]:border-white focus-visible:data-[state=indeterminate]:border-white disabled:data-[state=checked]:border-[var(--checkbox-surface-disabled)] disabled:data-[state=checked]:bg-[var(--checkbox-surface-disabled)] disabled:data-[state=indeterminate]:border-[var(--checkbox-surface-disabled)] disabled:data-[state=indeterminate]:bg-[var(--checkbox-surface-disabled)]",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3"
      >
        <CheckIcon className="group-data-[state=indeterminate]/checkbox:hidden" />
        <span
          aria-hidden="true"
          className="hidden h-0.5 w-2 rounded-full bg-current group-data-[state=indeterminate]/checkbox:block"
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
