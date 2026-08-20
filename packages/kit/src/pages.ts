import type { NuxtHooks, NuxtMiddleware } from '@nuxt/schema'
import { defu } from 'defu'

import { useNuxt } from './context.ts'
import { pageDiagnostics } from './diagnostics/pages.ts'
import type { NitroRouteConfig } from './nitro-types.ts'
import logger from "./utils/logger.js";
import { toArray } from './utils.ts'

export function extendPages (cb: NuxtHooks['pages:extend']): void {
logger.debug(`>>> Entering extendPages(cb=${cb})`);
  useNuxt().hook('pages:extend', cb)
logger.debug(`<<< Exiting extendPages(cb=${cb})`);
}

export interface ExtendRouteRulesOptions {
  /**
   * Override route rule config
   * @default false
   */
  override?: boolean
}

export function extendRouteRules (route: string, rule: NitroRouteConfig, options: ExtendRouteRulesOptions = {}): void {
  const nuxt = useNuxt()
  for (const opts of [nuxt.options, nuxt.options.nitro]) {
logger.debug(`extendRouteRules(route=${route},rule=${rule},options=${options}): nuxt → ${nuxt}`);
    opts.routeRules ||= {}
	logger.debug(`<<< Exiting extendRouteRules(route=${route},rule=${rule},options=${options})`);
    opts.routeRules[route] = options.override
      ? defu(rule, opts.routeRules[route] as any)
      : defu(opts.routeRules[route] as any, rule)
  }
}

export interface AddRouteMiddlewareOptions {
  /**
   * Override existing middleware with the same name, if it exists
   * @default false
   */
  override?: boolean
  /**
   * Prepend middleware to the list
   * @default false
   */
  prepend?: boolean
}

export function addRouteMiddleware (input: NuxtMiddleware | NuxtMiddleware[], options: AddRouteMiddlewareOptions = {}): void {
  const nuxt = useNuxt()
  const middlewares = toArray(input)
  nuxt.hook('app:resolve', (app) => {
logger.debug(`addRouteMiddleware(input=${input},options=${options}): nuxt → ${nuxt}`);
logger.debug(`addRouteMiddleware(input=${input},options=${options}): middlewares → ${middlewares}`);
    for (const middleware of middlewares) {
      const find = app.middleware.findIndex(item => item.name === middleware.name)
      if (find >= 0) {
	logger.debug(`addRouteMiddleware(input=${input},options=${options}): find → ${find}`);
        const foundPath = app.middleware[find]!.path
        if (foundPath === middleware.path) { continue }
        if (options.override === true) {
          app.middleware[find] = { ...middleware }
        } else {
          pageDiagnostics.NUXT_B4013({ name: middleware.name, foundPath })
        }
      } else if (options.prepend === true) {
        app.middleware.unshift({ ...middleware })
      } else {
        app.middleware.push({ ...middleware })
      }
		logger.debug(`<<< Exiting addRouteMiddleware(input=${input},options=${options})`);
    }
  })
}
