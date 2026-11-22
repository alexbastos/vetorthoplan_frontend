"use client"

import { Clock3, Plus } from "lucide-react"
import Link from "next/link"
import type { KeyboardEventHandler, PointerEventHandler, Ref } from "react"

import type { CapabilityContent } from "./capabilities-content"
import { CapabilityMedia } from "./capability-media"
import styles from "./capabilities-accordion.module.css"

type CapabilityCardProps = {
  item: CapabilityContent
  number: string
  instanceId: string
  active: boolean
  desktop: boolean
  onSelect: () => void
  onPointerEnter: PointerEventHandler<HTMLElement>
  onKeyDown: KeyboardEventHandler<HTMLElement>
  cardRef: Ref<HTMLLIElement>
  triggerRef: Ref<HTMLButtonElement>
}

function CapabilityActionArrow() {
  return (
    <svg aria-hidden="true" width="14" height="14" fill="currentColor" viewBox="0 0 256 256">
      <path d="M204,64V168a12,12,0,0,1-24,0V93L72.49,200.49a12,12,0,0,1-17-17L163,76H88a12,12,0,0,1,0-24H192A12,12,0,0,1,204,64Z" />
    </svg>
  )
}

function CapabilityCard({ item, number, instanceId, active, desktop, onSelect, onPointerEnter, onKeyDown, cardRef, triggerRef }: CapabilityCardProps) {
  const triggerId = `${instanceId}-${item.id}-trigger`, panelId = `${instanceId}-${item.id}-panel`, titleId = `${instanceId}-${item.id}-title`
  const accessibleTitle = item.comingSoon ? `${item.title}, ${item.comingSoon}` : item.title
  return (
    <li aria-label={accessibleTitle} className={styles.card} data-active={active} onPointerEnter={onPointerEnter}
      onFocus={event => { if (desktop && event.target === event.currentTarget) onSelect() }}
      onKeyDown={desktop ? onKeyDown : undefined} onPointerDown={event => { if (desktop && event.pointerType === "touch") onSelect() }}
      ref={cardRef} tabIndex={desktop ? 0 : undefined}>
      <CapabilityMedia image={item.image} />
      <span aria-hidden="true" className={styles.collapsedRail}>
        <span className={styles.number} title={item.comingSoon}>
          {number}{item.comingSoon ? <Clock3 size={12} strokeWidth={1.5} /> : null}
        </span>
        <span className={styles.collapsedTitle}>{item.title}</span>
      </span>
      <h3 className={styles.mobileHeading}>
        <button aria-controls={panelId} aria-expanded={active} className={styles.trigger} id={triggerId}
          onClick={onSelect} onKeyDown={!desktop ? onKeyDown : undefined} ref={triggerRef} type="button">
          <span className="sr-only">{accessibleTitle}</span>
          <span aria-hidden="true" className={styles.number} title={item.comingSoon}>
            {number}{item.comingSoon ? <Clock3 size={12} strokeWidth={1.5} /> : null}
          </span>
          <span aria-hidden="true" className={styles.mobileTitle}>{item.title}</span>
          <Plus aria-hidden="true" className={styles.plus} size={20} strokeWidth={1.5} />
        </button>
      </h3>
      <div aria-hidden={!active} aria-labelledby={desktop ? titleId : triggerId} className={styles.details} id={panelId} inert={!active} role="region">
        <div className={styles.desktopHeading}>
          <h3 className={styles.expandedTitle} id={titleId}>{item.title}</h3>
        </div>
        <div className={styles.contentBody}>
          {item.comingSoon ? <span className={styles.availability}>{item.comingSoon}</span> : null}
          <p className={styles.cardDescription}>{item.description}</p>
          <div className={styles.cardFooter}>
            <span className={styles.caption}>{item.caption}</span>
            {item.href ? (
              <Link className={styles.cardAction} href={item.href}>
                {item.actionLabel}<CapabilityActionArrow />
              </Link>
            ) : (
              <button className={styles.cardAction} disabled type="button">
                {item.actionLabel}<CapabilityActionArrow />
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

export { CapabilityCard }
