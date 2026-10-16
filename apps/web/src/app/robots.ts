import type { MetadataRoute } from "next"

import { getCanonicalUrl } from "@/lib/seo/public-routes"

export default function robots(): MetadataRoute.Robots {
  return {
    host: getCanonicalUrl("/").origin,
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/app",
        "/app/",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
      ],
    },
    sitemap: getCanonicalUrl("/sitemap.xml").toString(),
  }
}
