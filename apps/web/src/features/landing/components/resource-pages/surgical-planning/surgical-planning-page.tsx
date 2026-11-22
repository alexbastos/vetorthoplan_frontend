import { SurgicalPlanningFaq } from "./surgical-planning-faq"
import { SurgicalPlanningModules } from "./surgical-planning-modules"
import { SurgicalPlanningOverview } from "./surgical-planning-overview"
import { SurgicalPlanningPresentation } from "./surgical-planning-presentation"

function SurgicalPlanningPage() {
  return (
    <>
      <SurgicalPlanningPresentation />
      <SurgicalPlanningOverview />
      <SurgicalPlanningModules />
      <SurgicalPlanningFaq />
    </>
  )
}

export { SurgicalPlanningPage }
