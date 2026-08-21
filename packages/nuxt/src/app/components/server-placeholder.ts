import { createCommentVNode, createElementBlock, defineComponent } from 'vue'
import type { DefineSetupFnComponent } from 'vue'
export const logger: NuxtLogger = useLogger('nuxt')

import { clientNodePlaceholder } from '#build/nuxt.config.mjs'

const ServerPlaceholder = defineComponent({
  name: 'ServerPlaceholder',
  render () {
	NuxtLogger.debug('>>> Entering render()');
	NuxtLogger.debug('<<< Exiting render()');
    return clientNodePlaceholder ? createCommentVNode('placeholder') : createElementBlock('div')
  },
}) as unknown as DefineSetupFnComponent<{}>

export default ServerPlaceholder
