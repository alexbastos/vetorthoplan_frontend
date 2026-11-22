import { CommunityFaq } from "./community-faq"
import { CommunityModules } from "./community-modules"
import { CommunityOverview } from "./community-overview"
import { CommunityPresentation } from "./community-presentation"

function CommunityResourcePage() {
  return (
    <>
      <CommunityPresentation />
      <CommunityOverview />
      <CommunityModules />
      <CommunityFaq />
    </>
  )
}

export { CommunityResourcePage }
