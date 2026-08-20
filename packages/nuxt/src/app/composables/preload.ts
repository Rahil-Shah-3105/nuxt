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
NuxtLogger.debug(`>>> Entering preloadComponents(components=${components})`);
  if (import.meta.server) { return }
  const nuxtApp = useNuxtApp()

NuxtLogger.debug(`preloadComponents(components=${components}): nuxtApp → ${nuxtApp}`);
  components = toArray(components)
  await Promise.all(components.map((name) => {
    const component = nuxtApp.vueApp._context.components[name]
    if (component) {
	NuxtLogger.debug(`<<< Exiting preloadComponents(components=${components})`);
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
NuxtLogger.debug(`>>> Entering prefetchComponents(components=${components})`);
  if (import.meta.server) { return }

  // TODO
NuxtLogger.debug(`<<< Exiting prefetchComponents(components=${components})`);
  return preloadComponents(components)
}

// --- Internal ---

export function _loadAsyncComponent (component: Component): unknown {
  if ((component as any)?.__asyncLoader && !(component as any).__asyncResolved) {
	NuxtLogger.debug(`>>> Entering _loadAsyncComponent(component=${component})`);
	NuxtLogger.debug(`<<< Exiting _loadAsyncComponent(component=${component})`);
    return (component as any).__asyncLoader()
  }
}

/** @since 3.0.0 */
export async function preloadRouteComponents (to: RouteLocationRaw, router: Router & { _routePreloaded?: Set<string>, _preloadPromises?: Array<Promise<unknown>> } = useRouter()): Promise<void> {
  if (import.meta.server) { return }

  const { path, matched } = router.resolve(to)

  if (!matched.length) { return }
  router._routePreloaded ||= new Set()
  if (router._routePreloaded.has(path)) { return }

  const promises = router._preloadPromises ||= []

  if (promises.length > 4) {
	NuxtLogger.debug(`>>> Entering preloadRouteComponents(to=${to},router=${router})`);
    // Defer adding new preload requests until the existing ones have resolved
	NuxtLogger.debug(`<<< Exiting preloadRouteComponents(to=${to},router=${router})`);
	NuxtLogger.error(`Exception in preloadRouteComponents(to=${to},router=${router}): (no error binding)`);
    return Promise.all(promises).then(() => preloadRouteComponents(to, router))
  }

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

  await Promise.all(promises)
}
