"use client"

import { MousePointer2, Pointer } from "lucide-react"
import { motion } from "motion/react"

import { useHeroDemo } from "./hero-product-motion"
import styles from "./hero-product-motion.module.css"

function HeroProductCursor() {
  const { state, values } = useHeroDemo()
  const { x, y, scale, opacity } = values.cursor
  return (
    <motion.div className={styles.cursor} data-hero-cursor data-pointer={state.hand ? "hand" : "arrow"} style={{ x, y, scale, opacity }}>
      <MousePointer2 aria-hidden="true" className={styles.arrow} fill="white" size={22} stroke="#171719" strokeWidth={1.5} />
      <Pointer aria-hidden="true" className={styles.hand} fill="white" size={22} stroke="#171719" strokeWidth={1.5} />
    </motion.div>
  )
}

export { HeroProductCursor }
