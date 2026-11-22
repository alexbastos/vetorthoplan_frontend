import { MeasurementToolsFaq } from "./measurement-tools-faq"
import { MeasurementToolsModules } from "./measurement-tools-modules"
import { MeasurementToolsOverview } from "./measurement-tools-overview"
import { MeasurementToolsPresentation } from "./measurement-tools-presentation"

// Keep each section independent while the page's visuals are built in stages.
function MeasurementToolsPage() {
  return (
    <>
      <MeasurementToolsPresentation />
      <MeasurementToolsOverview />
      <MeasurementToolsModules />
      <MeasurementToolsFaq />
    </>
  )
}

export { MeasurementToolsPage }
