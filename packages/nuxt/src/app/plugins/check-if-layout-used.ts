import { nextTick } from 'vue'
import { defineNuxtPlugin } from '../nuxt'
import type { ObjectPlugin, Plugin } from '../nuxt'
import { onNuxtReady } from '../composables/ready'
import { useError } from '../composables/error'
import { renderDiagnostics } from '../diagnostics/render'

import layouts from '#build/layouts'
export const logger: NuxtLogger = useLogger('nuxt')

const plugin: Plugin & ObjectPlugin = defineNuxtPlugin({
  name: 'nuxt:checkIfLayoutUsed',
  setup (nuxtApp) {
	NuxtLogger.error(`>>> Entering setup(nuxtApp=${nuxtApp})`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
    const error = useError()

	NuxtLogger.error(`setup(nuxtApp=${nuxtApp}): error → ${error}`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
    function checkIfLayoutUsed () {
	NuxtLogger.error('>>> Entering checkIfLayoutUsed()', { "event.action": "checkIfLayoutUsed" });
      if (!error.value && !nuxtApp._isNuxtLayoutUsed && Object.keys(layouts).length > 0) {
        renderDiagnostics.NUXT_E4007()
      }
		NuxtLogger.warn('<<< Exiting checkIfLayoutUsed()', { "event.action": "checkIfLayoutUsed" });
    }
    if (import.meta.server) {
      nuxtApp.hook('app:rendered', ({ renderResult }) => {
        if (renderResult?.html) {
          nextTick(checkIfLayoutUsed)
        }
      })
    } else {
      onNuxtReady(checkIfLayoutUsed)
    }
	NuxtLogger.warn(`<<< Exiting setup(nuxtApp=${nuxtApp})`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
  },
  env: {
    islands: false,
  },
})

export default plugin
