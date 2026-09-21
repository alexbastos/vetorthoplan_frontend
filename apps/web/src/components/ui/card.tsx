import * as React from "react"

import { cn } from "@/lib/utils"

type CardVariant = "base" | "header" | "footer"

type CardProps = React.ComponentProps<"div"> & {
  variant?: CardVariant
}

function Card({ className, variant = "base", ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      className={cn(
        "group/card flex w-full flex-col overflow-hidden border border-[var(--card-composite-border)]",
        "data-[variant=base]:gap-[var(--card-base-gap)] data-[variant=base]:rounded-[var(--card-base-radius)] data-[variant=base]:bg-[var(--color-surface-card)] data-[variant=base]:p-[var(--card-base-padding)] data-[variant=base]:shadow-[var(--card-base-shadow)]",
        "data-[variant=header]:gap-0 data-[variant=header]:rounded-[var(--card-composite-radius)] data-[variant=header]:bg-[var(--card-composite-surface)]",
        "data-[variant=footer]:gap-0 data-[variant=footer]:rounded-[var(--card-base-radius)] data-[variant=footer]:bg-[var(--card-composite-surface)] data-[variant=footer]:shadow-[var(--card-composite-shadow-footer)]",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "flex w-full items-start gap-[var(--space-1)]",
        "group-data-[variant=header]/card:min-h-[var(--card-header-min-height)] group-data-[variant=header]/card:items-center group-data-[variant=header]/card:justify-between group-data-[variant=header]/card:bg-[var(--color-surface-raised)] group-data-[variant=header]/card:px-[var(--card-composite-padding-inline)] group-data-[variant=header]/card:py-[var(--card-header-padding-block)] group-data-[variant=header]/card:text-ui group-data-[variant=header]/card:text-[var(--card-header-text)]",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-semibold text-ui text-[var(--color-text-primary)] group-data-[variant=header]/card:text-ui",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-ui text-[var(--card-header-text)]", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("shrink-0 self-start group-data-[variant=header]/card:self-center", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        "w-full",
        "group-data-[variant=header]/card:flex group-data-[variant=header]/card:flex-col group-data-[variant=header]/card:gap-[var(--card-header-main-gap)] group-data-[variant=header]/card:border-t group-data-[variant=header]/card:bg-[var(--color-surface-card)] group-data-[variant=header]/card:px-[var(--card-composite-padding-inline)] group-data-[variant=header]/card:pb-[var(--card-header-main-padding-bottom)] group-data-[variant=header]/card:pt-[var(--card-header-main-padding-top)]",
        "group-data-[variant=footer]/card:flex group-data-[variant=footer]/card:flex-col group-data-[variant=footer]/card:gap-[var(--card-footer-main-gap)] group-data-[variant=footer]/card:border-b group-data-[variant=footer]/card:bg-[var(--color-surface-card)] group-data-[variant=footer]/card:px-[var(--card-composite-padding-inline)] group-data-[variant=footer]/card:pb-[var(--card-footer-main-padding-bottom)] group-data-[variant=footer]/card:pt-[var(--card-footer-main-padding-top)]",
        className
      )}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex w-full items-center",
        "group-data-[variant=footer]/card:min-h-[var(--card-footer-min-height)] group-data-[variant=footer]/card:bg-[var(--color-surface-raised)] group-data-[variant=footer]/card:px-[var(--card-composite-padding-inline)] group-data-[variant=footer]/card:py-[var(--card-footer-padding-block)] group-data-[variant=footer]/card:text-ui group-data-[variant=footer]/card:text-[var(--card-header-text)]",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
}
export type { CardProps, CardVariant }
