import auth from "./auth.json"
import common from "./common.json"
import dashboard from "./dashboard.json"
import errors from "./errors.json"
import home from "./home.json"
import landing from "./landing.json"
import oauth from "./oauth.json"
import settings from "./settings.json"
import settingsTwoFactorAuthentication from "./settings-two-factor-authentication.json"
import validation from "./validation.json"

const messages = {
  auth,
  common,
  dashboard,
  errors,
  home,
  landing,
  oauth,
  settings: { ...settings, ...settingsTwoFactorAuthentication },
  validation,
}

export default messages
