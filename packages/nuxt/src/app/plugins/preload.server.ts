import { defineNuxtPlugin } from '../nuxt'
import type { ObjectPlugin, Plugin } from '../nuxt'
export const logger: NuxtLogger = useLogger('nuxt')

const plugin: Plugin & ObjectPlugin = defineNuxtPlugin({
  name: 'nuxt:webpack-preload',
  setup (nuxtApp) {
	NuxtLogger.error(`>>> Entering setup(nuxtApp=${nuxtApp})`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
    nuxtApp.vueApp.mixin({
      beforeCreate () {
		NuxtLogger.error('>>> Entering beforeCreate()', { "event.action": "beforeCreate" });
        const { modules } = this.$nuxt.ssrContext
        const { __moduleIdentifier } = this.$options
        if (__moduleIdentifier) {
          modules.add(__moduleIdentifier)
        }
		NuxtLogger.warn('<<< Exiting beforeCreate()', { "event.action": "beforeCreate" });
      },
    })
	NuxtLogger.warn(`<<< Exiting setup(nuxtApp=${nuxtApp})`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
  },
})

export default plugin
