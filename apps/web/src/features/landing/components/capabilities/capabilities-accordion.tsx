"use client"

import { useId } from "react"

import { CapabilityCard } from "./capability-card"
import type { CapabilityContent } from "./capabilities-content"
import { useCapabilitiesAccordion } from "./use-capabilities-accordion"
import styles from "./capabilities-accordion.module.css"

function CapabilitiesAccordion({ items, label }: { items: readonly CapabilityContent[]; label: string }) {
  const instanceId = useId()
  const { activeId, desktop, select, pointerEnter, keyDown, registerTrigger, registerCard } = useCapabilitiesAccordion(items)

  return (
    <ul aria-label={label} className={styles.accordion} role="list">
      {items.map((item, index) => (
        <CapabilityCard active={activeId === item.id} desktop={desktop} instanceId={instanceId} item={item} key={item.id}
          number={String(index + 1).padStart(2, "0")} onKeyDown={event => keyDown(event, index)}
          onPointerEnter={event => pointerEnter(event, item.id)} onSelect={() => select(item.id)}
          cardRef={element => registerCard(index, element)} triggerRef={element => registerTrigger(index, element)} />
      ))}
    </ul>
  )
}

export { CapabilitiesAccordion }
