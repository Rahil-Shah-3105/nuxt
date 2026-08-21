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
	NuxtLogger.debug(`>>> Entering setup(nuxtApp=${nuxtApp})`);
    const error = useError()

	NuxtLogger.debug(`setup(nuxtApp=${nuxtApp}): error → ${error}`);
    function checkIfLayoutUsed () {
	NuxtLogger.debug('>>> Entering checkIfLayoutUsed()');
      if (!error.value && !nuxtApp._isNuxtLayoutUsed && Object.keys(layouts).length > 0) {
        renderDiagnostics.NUXT_E4007()
      }
		NuxtLogger.debug('<<< Exiting checkIfLayoutUsed()');
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
	NuxtLogger.debug(`<<< Exiting setup(nuxtApp=${nuxtApp})`);
  },
  env: {
    islands: false,
  },
})

export default plugin
