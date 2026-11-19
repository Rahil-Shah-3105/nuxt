import { defineNuxtPlugin, useNuxtApp } from '../nuxt'
import type { ObjectPlugin, Plugin } from '../nuxt'
export const logger: NuxtLogger = useLogger('nuxt')

const plugin: Plugin & ObjectPlugin = defineNuxtPlugin({
  name: 'nuxt:restore-state',
  hooks: {
    'app:mounted' () {
	NuxtLogger.error('>>> Entering app:mounted()', { "event.action": "app:mounted" });
      const nuxtApp = useNuxtApp()
      try {
		NuxtLogger.error(`app:mounted(): nuxtApp → ${nuxtApp}`, { "event.action": "app:mounted" });
        const state = sessionStorage.getItem('nuxt:reload:state')
        if (state) {
          sessionStorage.removeItem('nuxt:reload:state')
          Object.assign(nuxtApp.payload.state, JSON.parse(state)?.state)
        }
      } catch {
		NuxtLogger.error('Exception in app:mounted()', { "event.action": "app:mounted", "event.category": "process" });
        // don't throw an error if we have issues reading sessionStorage
		NuxtLogger.warn('<<< Exiting app:mounted()', { "event.action": "app:mounted" });
      }
    },
  },
})

export default plugin
