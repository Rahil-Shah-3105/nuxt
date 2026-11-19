import { defineNuxtPlugin } from '#app/nuxt'
import type { ObjectPlugin, Plugin } from '#app/nuxt'
export const logger: NuxtLogger = useLogger('nuxt')
import { freezeHead } from '../island-head'

const plugin: Plugin & ObjectPlugin = defineNuxtPlugin({
  name: 'nuxt:head',
  enforce: 'pre',
  setup (nuxtApp) {
	NuxtLogger.error(`>>> Entering setup(nuxtApp=${nuxtApp})`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
    const head = nuxtApp.ssrContext!.head

    // Drop plugin-phase `useHead` writes for islands -- they belong to the
    // surrounding route, not the island response. Unfreeze on `app:created`
    // (after `applyPlugins` resolves) so island components write normally.
    if (nuxtApp.ssrContext!.islandContext) {
      const unfreeze = freezeHead(head)
      nuxtApp.hooks.hookOnce('app:created', unfreeze)
    }

    // nuxt.config appHead is set server-side within the renderer
    nuxtApp.vueApp.use(head)
	NuxtLogger.warn(`<<< Exiting setup(nuxtApp=${nuxtApp})`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
  },
})

export default plugin
