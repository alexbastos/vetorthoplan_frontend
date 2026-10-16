import Link from "next/link"
import { getTranslations } from "next-intl/server"
import type { ReactNode } from "react"

import type { AppLocale } from "@/i18n/config"

import { legalNavigation, type LegalDocumentId } from "../data/legal-navigation"
import styles from "./legal-page.module.css"

type LegalDocumentShellProps = {
  children?: ReactNode
  document: LegalDocumentId
  language?: AppLocale
  lastUpdated?: string
  title?: string
}

async function LegalDocumentShell({ children, document, language, lastUpdated, title }: LegalDocumentShellProps) {
  const t = await getTranslations("legal")

  return (
    <div className={styles.documentGrid} data-legal-document-shell={document}>
      <aside className="min-w-0 self-stretch">
        <nav aria-label={t("navigationLabel")} className="lg:sticky lg:top-8">
          <ul className="flex flex-col gap-1" role="list">
            {legalNavigation.map(({ id, href }) => (
              <li key={id}>
                <Link
                  aria-current={document === id ? "page" : undefined}
                  className={styles.documentLink}
                  href={href}
                >
                  {t(`documents.${id}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <article
        aria-labelledby="legal-document-title"
        className="min-w-0 max-w-[48rem] outline-none"
        data-legal-document-content
        id="legal-document"
        lang={language}
        tabIndex={-1}
      >
        {title ? (
          <header className="mb-10">
            <h1 className="text-heading-3 font-medium text-balance" id="legal-document-title">{title}</h1>
            {lastUpdated ? <p className="mt-3 text-body text-capta-text-secondary">{lastUpdated}</p> : null}
          </header>
        ) : (
          <h1 className="sr-only" id="legal-document-title">{t(`documents.${document}`)}</h1>
        )}
        {children}
      </article>
    </div>
  )
}

export { LegalDocumentShell }
