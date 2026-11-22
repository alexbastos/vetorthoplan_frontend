import { Fragment } from "react"

import styles from "./hero-section.module.css"

// Same character markup as resource headings, with intact words for line wrapping.
function HeroTitleCharacters({ children }: { children: string }) {
  return children.split(" ").map((word, wordIndex) => (
    <Fragment key={`${word}-${wordIndex}`}>
      {wordIndex > 0 ? " " : null}
      <span className={styles.titleWord}>
        {Array.from(word).map((character, index) => (
          <span className={styles.titleCharacter} data-char="true" key={index}>{character}</span>
        ))}
      </span>
    </Fragment>
  ))
}

export { HeroTitleCharacters }
