import { getTranslations } from "next-intl/server"

import { ResourceSketchMotion } from "../../sketches/resource-sketch-motion"
import { ConnectionsScene } from "./connections-scene"
import { SharedCaseScene } from "./shared-case-scene"
import { DiscussionScene } from "./discussion-scene"

async function ConnectionsSketch() {
  const t = await getTranslations("resourcePages.community.modules.items.connections.sketch")
  return <ResourceSketchMotion><ConnectionsScene label={t("label")} /></ResourceSketchMotion>
}

async function SharedCaseSketch() {
  const t = await getTranslations("resourcePages.community.modules.items.cases.sketch")
  return <ResourceSketchMotion><SharedCaseScene label={t("label")} /></ResourceSketchMotion>
}

async function DiscussionSketch() {
  const t = await getTranslations("resourcePages.community.modules.items.discussion.sketch")
  return <ResourceSketchMotion><DiscussionScene label={t("label")} /></ResourceSketchMotion>
}

export { ConnectionsSketch, SharedCaseSketch, DiscussionSketch }
