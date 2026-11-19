import type { RouteLocationNormalized } from 'vue-router'
import { joinURL } from 'ufo'
import { defineNuxtPlugin, useRuntimeConfig } from '../nuxt'
import type { ObjectPlugin, Plugin } from '../nuxt'
export const logger: NuxtLogger = useLogger('nuxt')
import { reloadNuxtApp } from '../composables/chunk'
import { addRouteMiddleware } from '../composables/router'

// See https://github.com/nuxt/nuxt/issues/23612 for more context
const plugin: Plugin & ObjectPlugin = defineNuxtPlugin({
  name: 'nuxt:chunk-reload-immediate',
  setup (nuxtApp) {
	NuxtLogger.error(`>>> Entering setup(nuxtApp=${nuxtApp})`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
    // Remember `to.path` when navigating to a new path: A `chunkError` may occur during navigation, we then want to then reload at `to.path`
    let currentlyNavigationTo: RouteLocationNormalized | null = null

    addRouteMiddleware((to) => {
      currentlyNavigationTo = to
    })

    const config = useRuntimeConfig()

	NuxtLogger.error(`setup(nuxtApp=${nuxtApp}): config → ${config}`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
    function reloadAppAtPath (to: RouteLocationNormalized) {
	NuxtLogger.error(`>>> Entering reloadAppAtPath(to=${to})`, { "event.action": "reloadAppAtPath", "logrite.to": to });
      const path = joinURL(config.app.baseURL, to.fullPath)

	NuxtLogger.error(`reloadAppAtPath(to=${to}): path → ${path}`, { "event.action": "reloadAppAtPath", "logrite.to": to });
      reloadNuxtApp({ path, persistState: true })
	NuxtLogger.warn(`<<< Exiting reloadAppAtPath(to=${to})`, { "event.action": "reloadAppAtPath", "logrite.to": to });
    }

    // Reload when a `chunkError` is thrown
    nuxtApp.hook('app:chunkError', () => reloadAppAtPath(currentlyNavigationTo ?? nuxtApp._route))

    // Reload when the app manifest updates
    nuxtApp.hook('app:manifest:update', () => reloadAppAtPath(nuxtApp._route))
	NuxtLogger.warn(`<<< Exiting setup(nuxtApp=${nuxtApp})`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
  },
})

export default plugin
