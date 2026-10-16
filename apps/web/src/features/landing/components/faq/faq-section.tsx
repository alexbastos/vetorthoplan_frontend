import { getTranslations } from "next-intl/server"

import { FaqAccordion } from "./faq-accordion"
import { faqQuestionIds, type FaqContent } from "./faq-content"
import { FaqEntrance } from "./faq-entrance"
import { FaqGridDecoration } from "./faq-grid-decoration"

async function FaqSection() {
  const t = await getTranslations("landing.faq")

  const content: FaqContent = {
    intro: {
      eyebrow: t("intro.eyebrow"),
      title: t("intro.title"),
      description: t("intro.description"),
    },
    questions: Object.fromEntries(
      faqQuestionIds.map((id) => [
        id,
        {
          question: t(`questions.${id}.question`),
          answer: t(`questions.${id}.answer`),
        },
      ]),
    ) as FaqContent["questions"],
  }

  return (
    <section
      id="faq"
      aria-labelledby="landing-faq-title"
      aria-describedby="landing-faq-description"
      className="relative left-1/2 isolate w-screen -translate-x-1/2 overflow-hidden border-b border-[var(--landing-grid-border)] bg-capta-surface-card"
      data-landing-faq
    >
      <FaqEntrance>
        <FaqGridDecoration />
        <div className="relative z-10 mx-auto w-full max-w-[var(--layout-landing-max-width)] px-4 py-16 sm:px-6 sm:py-20 lg:px-16">
          <header className="mx-auto max-w-[48rem] text-center" data-landing-faq-intro>
            <p className="text-overline text-capta-text-muted">{content.intro.eyebrow}</p>
            <h2
              id="landing-faq-title"
              className="mt-4 font-heading text-heading-3 font-medium tracking-[-0.02em] text-pretty text-capta-text-primary"
            >
              {content.intro.title}
            </h2>
            <p
              id="landing-faq-description"
              className="mx-auto mt-4 max-w-[36rem] text-body text-pretty text-capta-text-secondary"
            >
              {content.intro.description}
            </p>
          </header>

          <div className="mx-auto mt-10 w-full max-w-[40rem] sm:mt-12" data-landing-faq-questions>
            <FaqAccordion questions={content.questions} />
          </div>
        </div>
      </FaqEntrance>
    </section>
  )
}

export { FaqSection }
