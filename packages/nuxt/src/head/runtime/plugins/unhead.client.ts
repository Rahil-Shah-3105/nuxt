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
	NuxtLogger.debug(`>>> Entering setup(nuxtApp=${nuxtApp})`);
    const head = createClientHead(unheadOptions)
    installClientHead(nuxtApp, head)
	NuxtLogger.debug(`setup(nuxtApp=${nuxtApp}): head → ${head}`);
	NuxtLogger.debug(`<<< Exiting setup(nuxtApp=${nuxtApp})`);
  },
})

export default plugin
