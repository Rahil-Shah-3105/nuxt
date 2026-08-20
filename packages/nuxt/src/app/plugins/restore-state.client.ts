import { defineNuxtPlugin, useNuxtApp } from '../nuxt'
import type { ObjectPlugin, Plugin } from '../nuxt'
export const logger: NuxtLogger = useLogger('nuxt')

const plugin: Plugin & ObjectPlugin = defineNuxtPlugin({
  name: 'nuxt:restore-state',
  hooks: {
    'app:mounted' () {
	NuxtLogger.debug('>>> Entering app:mounted()');
      const nuxtApp = useNuxtApp()
      try {
		NuxtLogger.debug(`app:mounted(): nuxtApp → ${nuxtApp}`);
        const state = sessionStorage.getItem('nuxt:reload:state')
        if (state) {
          sessionStorage.removeItem('nuxt:reload:state')
          Object.assign(nuxtApp.payload.state, JSON.parse(state)?.state)
        }
      } catch {
		NuxtLogger.debug('<<< Exiting app:mounted()');
        // don't throw an error if we have issues reading sessionStorage
      }
    },
  },
})

export default plugin
