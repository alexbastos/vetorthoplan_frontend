"use client"

import { Popover, Tooltip as TooltipPrimitive } from "radix-ui"
import { useId, type ComponentProps, type ReactElement } from "react"

import { cn } from "@/lib/utils"

import styles from "./tooltip.module.css"

type TooltipTheme = "auto" | "light" | "dark"

type TooltipContentProps = ComponentProps<typeof TooltipPrimitive.Content> & {
  portalContainer?: ComponentProps<typeof TooltipPrimitive.Portal>["container"]
  theme?: TooltipTheme
}

type TooltipHintProps = Omit<TooltipContentProps, "children" | "content"> & {
  children: ReactElement
  content: string
  delayDuration?: number
}

type DismissibleTooltipContentProps = ComponentProps<typeof Popover.Content> & {
  closeLabel: string
  theme?: TooltipTheme
}

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger
const DismissibleTooltip = Popover.Root
const DismissibleTooltipTrigger = Popover.Trigger

const contentClassName = cn(
  styles.content,
  "relative z-50 flex w-max items-start gap-2 rounded-sm p-3 font-sans text-sm/5 font-normal",
)

// Radix positions the body. The Figma arrow extends 6px beyond its edge.
const arrowLength = 6

function TooltipContent({
  children,
  className,
  collisionPadding = 8,
  portalContainer,
  sideOffset = 4,
  theme = "auto",
  ...props
}: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal container={portalContainer}>
      <TooltipPrimitive.Content
        {...props}
        className={cn(contentClassName, className)}
        collisionPadding={collisionPadding}
        data-slot="tooltip-content"
        data-theme={theme}
        sideOffset={sideOffset + arrowLength}
      >
        {children}
        <span aria-hidden="true" className={styles.arrow} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

function TooltipHint({ children, content, delayDuration, ...props }: TooltipHintProps) {
  return (
    <TooltipProvider delayDuration={delayDuration} skipDelayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent {...props}>{content}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function DismissibleTooltipContent({
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  children,
  className,
  closeLabel,
  collisionPadding = 8,
  sideOffset = 4,
  theme = "auto",
  ...props
}: DismissibleTooltipContentProps) {
  const labelId = useId()

  return (
    <Popover.Portal>
      <Popover.Content
        {...props}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy ?? (ariaLabel ? undefined : labelId)}
        className={cn(contentClassName, className)}
        collisionPadding={collisionPadding}
        data-slot="dismissible-tooltip-content"
        data-theme={theme}
        sideOffset={sideOffset + arrowLength}
      >
        <span id={labelId}>{children}</span>
        <Popover.Close
          aria-label={closeLabel}
          className={cn(styles.close, "size-5 shrink-0 cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2")}
          type="button"
        />
        <span aria-hidden="true" className={styles.arrow} />
      </Popover.Content>
    </Popover.Portal>
  )
}

export {
  DismissibleTooltip,
  DismissibleTooltipContent,
  DismissibleTooltipTrigger,
  Tooltip,
  TooltipContent,
  TooltipHint,
  TooltipProvider,
  TooltipTrigger,
}
