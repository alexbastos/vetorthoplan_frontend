import { VisualSimulationFaq } from "./visual-simulation-faq"
import { VisualSimulationModules } from "./visual-simulation-modules"
import { VisualSimulationOverview } from "./visual-simulation-overview"
import { VisualSimulationPresentation } from "./visual-simulation-presentation"

function VisualSimulationPage() {
  return (
    <>
      <VisualSimulationPresentation />
      <VisualSimulationOverview />
      <VisualSimulationModules />
      <VisualSimulationFaq />
    </>
  )
}

export { VisualSimulationPage }
