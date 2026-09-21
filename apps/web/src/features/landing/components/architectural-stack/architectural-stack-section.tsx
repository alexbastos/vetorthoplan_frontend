import { getTranslations } from "next-intl/server"

import {
  architecturalStackLayerIds,
  architecturalStackSourceDefinitions,
  architecturalStackStoryIds,
  type ArchitecturalStackContent,
} from "./architectural-stack-content"
import { ArchitecturalStackModule } from "./architectural-stack-module"

async function ArchitecturalStackSection() {
  const t = await getTranslations("landing.architecturalStack")

  const content: ArchitecturalStackContent = {
    diagram: {
      accessibleDescription: t("diagram.accessibleDescription"),
      layers: Object.fromEntries(
        architecturalStackLayerIds.map((id) => [
          id,
          {
            description: t(`diagram.layers.${id}.description`),
            title: t(`diagram.layers.${id}.title`),
          },
        ]),
      ) as ArchitecturalStackContent["diagram"]["layers"],
      sourceGroupLabel: t("diagram.sourceGroupLabel"),
      sourceLabels: Object.fromEntries(
        architecturalStackSourceDefinitions.map(({ id }) => [id, t(`diagram.sourceLabels.${id}`)]),
      ) as ArchitecturalStackContent["diagram"]["sourceLabels"],
      sourceStatusLabels: {
        expanding: t("diagram.sourceStatusLabels.expanding"),
        initial: t("diagram.sourceStatusLabels.initial"),
      },
    },
    intro: {
      description: t("intro.description"),
      eyebrow: t("intro.eyebrow"),
      title: t("intro.title"),
    },
    stories: Object.fromEntries(
      architecturalStackStoryIds.map((id) => [
        id,
        {
          description: t(`stories.${id}.description`),
          eyebrow: t(`stories.${id}.eyebrow`),
          title: t(`stories.${id}.title`),
        },
      ]),
    ) as ArchitecturalStackContent["stories"],
  }

  return (
    <section
      id="como-funciona"
      aria-labelledby="architectural-stack-title"
      className="relative left-1/2 isolate w-screen -translate-x-1/2 border-y border-border bg-card"
      data-architectural-stack
    >
      <ArchitecturalStackModule content={content} />
    </section>
  )
}

export { ArchitecturalStackSection }
