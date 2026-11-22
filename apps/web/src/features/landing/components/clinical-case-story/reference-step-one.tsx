import Image from "next/image"
import { useTranslations } from "next-intl"

import styles from "./reference-step-one.module.css";
// Preserve the reference geometry and animation while presenting Orthovet cases.
type ReferenceStepOneLabels = {
    search: string
    activeStatus: string
    draftStatus: string
    completedStatus: string
    casesTab: string
    professionalsTab: string
}

function ReferenceStepOne({ labels }: { labels: ReferenceStepOneLabels }) {
    const t = useTranslations("orthovetLanding.clinicalCaseStory.stepOneCards")
    const readCard = (key: "cases.luna" | "cases.toti" | "professionals.marcos" | "professionals.marina"): StepOneCard => ({
      name: t(`items.${key}.name`),
      subtitle: t(`items.${key}.subtitle`),
      primary: t(`items.${key}.primary`),
      unit: t(`items.${key}.unit`),
      status: t(`items.${key}.status`),
      description: [t(`items.${key}.descriptionLine1`), t(`items.${key}.descriptionLine2`)],
      chips: [t(`items.${key}.chip1`), t(`items.${key}.chip2`), t(`items.${key}.chip3`)],
    })
    const cards: StepOneCards = { cases: [readCard("cases.luna"), readCard("cases.toti")], professionals: [readCard("professionals.marcos"), readCard("professionals.marina")] }

    return (<div className={styles.root}>
    <div className={styles.stage}>
    <div className={styles.searchBar}>
    <svg className={styles.magnifier} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="6.6" cy="6.6" r="5.3" stroke="currentColor" strokeWidth="1.7">
    </circle>
    <path d="M10.6 10.6 15 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    </path>
    </svg>
    <span className={styles.typed}>
    <span className={styles.ch}>L</span>
    <span className={styles.ch + " " + styles.c1}>u</span>
    <span className={styles.ch + " " + styles.c2}>n</span>
    <span className={styles.ch + " " + styles.c3}>a</span>
    </span>
    <span className={styles.caret}>
    </span>
    <span className={styles.searchBtn}>{labels.search}</span>
    </div>
    <div className={styles.segCtl}>
    <span className={styles.seg + " " + styles.segCoaching}>{labels.activeStatus}</span>
    <span className={styles.segPill}>
    </span>
    <span className={styles.seg + " " + styles.segHiring}>{labels.draftStatus}</span>
    <span className={styles.seg + " " + styles.segWork}>{labels.completedStatus}</span>
    </div>
    <div className={styles.tabRule}>
    </div>
    <span className={styles.tab + " " + styles.tabExperts}>{labels.casesTab}</span>
    <span className={styles.tab + " " + styles.tabRoles}>{labels.professionalsTab}</span>
    <div className={styles.tabGlow}>
    </div>
    <div className={styles.tabUnderline}>
    </div>
    <div className={styles.skeleton + " " + styles.sk0}>
    </div>
    <div className={styles.skeleton + " " + styles.sk1}>
    </div>
      <CardStack kind="cases" cards={cards.cases} />
      <CardStack kind="professionals" cards={cards.professionals} />
    </div>
  </div>)
}

type StepOneCard = {
  name: string
  subtitle: string
  primary: string
  unit: string
  description: [string, string]
  chips: [string, string, string]
  status?: string
}
type StepOneCards = { cases: [StepOneCard, StepOneCard]; professionals: [StepOneCard, StepOneCard] }

const caseAvatars = ["/images/landing/3422243535333125.avif", "/images/landing/3422243535333124.avif"]
const professionalAvatars = ["/images/landing/img_doutor_hero.avif", "/images/community/4523365212332.avif"]

function CardStack({ kind, cards }: { kind: "cases" | "professionals"; cards: [StepOneCard, StepOneCard] }) {
  const professional = kind === "professionals"
  return (
    <div className={styles.stack + " " + (professional ? styles.stackRoles : styles.stackExperts)}>
      {[false, true].map((blurred) => (
        <div key={String(blurred)} className={blurred ? styles.blurred : styles.sharp} aria-hidden={blurred || undefined}>
          {cards.map((card, index) => (
            <div key={card.name} className={[styles.card, professional ? styles.cardRole : styles.cardExpert, professional ? (index === 0 ? styles.ro0 : styles.ro1) : (index === 0 ? styles.ex0 : styles.ex1)].join(" ")}>
              <span className={professional ? styles.logo : styles.avatar}>
                <Image alt="" src={(professional ? professionalAvatars : caseAvatars)[index]} width={70} height={70} />
              </span>
              <span className={styles.name + (professional ? " " + styles.nameRole : "")}>{card.name}</span>
              {professional ? (
                <span className={styles.desc + " " + styles.descRole}>{card.subtitle}</span>
              ) : (
                <span className={styles.role}>{card.subtitle}</span>
              )}
              <span className={styles.rate + (professional ? " " + styles.rateRole : "")}>{card.primary}<span className={styles.unit}>{card.unit}</span></span>
              {!professional && <>
                <span className={styles.desc + " " + styles.descA}>{card.description[0]}</span>
                <span className={styles.desc + " " + styles.descB}>{card.description[1]}</span>
                <span className={styles.rating}><span className={styles.statusDot} /><span className={styles.ratingText}>{card.status}</span></span>
              </>}
              {card.chips.map((chip, chipIndex) => (
                <span key={chipIndex} className={styles.chip} style={{ left: "calc(" + [16.4, 124.6, 206.8][chipIndex] + " * var(--u))", top: "calc(" + (professional ? 94.6 : 141.1) + " * var(--u))", width: "calc(" + [97.2, 71.2, 98.2][chipIndex] + " * var(--u))" }}>{chip}</span>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export { ReferenceStepOne }
