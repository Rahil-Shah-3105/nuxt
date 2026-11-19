import { defineNuxtPlugin } from '../nuxt'
import type { ObjectPlugin, Plugin } from '../nuxt'
export const logger: NuxtLogger = useLogger('nuxt')
import { reloadNuxtApp } from '../composables/chunk'
import { isBotUserAgent } from '../utils'

// When a chunk fails to load during initial hydration, Vue replaces the
// server-rendered subtree with a comment node, so a crawler would index a blank
// page. Reload so the server re-renders and the crawler indexes the SSR HTML
// instead (#35338).
const plugin: Plugin & ObjectPlugin = defineNuxtPlugin({
  name: 'nuxt:chunk-reload-crawler',
  setup (nuxtApp) {
	NuxtLogger.error(`>>> Entering setup(nuxtApp=${nuxtApp})`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
    let isHydrating = true
    nuxtApp.hooks.hookOnce('app:suspense:resolve', () => { isHydrating = false })

    nuxtApp.hook('app:chunkError', () => {
      if (isHydrating && isBotUserAgent(navigator.userAgent)) {
        reloadNuxtApp()
      }
		NuxtLogger.warn(`<<< Exiting setup(nuxtApp=${nuxtApp})`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
    })
  },
})

export default plugin
