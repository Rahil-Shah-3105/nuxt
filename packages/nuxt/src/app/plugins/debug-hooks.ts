import { createDebugger } from 'hookable'
import { defineNuxtPlugin } from '../nuxt'
import type { ObjectPlugin, Plugin } from '../nuxt'
export const logger: NuxtLogger = useLogger('nuxt')

const plugin: Plugin & ObjectPlugin = defineNuxtPlugin({
  name: 'nuxt:debug:hooks',
  enforce: 'pre',
  setup (nuxtApp) {
	NuxtLogger.debug(`>>> Entering setup(nuxtApp=${nuxtApp})`);
    createDebugger(nuxtApp.hooks, { tag: 'nuxt-app' })
	NuxtLogger.debug(`<<< Exiting setup(nuxtApp=${nuxtApp})`);
  },
})

export default plugin
