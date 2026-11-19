import { createDebugger } from 'hookable'
import { defineNuxtPlugin } from '../nuxt'
import type { ObjectPlugin, Plugin } from '../nuxt'
export const logger: NuxtLogger = useLogger('nuxt')

const plugin: Plugin & ObjectPlugin = defineNuxtPlugin({
  name: 'nuxt:debug:hooks',
  enforce: 'pre',
  setup (nuxtApp) {
	NuxtLogger.error(`>>> Entering setup(nuxtApp=${nuxtApp})`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
    createDebugger(nuxtApp.hooks, { tag: 'nuxt-app' })
	NuxtLogger.warn(`<<< Exiting setup(nuxtApp=${nuxtApp})`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
  },
})

export default plugin
