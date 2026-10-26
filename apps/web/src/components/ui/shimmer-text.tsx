import type { ComponentPropsWithoutRef } from "react"

import { cn } from "@/lib/utils"

import styles from "./shimmer-text.module.css"

type ShimmerTextProps = ComponentPropsWithoutRef<"span"> & {
  active?: boolean
}

/** Inherits typography; animate only while an operation is pending. */
function ShimmerText({ active = true, children, className, ...props }: ShimmerTextProps) {
  return <span className={cn(active && styles.shimmer, className)} {...props}>{children}</span>
}

export { ShimmerText }
export type { ShimmerTextProps }
