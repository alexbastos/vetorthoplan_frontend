import { ResourcePreviewPhoto } from "../resource-preview-photo"
import { surgicalPreviewGeometry as geometry } from "./surgical-preview-geometry"

function SurgicalPreviewPhoto({ idPrefix }: { idPrefix: string }) {
  const { photo, note } = geometry

  return <ResourcePreviewPhoto idPrefix={idPrefix} photo={photo} note={note} />
}

export { SurgicalPreviewPhoto }
