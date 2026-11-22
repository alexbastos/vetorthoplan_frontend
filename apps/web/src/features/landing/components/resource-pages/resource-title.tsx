import { Fragment } from "react"

import styles from "./resource-pages.module.css"

// Keep complete words together while revealing their decorative characters.
// The accessible title remains a single uninterrupted string.
function ResourceTitle({ children, as: Heading = "h1", className = styles.title, id }: {
  children: string
  as?: "h1" | "h2"
  className?: string
  id?: string
}) {
  return (
    <Heading className={className} id={id} data-resource-heading>
      <span className="sr-only">{children}</span>
      <span aria-hidden="true">
        {children.split(" ").map((word, wordIndex) => (
          <Fragment key={`${word}-${wordIndex}`}>
            {wordIndex > 0 ? " " : null}
            <span className={styles.titleWord}>
              {Array.from(word).map((character, index) => (
                <span className={styles.titleCharacter} data-char="true" data-ch={character}
                  key={index}>
                  {character}
                </span>
              ))}
            </span>
          </Fragment>
        ))}
      </span>
    </Heading>
  )
}

export { ResourceTitle }
