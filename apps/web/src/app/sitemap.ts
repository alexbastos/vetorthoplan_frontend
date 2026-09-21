import type { MetadataRoute } from "next"

import { getCanonicalUrl, getIndexablePublicRoutes } from "@/lib/seo/public-routes"

export default function sitemap(): MetadataRoute.Sitemap {
  return getIndexablePublicRoutes().map((route) => ({
    url: getCanonicalUrl(route.pathname).toString(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}
