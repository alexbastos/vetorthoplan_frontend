import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

import styles from "./orthovet-loader-text.module.css"

export interface OrthoVetLoaderTextProps {
  children: ReactNode
  className?: string
  loading?: boolean
}

function normalizeLoadingLabel(children: ReactNode) {
  if (typeof children !== "string") {
    return children
  }

  return children.replace(/(?:\.{3}|…)[\s]*$/u, "")
}

export function OrthoVetLoaderText({
  children,
  className,
  loading = true,
}: OrthoVetLoaderTextProps) {
  const label = loading ? normalizeLoadingLabel(children) : children

  return (
    <span className={cn(styles.root, loading && styles.loading, className)}>
      <span className={styles.label}>{label}</span>
      {loading ? <OrthoVetLoadingDots /> : null}
    </span>
  )
}

function OrthoVetLoadingDots() {
  return (
    <svg
      aria-hidden="true"
      className={styles.dots}
      fill="none"
      viewBox="0 0 18 6"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle className={styles.dot} cx="3" cy="3" r="1.25" />
      <circle className={styles.dot} cx="9" cy="3" r="1.25" />
      <circle className={styles.dot} cx="15" cy="3" r="1.25" />
    </svg>
  )
}
