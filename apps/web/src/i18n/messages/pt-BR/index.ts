import auth from "./auth.json"
import cases from "./cases.json"
import common from "./common.json"
import dashboard from "./dashboard.json"
import errors from "./errors.json"
import home from "./home.json"
import landing from "./landing.json"
import legal from "./legal.json"
import oauth from "./oauth.json"
import orthovetLanding from "./orthovet-landing.json"
import settings from "./settings.json"
import settingsTwoFactorAuthentication from "./settings-two-factor-authentication.json"
import validation from "./validation.json"

const messages = {
  auth,
  cases,
  common,
  dashboard,
  errors,
  home,
  landing,
  legal,
  oauth,
  orthovetLanding,
  settings: { ...settings, ...settingsTwoFactorAuthentication },
  validation,
}

export default messages
