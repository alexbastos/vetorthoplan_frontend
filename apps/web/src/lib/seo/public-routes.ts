import type { MetadataRoute } from "next"

import { getServerEnvironment } from "@/lib/server/environment"

type IndexablePublicRoute = {
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]
  pathname: `/${string}` | "/"
  priority: number
}

/**
 * Fonte Ãºnica das rotas de conteÃºdo que podem ser encontradas em buscadores.
 *
 * O produto ainda nÃ£o possui uma pÃ¡gina institucional pronta para publicaÃ§Ã£o.
 * Por isso, a lista comeÃ§a vazia: fluxos de autenticaÃ§Ã£o, rotas autenticadas e
 * pÃ¡ginas provisÃ³rias nunca devem ser incluÃ­dos acidentalmente no sitemap.
 * Cada pÃ¡gina pÃºblica de conteÃºdo entra nesta lista na mesma entrega em que
 * estiver pronta para indexaÃ§Ã£o.
 */
const indexablePublicRoutes: readonly IndexablePublicRoute[] = []

function getCanonicalUrl(pathname: IndexablePublicRoute["pathname"]) {
  return new URL(pathname, getServerEnvironment().appOrigin)
}

function getIndexablePublicRoutes() {
  return indexablePublicRoutes
}

export { getCanonicalUrl, getIndexablePublicRoutes }
export type { IndexablePublicRoute }
