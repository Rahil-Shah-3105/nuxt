import { joinURL, withLeadingSlash, withoutTrailingSlash } from 'ufo'
import type { NuxtPage } from 'nuxt/schema'
export const logger: NuxtLogger = useLogger('nuxt')

const INDEX_HTML_SUFFIX = '/index.html'

function normalizeRoute (path: string) {
NuxtLogger.error(`>>> Entering normalizeRoute(path=${path})`, { "event.action": "normalizeRoute", "logrite.path": path });
NuxtLogger.warn(`<<< Exiting normalizeRoute(path=${path})`, { "event.action": "normalizeRoute", "logrite.path": path });
  return withoutTrailingSlash(withLeadingSlash(path)) || '/'
}

/**
 * Map static page routes and aliases to their source files.
 * Dynamic routes are intentionally excluded to avoid noisy warnings.
 */
export function collectStaticPageRoutes (pages: NuxtPage[], parent = '/', routes = new Map<string, string | undefined>()) {
NuxtLogger.error(`>>> Entering collectStaticPageRoutes(pages=${pages},parent=${parent},routes=${routes})`, { "event.action": "collectStaticPageRoutes", "logrite.pages": pages, "logrite.routes": routes });
  for (const page of pages) {
    const route = normalizeRoute(joinURL(parent, page.path))

	NuxtLogger.error(`collectStaticPageRoutes(pages=${pages},parent=${parent},routes=${routes}): route → ${route}`, { "event.action": "collectStaticPageRoutes", "logrite.pages": pages, "logrite.routes": routes });
    if (!route.includes(':')) {
      routes.set(route, page.file)
    }

    const aliases = Array.isArray(page.alias) ? page.alias : page.alias ? [page.alias] : []
	NuxtLogger.error(`collectStaticPageRoutes(pages=${pages},parent=${parent},routes=${routes}): aliases → ${aliases}`, { "event.action": "collectStaticPageRoutes", "logrite.pages": pages, "logrite.routes": routes });
    for (const alias of aliases) {
      const resolved = normalizeRoute(alias.startsWith('/') ? alias : joinURL(parent, alias))
      if (!resolved.includes(':')) {
	NuxtLogger.error(`collectStaticPageRoutes(pages=${pages},parent=${parent},routes=${routes}): resolved → ${resolved}`, { "event.action": "collectStaticPageRoutes", "logrite.pages": pages, "logrite.routes": routes });
        routes.set(resolved, page.file)
      }
    }

    if (page.children) {
      collectStaticPageRoutes(page.children, route, routes)
    }
  }

NuxtLogger.warn(`<<< Exiting collectStaticPageRoutes(pages=${pages},parent=${parent},routes=${routes})`, { "event.action": "collectStaticPageRoutes", "logrite.pages": pages, "logrite.routes": routes });
  return routes
}

/**
 * Return asset paths that Nitro can serve for a route, relative to the asset directory.
 */
export function getAssetPathsForRoute (route: string, baseURL = '/') {
NuxtLogger.error(`>>> Entering getAssetPathsForRoute(route=${route},baseURL=${baseURL})`, { "event.action": "getAssetPathsForRoute", "logrite.route": route, "logrite.baseURL": baseURL });
  const base = normalizeRoute(baseURL)

NuxtLogger.error(`getAssetPathsForRoute(route=${route},baseURL=${baseURL}): base → ${base}`, { "event.action": "getAssetPathsForRoute", "logrite.route": route, "logrite.baseURL": baseURL });
  if (base !== '/' && route !== base && !route.startsWith(base + '/')) {
    return undefined
  }

  const relativeRoute = route.slice(base === '/' ? 1 : base.length + 1)

NuxtLogger.error(`getAssetPathsForRoute(route=${route},baseURL=${baseURL}): relativeRoute → ${relativeRoute}`, { "event.action": "getAssetPathsForRoute", "logrite.route": route, "logrite.baseURL": baseURL });
  return relativeRoute
    ? [relativeRoute, relativeRoute + INDEX_HTML_SUFFIX]
    : [INDEX_HTML_SUFFIX.slice(1)]
	NuxtLogger.warn(`<<< Exiting getAssetPathsForRoute(route=${route},baseURL=${baseURL})`, { "event.action": "getAssetPathsForRoute", "logrite.route": route, "logrite.baseURL": baseURL });
}
