import type { LegalContentBlock } from "../data/legal-document-content"
import styles from "./legal-page.module.css"

type LegalDocumentBodyProps = {
  blocks: readonly LegalContentBlock[]
}

function LegalDocumentBody({ blocks }: LegalDocumentBodyProps) {
  return (
    <div className={`${styles.documentBody} text-body`}>
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading":
            return block.level === 2
              ? <h2 key={index}>{block.text}</h2>
              : <h3 key={index}>{block.text}</h3>
          case "paragraph":
            return <p key={index}>{block.text}</p>
          case "list":
            return (
              <ul key={index}>
                {block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}
              </ul>
            )
          case "definitions":
            return (
              <dl key={index}>
                {block.items.map(({ term, description }) => (
                  <div key={term}>
                    <dt>{term}</dt>{" "}<dd>{description}</dd>
                  </div>
                ))}
              </dl>
            )
          case "table":
            return (
              <div className={styles.documentTable} key={index}>
                <table>
                  <thead>
                    <tr>
                      {block.headers.map((header) => <th key={header} scope="col">{header}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          case "callout": {
            const separator = block.text.indexOf(".") + 1
            return (
              <div className={styles.documentCallout} key={index}>
                <p><strong>{block.text.slice(0, separator)}</strong>{block.text.slice(separator)}</p>
              </div>
            )
          }
          case "review": {
            const separator = block.text.indexOf(":") + 1
            return (
              <aside className={styles.documentReview} key={index}>
                <p><strong>{block.text.slice(0, separator)}</strong>{block.text.slice(separator)}</p>
              </aside>
            )
          }
        }
      })}
    </div>
  )
}

export { LegalDocumentBody }
