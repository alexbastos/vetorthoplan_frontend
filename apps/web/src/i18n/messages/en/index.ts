import aiAssistants from "./ai-assistants.json"
import auth from "./auth.json"
import cases from "./cases.json"
import common from "./common.json"
import community from "./community.json"
import dashboard from "./dashboard.json"
import errors from "./errors.json"
import home from "./home.json"
import landing from "./landing.json"
import legal from "./legal.json"
import measurementTools from "./measurement-tools.json"
import oauth from "./oauth.json"
import orthovetLanding from "./orthovet-landing.json"
import resourcePages from "./resource-pages.json"
import resourceCommunity from "./resource-community.json"
import settings from "./settings.json"
import settingsTwoFactorAuthentication from "./settings-two-factor-authentication.json"
import surgicalPlanning from "./surgical-planning.json"
import validation from "./validation.json"
import visualSimulation from "./visual-simulation.json"

const messages = {
  auth,
  cases,
  common,
  community,
  dashboard,
  errors,
  home,
  landing,
  legal,
  oauth,
  orthovetLanding,
  resourcePages: { ...resourcePages, measurementTools, surgicalPlanning, visualSimulation, aiAssistants, community: resourceCommunity },
  settings: { ...settings, ...settingsTwoFactorAuthentication },
  validation,
}

export default messages
