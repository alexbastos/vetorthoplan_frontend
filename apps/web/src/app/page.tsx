import type { Metadata } from "next"

import { LandingPage } from "@/features/landing"
import { getCanonicalUrl } from "@/lib/seo/public-routes"

export function generateMetadata(): Metadata {
  return {
    alternates: { canonical: getCanonicalUrl("/") },
    robots: { follow: false, index: false },
  }
}

export default function Home() {
  return <LandingPage />
}
