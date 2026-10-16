import type { HomeShortcut } from "../types"

const homeShortcuts: HomeShortcut[] = [
  {
    href: "/app/editais",
    image: "/images/home/img_background_card_home_1.avif",
    imageDark: "/images/home/img_background_card_home_1_dark_mode.avif",
    imageAltKey: "grantsImageAlt",
    titleKey: "grants",
  },
  {
    href: "/app/troni",
    image: "/images/home/img_background_card_home_2.avif",
    imageDark: "/images/home/img_background_card_home_2_dark_mode.avif",
    imageAltKey: "troniImageAlt",
    titleKey: "troni",
  },
  {
    href: "/app/alertas",
    image: "/images/home/img_background_card_home_3.avif",
    imageDark: "/images/home/img_background_card_home_3_dark_mode.avif",
    imageAltKey: "alertsImageAlt",
    titleKey: "alerts",
  },
]

export { homeShortcuts }
