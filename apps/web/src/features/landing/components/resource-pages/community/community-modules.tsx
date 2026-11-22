import { getTranslations } from "next-intl/server"
import type { ComponentType } from "react"

import { ResourceModules, ResourceModuleCard } from "../resource-modules"
import { ResourceSketchFrame } from "../resource-sketch-frame"
import { communityModules, type CommunityModuleId } from "./community-content"
import { ConnectionsSketch, SharedCaseSketch, DiscussionSketch } from "./sketches/community-sketches"

const moduleSketches: Record<CommunityModuleId, ComponentType> = {
  connections: ConnectionsSketch,
  cases: SharedCaseSketch,
  discussion: DiscussionSketch,
}

async function CommunityModules() {
  const t = await getTranslations("resourcePages.community.modules")

  return (
    <ResourceModules title={t("title")}
      description={t.rich("description", { strong: chunks => <strong>{chunks}</strong> })}>
      {communityModules.map(({ id, code }, index) => {
        const Sketch = moduleSketches[id]
        return (
          <ResourceModuleCard key={id} title={t(`items.${id}.title`)}
            description={t(`items.${id}.description`)} delay={index * .1}>
            <ResourceSketchFrame code={code}><Sketch /></ResourceSketchFrame>
          </ResourceModuleCard>
        )
      })}
    </ResourceModules>
  )
}

export { CommunityModules }
