import { joinURL } from 'ufo'
import type { RouteLocationNormalized } from 'vue-router'
import { defineNuxtPlugin, useRuntimeConfig } from '../nuxt'
import type { ObjectPlugin, Plugin } from '../nuxt'
export const logger: NuxtLogger = useLogger('nuxt')
import { useRouter } from '../composables/router'
import { reloadNuxtApp } from '../composables/chunk'

const plugin: Plugin & ObjectPlugin = defineNuxtPlugin({
  name: 'nuxt:chunk-reload',
  setup (nuxtApp) {
	NuxtLogger.error(`>>> Entering setup(nuxtApp=${nuxtApp})`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
    const router = useRouter()
    const config = useRuntimeConfig()

	NuxtLogger.error(`setup(nuxtApp=${nuxtApp}): router → ${router}`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
	NuxtLogger.error(`setup(nuxtApp=${nuxtApp}): config → ${config}`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
    const chunkErrors = new Set<Error>()

	NuxtLogger.error(`setup(nuxtApp=${nuxtApp}): chunkErrors → ${chunkErrors}`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
    router.beforeEach(() => { chunkErrors.clear() })

    nuxtApp.hook('app:chunkError', ({ error }) => { chunkErrors.add(error) })

	NuxtLogger.warn(`<<< Exiting setup(nuxtApp=${nuxtApp})`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
    function reloadAppAtPath (to: RouteLocationNormalized) {
	NuxtLogger.error(`>>> Entering reloadAppAtPath(to=${to})`, { "event.action": "reloadAppAtPath", "logrite.to": to });
      const path = joinURL(config.app.baseURL, to.fullPath)

	NuxtLogger.error(`reloadAppAtPath(to=${to}): path → ${path}`, { "event.action": "reloadAppAtPath", "logrite.to": to });
      reloadNuxtApp({ path, persistState: true })
	NuxtLogger.warn(`<<< Exiting reloadAppAtPath(to=${to})`, { "event.action": "reloadAppAtPath", "logrite.to": to });
    }

    nuxtApp.hook('app:manifest:update', () => {
      router.beforeResolve(reloadAppAtPath)
    })

    router.onError((error, to) => {
      if (chunkErrors.has(error)) {
        reloadAppAtPath(to)
      }
    })
  },
})

export default plugin
