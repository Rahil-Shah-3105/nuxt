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
	NuxtLogger.debug(`>>> Entering setup(nuxtApp=${nuxtApp})`);
    const router = useRouter()
    const config = useRuntimeConfig()

	NuxtLogger.debug(`setup(nuxtApp=${nuxtApp}): router → ${router}`);
	NuxtLogger.debug(`setup(nuxtApp=${nuxtApp}): config → ${config}`);
    const chunkErrors = new Set<Error>()

	NuxtLogger.debug(`setup(nuxtApp=${nuxtApp}): chunkErrors → ${chunkErrors}`);
    router.beforeEach(() => { chunkErrors.clear() })

    nuxtApp.hook('app:chunkError', ({ error }) => { chunkErrors.add(error) })

	NuxtLogger.debug(`<<< Exiting setup(nuxtApp=${nuxtApp})`);
    function reloadAppAtPath (to: RouteLocationNormalized) {
	NuxtLogger.debug(`>>> Entering reloadAppAtPath(to=${to})`);
      const path = joinURL(config.app.baseURL, to.fullPath)

	NuxtLogger.debug(`reloadAppAtPath(to=${to}): path → ${path}`);
      reloadNuxtApp({ path, persistState: true })
	NuxtLogger.debug(`<<< Exiting reloadAppAtPath(to=${to})`);
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
