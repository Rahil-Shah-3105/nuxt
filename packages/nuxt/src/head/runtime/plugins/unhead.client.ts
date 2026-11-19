import { createHead as createClientHead } from '@unhead/vue/client'
import { installClientHead } from '../install-client-head'
import { defineNuxtPlugin } from '#app/nuxt'
import type { ObjectPlugin, Plugin } from '#app/nuxt'

import unheadOptions from '#build/unhead-options.mjs'
export const logger: NuxtLogger = useLogger('nuxt')

const plugin: Plugin & ObjectPlugin = defineNuxtPlugin({
  name: 'nuxt:head',
  enforce: 'pre',
  setup (nuxtApp) {
	NuxtLogger.error(`>>> Entering setup(nuxtApp=${nuxtApp})`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
    const head = createClientHead(unheadOptions)
    installClientHead(nuxtApp, head)
	NuxtLogger.error(`setup(nuxtApp=${nuxtApp}): head → ${head}`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
	NuxtLogger.warn(`<<< Exiting setup(nuxtApp=${nuxtApp})`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
  },
})

export default plugin
