import type { AppLocale } from "./config"
import type messages from "./messages/pt-BR"

declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale
    Messages: typeof messages
  }
}
