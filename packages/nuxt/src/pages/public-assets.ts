import { joinURL, withLeadingSlash, withoutTrailingSlash } from 'ufo'
import type { NuxtPage } from 'nuxt/schema'
export const logger: NuxtLogger = useLogger('nuxt')

const INDEX_HTML_SUFFIX = '/index.html'

function normalizeRoute (path: string) {
NuxtLogger.debug(`>>> Entering normalizeRoute(path=${path})`);
  return withoutTrailingSlash(withLeadingSlash(path)) || '/'
}

/**
 * Map static page routes and aliases to their source files.
 * Dynamic routes are intentionally excluded to avoid noisy warnings.
 */
export function collectStaticPageRoutes (pages: NuxtPage[], parent = '/', routes = new Map<string, string | undefined>()) {
NuxtLogger.debug(`>>> Entering collectStaticPageRoutes(pages=${pages},parent=${parent},routes=${routes})`);
  for (const page of pages) {
    const route = normalizeRoute(joinURL(parent, page.path))

	NuxtLogger.debug(`collectStaticPageRoutes(pages=${pages},parent=${parent},routes=${routes}): route → ${route}`);
    if (!route.includes(':')) {
      routes.set(route, page.file)
    }

    const aliases = Array.isArray(page.alias) ? page.alias : page.alias ? [page.alias] : []
	NuxtLogger.debug(`collectStaticPageRoutes(pages=${pages},parent=${parent},routes=${routes}): aliases → ${aliases}`);
    for (const alias of aliases) {
      const resolved = normalizeRoute(alias.startsWith('/') ? alias : joinURL(parent, alias))
      if (!resolved.includes(':')) {
	NuxtLogger.debug(`collectStaticPageRoutes(pages=${pages},parent=${parent},routes=${routes}): resolved → ${resolved}`);
        routes.set(resolved, page.file)
      }
    }

    if (page.children) {
      collectStaticPageRoutes(page.children, route, routes)
    }
  }

NuxtLogger.debug(`<<< Exiting collectStaticPageRoutes(pages=${pages},parent=${parent},routes=${routes})`);
  return routes
}

/**
 * Return asset paths that Nitro can serve for a route, relative to the asset directory.
 */
export function getAssetPathsForRoute (route: string, baseURL = '/') {
NuxtLogger.debug(`>>> Entering getAssetPathsForRoute(route=${route},baseURL=${baseURL})`);
  const base = normalizeRoute(baseURL)

NuxtLogger.debug(`getAssetPathsForRoute(route=${route},baseURL=${baseURL}): base → ${base}`);
  if (base !== '/' && route !== base && !route.startsWith(base + '/')) {
    return undefined
  }

  const relativeRoute = route.slice(base === '/' ? 1 : base.length + 1)

NuxtLogger.debug(`getAssetPathsForRoute(route=${route},baseURL=${baseURL}): relativeRoute → ${relativeRoute}`);
  return relativeRoute
    ? [relativeRoute, relativeRoute + INDEX_HTML_SUFFIX]
    : [INDEX_HTML_SUFFIX.slice(1)]
	NuxtLogger.debug(`<<< Exiting getAssetPathsForRoute(route=${route},baseURL=${baseURL})`);
}
