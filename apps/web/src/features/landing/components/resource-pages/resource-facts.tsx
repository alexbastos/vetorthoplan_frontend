import styles from "./resource-pages.module.css"

type ResourceFact = { id: string; label: string; value: string }

function ResourceFacts({ items, note }: { items: readonly ResourceFact[]; note: string }) {
  return (
    <div className={styles.factsBlock} data-resource-facts>
      <dl className={styles.facts}>
        {items.map(item => (
          <div className={styles.fact} key={item.id}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.factsNote}>{note}</p>
    </div>
  )
}

export { ResourceFacts }
