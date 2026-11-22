import { getTranslations } from "next-intl/server"

import { ResourcePreviewBackdrop, ResourcePreviewVeil } from "../resource-preview-backdrop"
import { resourcePreviewFonts } from "../resource-preview-fonts"
import { ResourcePreviewPhoto } from "../resource-preview-photo"
import { communityPreviewGeometry as geometry } from "./community-preview-geometry"
import { CommunityPreviewPlatform } from "./community-preview-platform"
import styles from "./community-preview.module.css"

async function CommunityPreview() {
  const t = await getTranslations("resourcePages.community.preview")
  const idPrefix = "community-preview"

  return (
    <article className={`${styles.frame} ${resourcePreviewFonts}`} aria-labelledby="community-preview-title">
      <div className={styles.visual} aria-hidden="true">
        <svg className={styles.artwork} fill="none" viewBox="0 0 629 427">
          <ResourcePreviewBackdrop idPrefix={idPrefix} />
          <CommunityPreviewPlatform idPrefix={idPrefix} />
          <g transform={geometry.photoTransform}>
            <ResourcePreviewPhoto idPrefix={idPrefix} photo={geometry.photo} note={geometry.note} />
          </g>
          <ResourcePreviewVeil idPrefix={idPrefix} />
        </svg>
      </div>
      <div className={styles.copy}>
        <h2 id="community-preview-title">{t("title")}</h2>
        <p>{t("description")}</p>
      </div>
    </article>
  )
}

export { CommunityPreview }
