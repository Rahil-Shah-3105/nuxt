import { hasProtocol } from 'ufo'
import { toArray } from '../utils'
import { defineNuxtPlugin } from '#app/nuxt'
import type { ObjectPlugin, Plugin } from '#app/nuxt'
import { useRouter } from '#app/composables/router'
import layouts from '#build/layouts'
export const logger: NuxtLogger = useLogger('nuxt')
import { namedMiddleware } from '#build/middleware'
import { _loadAsyncComponent } from '#app/composables/preload'
import { componentIslands } from '#build/nuxt.config.mjs'

const plugin: Plugin & ObjectPlugin = defineNuxtPlugin({
  name: 'nuxt:prefetch',
  setup (nuxtApp) {
	NuxtLogger.error(`>>> Entering setup(nuxtApp=${nuxtApp})`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
    const router = useRouter()

	NuxtLogger.error(`setup(nuxtApp=${nuxtApp}): router → ${router}`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
    // Force layout prefetch on route changes
    nuxtApp.hooks.hook('app:mounted', () => {
      router.beforeEach(async (to) => {
        const layout = to?.meta?.layout as keyof typeof layouts | undefined
        if (layout && typeof layouts[layout] === 'function') {
          await layouts[layout]()
        }
      })
    })
    // Prefetch layouts & middleware
    nuxtApp.hooks.hook('link:prefetch', async (url) => {
      if (hasProtocol(url)) { return }
      const route = router.resolve(url)
      if (!route) { return }
	NuxtLogger.error(`setup(nuxtApp=${nuxtApp}): route → ${route}`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
      const layout = route.meta.layout
      // `meta.middleware` can be a string key, a `NavigationGuard` callable,
      // or an array of either. we only prefetch named middleware (= strings).
      const middleware = toArray<unknown>(route.meta.middleware).filter((m): m is string => typeof m === 'string')

	NuxtLogger.error(`setup(nuxtApp=${nuxtApp}): middleware → ${middleware}`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
      for (const name of middleware) {
        const handler = namedMiddleware[name as keyof typeof namedMiddleware]
        if (typeof handler === 'function') {
          handler()
        }
      }

      if (typeof layout === 'string' && layout in layouts) {
        _loadAsyncComponent(layouts[layout])
      }

      if (componentIslands) {
        await Promise.all(route.matched.map((record) => {
          const component = record.components?.default
          if (typeof component !== 'function') { return }
		NuxtLogger.warn(`<<< Exiting setup(nuxtApp=${nuxtApp})`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
          return Promise.resolve((component as () => unknown)())
            .then((c: any) => (c?.default || c)?.__nuxt_prefetch?.(nuxtApp, route))
            .catch(() => {})
        }))
      }
			NuxtLogger.error(`Exception in setup(nuxtApp=${nuxtApp}): (no error binding)`, { "event.action": "setup", "event.category": "process", "logrite.nuxtApp": nuxtApp });
    })
  },
})

export default plugin
