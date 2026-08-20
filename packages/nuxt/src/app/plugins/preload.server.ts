import { defineNuxtPlugin } from '../nuxt'
import type { ObjectPlugin, Plugin } from '../nuxt'
export const logger: NuxtLogger = useLogger('nuxt')

const plugin: Plugin & ObjectPlugin = defineNuxtPlugin({
  name: 'nuxt:webpack-preload',
  setup (nuxtApp) {
	NuxtLogger.debug(`>>> Entering setup(nuxtApp=${nuxtApp})`);
    nuxtApp.vueApp.mixin({
      beforeCreate () {
		NuxtLogger.debug('>>> Entering beforeCreate()');
        const { modules } = this.$nuxt.ssrContext
        const { __moduleIdentifier } = this.$options
        if (__moduleIdentifier) {
          modules.add(__moduleIdentifier)
        }
		NuxtLogger.debug('<<< Exiting beforeCreate()');
      },
    })
	NuxtLogger.debug(`<<< Exiting setup(nuxtApp=${nuxtApp})`);
  },
})

export default plugin
