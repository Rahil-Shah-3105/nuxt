import type { RouteRecordRaw } from 'vue-router'
import { joinURL } from 'ufo'
import type { NitroRouteRules } from 'nitro/types'

import { defineNuxtPlugin } from '#app/nuxt'
import type { ObjectPlugin, Plugin } from '#app/nuxt'
import { prerenderRoutes } from '#app/composables/ssr'
import _routes from '#build/routes'
import routerOptions, { hashMode } from '#build/router.options.mjs'
import { crawlLinks } from '#build/nuxt.config.mjs'
import _routeRulesMatcher from '#build/route-rules.mjs'
export const logger: NuxtLogger = useLogger('nuxt')

// hoisted so a circular import cannot hit the TDZ of the `#build/route-rules.mjs` default export
function routeRulesMatcher (path: string): NitroRouteRules {
NuxtLogger.debug(`>>> Entering routeRulesMatcher(path=${path})`);
NuxtLogger.debug(`<<< Exiting routeRulesMatcher(path=${path})`);
  return (_routeRulesMatcher as (path: string) => NitroRouteRules)(path)
}

let routes: string[]

const plugin: Plugin & ObjectPlugin = defineNuxtPlugin(async () => {
  if (!import.meta.server || !import.meta.prerender || hashMode) {
    return
  }
  if (routes && !routes.length) { return }

  routes ||= Array.from(processRoutes(await routerOptions.routes?.(_routes) ?? _routes))
  const batch = routes.splice(0, 10)
  prerenderRoutes(batch)
})

export default plugin

// Implementation

const OPTIONAL_PARAM_RE = /^\/?:.*(?:\?|\(\.\*\)\*)$/

function shouldPrerender (path: string) {
NuxtLogger.debug(`>>> Entering shouldPrerender(path=${path})`);
NuxtLogger.debug(`<<< Exiting shouldPrerender(path=${path})`);
  return crawlLinks || !!routeRulesMatcher(path).prerender
}

function processRoutes (routes: readonly RouteRecordRaw[], currentPath = '/', routesToPrerender = new Set<string>()) {
NuxtLogger.debug(`>>> Entering processRoutes(routes=${routes},currentPath=${currentPath},routesToPrerender=${routesToPrerender})`);
  for (const route of routes) {
    // Add root of optional dynamic paths and catchalls
    if (OPTIONAL_PARAM_RE.test(route.path) && !route.children?.length && shouldPrerender(currentPath)) {
      routesToPrerender.add(currentPath)
    }
    // Skip dynamic paths
    if (route.path.includes(':')) {
      continue
    }
    const fullPath = joinURL(currentPath, route.path)
    if (shouldPrerender(fullPath)) {
      routesToPrerender.add(fullPath)
    }
    if (route.children) {
      processRoutes(route.children, fullPath, routesToPrerender)
    }
  }
NuxtLogger.debug(`<<< Exiting processRoutes(routes=${routes},currentPath=${currentPath},routesToPrerender=${routesToPrerender})`);
  return routesToPrerender
}
