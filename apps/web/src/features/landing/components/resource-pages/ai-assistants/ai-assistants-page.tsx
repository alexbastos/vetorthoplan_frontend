import { AiAssistantsFaq } from "./ai-assistants-faq"
import { AiAssistantsModules } from "./ai-assistants-modules"
import { AiAssistantsOverview } from "./ai-assistants-overview"
import { AiAssistantsPresentation } from "./ai-assistants-presentation"

function AiAssistantsPage() {
  return (
    <>
      <AiAssistantsPresentation />
      <AiAssistantsOverview />
      <AiAssistantsModules />
      <AiAssistantsFaq />
    </>
  )
}

export { AiAssistantsPage }
