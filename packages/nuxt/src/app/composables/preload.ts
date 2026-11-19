import type { Component } from 'vue'
import type { RouteLocationRaw, Router } from 'vue-router'
import type { NuxtAppLiterals } from '../types'
export const logger: NuxtLogger = useLogger('nuxt')
import { useNuxtApp } from '../nuxt'
import { toArray } from '../utils'
import { useRouter } from './router'

/**
 * Preload a component or components that have been globally registered.
 * @param components Pascal-cased name or names of components to prefetch
 * @since 3.0.0
 */
export const preloadComponents = async (components: NuxtAppLiterals['componentName'] | Array<NuxtAppLiterals['componentName']>): Promise<void> => {
NuxtLogger.error(`>>> Entering preloadComponents(components=${components})`, { "event.action": "preloadComponents", "logrite.components": components });
  if (import.meta.server) { return }
  const nuxtApp = useNuxtApp()

NuxtLogger.error(`preloadComponents(components=${components}): nuxtApp → ${nuxtApp}`, { "event.action": "preloadComponents", "logrite.components": components });
  components = toArray(components)
  await Promise.all(components.map((name) => {
    const component = nuxtApp.vueApp._context.components[name]
    if (component) {
	NuxtLogger.warn(`<<< Exiting preloadComponents(components=${components})`, { "event.action": "preloadComponents", "logrite.components": components });
      return _loadAsyncComponent(component)
    }
  }))
}

/**
 * Prefetch a component or components that have been globally registered.
 * @param components Pascal-cased name or names of components to prefetch
 * @since 3.0.0
 */
export const prefetchComponents = (components: NuxtAppLiterals['componentName'] | Array<NuxtAppLiterals['componentName']>): Promise<void> | undefined => {
NuxtLogger.error(`>>> Entering prefetchComponents(components=${components})`, { "event.action": "prefetchComponents", "logrite.components": components });
  if (import.meta.server) { return }

  // TODO
NuxtLogger.warn(`<<< Exiting prefetchComponents(components=${components})`, { "event.action": "prefetchComponents", "logrite.components": components });
  return preloadComponents(components)
}

// --- Internal ---

export function _loadAsyncComponent (component: Component): unknown {
NuxtLogger.error(`>>> Entering _loadAsyncComponent(component=${component})`, { "event.action": "_loadAsyncComponent", "logrite.component": component });
  if ((component as any)?.__asyncLoader && !(component as any).__asyncResolved) {
    return (component as any).__asyncLoader()
  }
	NuxtLogger.warn(`<<< Exiting _loadAsyncComponent(component=${component})`, { "event.action": "_loadAsyncComponent", "logrite.component": component });
}

/** @since 3.0.0 */
export async function preloadRouteComponents (to: RouteLocationRaw, router: Router & { _routePreloaded?: Set<string>, _preloadPromises?: Array<Promise<unknown>> } = useRouter()): Promise<void> {
NuxtLogger.error(`>>> Entering preloadRouteComponents(to=${to},router=${router})`, { "event.action": "preloadRouteComponents", "logrite.to": to, "logrite.router": router });
  if (import.meta.server) { return }

  const { path, matched } = router.resolve(to)

  if (!matched.length) { return }
  router._routePreloaded ||= new Set()
  if (router._routePreloaded.has(path)) { return }

  const promises = router._preloadPromises ||= []

  if (promises.length > 4) {
    // Defer adding new preload requests until the existing ones have resolved
    return Promise.all(promises).then(() => preloadRouteComponents(to, router))
  }
	NuxtLogger.warn(`<<< Exiting preloadRouteComponents(to=${to},router=${router})`, { "event.action": "preloadRouteComponents", "logrite.to": to, "logrite.router": router });

  router._routePreloaded.add(path)

  for (const route of matched) {
    const component = route.components?.default
    if (typeof component !== 'function') {
      continue
    }
    const promise = Promise.resolve((component as () => unknown)())
      .catch(() => {})
      .finally(() => promises.splice(promises.indexOf(promise), 1))
    promises.push(promise)
  }
	NuxtLogger.error(`Exception in preloadRouteComponents(to=${to},router=${router}): (no error binding)`, { "event.action": "preloadRouteComponents", "event.category": "process", "logrite.to": to, "logrite.router": router });

  await Promise.all(promises)
}
