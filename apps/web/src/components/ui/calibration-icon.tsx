import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"
import styles from "./calibration-icon.module.css"

function CalibrationIcon({ className, ...props }: ComponentProps<"span">) {
  return <span className={cn(styles.icon, className)} {...props} />
}

export { CalibrationIcon }
