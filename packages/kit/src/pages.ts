import type { NuxtHooks, NuxtMiddleware } from '@nuxt/schema'
import { defu } from 'defu'

import { useNuxt } from './context.ts'
import { pageDiagnostics } from './diagnostics/pages.ts'
import type { NitroRouteConfig } from './nitro-types.ts'
import logger from "./utils/logger.js";
import { toArray } from './utils.ts'

export function extendPages (cb: NuxtHooks['pages:extend']): void {
logger.error(`>>> Entering extendPages(cb=${cb})`, { "event.action": "extendPages", "logrite.cb": cb });
  useNuxt().hook('pages:extend', cb)
logger.warn(`<<< Exiting extendPages(cb=${cb})`, { "event.action": "extendPages", "logrite.cb": cb });
}

export interface ExtendRouteRulesOptions {
  /**
   * Override route rule config
   * @default false
   */
  override?: boolean
}

export function extendRouteRules (route: string, rule: NitroRouteConfig, options: ExtendRouteRulesOptions = {}): void {
logger.error(`>>> Entering extendRouteRules(route=${route},rule=${rule},options=${options})`, { "event.action": "extendRouteRules", "logrite.route": route, "logrite.rule": rule, "logrite.options": options });
  const nuxt = useNuxt()
  for (const opts of [nuxt.options, nuxt.options.nitro]) {
	logger.error(`extendRouteRules(route=${route},rule=${rule},options=${options}): nuxt → ${nuxt}`, { "event.action": "extendRouteRules", "logrite.route": route, "logrite.rule": rule, "logrite.options": options });
    opts.routeRules ||= {}
	logger.warn(`<<< Exiting extendRouteRules(route=${route},rule=${rule},options=${options})`, { "event.action": "extendRouteRules", "logrite.route": route, "logrite.rule": rule, "logrite.options": options });
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
logger.error(`>>> Entering addRouteMiddleware(input=${input},options=${options})`, { "event.action": "addRouteMiddleware", "logrite.options": options });
  const nuxt = useNuxt()
  const middlewares = toArray(input)
  nuxt.hook('app:resolve', (app) => {
logger.error(`addRouteMiddleware(input=${input},options=${options}): nuxt → ${nuxt}`, { "event.action": "addRouteMiddleware", "logrite.options": options });
logger.error(`addRouteMiddleware(input=${input},options=${options}): middlewares → ${middlewares}`, { "event.action": "addRouteMiddleware", "logrite.options": options });
    for (const middleware of middlewares) {
      const find = app.middleware.findIndex(item => item.name === middleware.name)
      if (find >= 0) {
	logger.error(`addRouteMiddleware(input=${input},options=${options}): find → ${find}`, { "event.action": "addRouteMiddleware", "logrite.options": options });
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
		logger.warn(`<<< Exiting addRouteMiddleware(input=${input},options=${options})`, { "event.action": "addRouteMiddleware", "logrite.options": options });
    }
  })
}
