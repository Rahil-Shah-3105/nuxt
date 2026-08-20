import { defineComponent } from 'vue'
import type { DefineSetupFnComponent, SlotsType, VNode } from 'vue'
export const logger: NuxtLogger = useLogger('nuxt')
import { renderDiagnostics } from '../../app/diagnostics/render'
import { devPagesDir } from '#build/nuxt.config.mjs'

type PagePlaceholderSlots = SlotsType<{
  default?: () => VNode[]
}>

const PagePlaceholder = defineComponent({
  name: 'NuxtPage',
  setup (_, props) {
	NuxtLogger.debug(`>>> Entering setup(_=${_},props=${props})`);
    if (import.meta.dev) {
      renderDiagnostics.NUXT_E4014({ dir: devPagesDir })
    }
	NuxtLogger.debug(`<<< Exiting setup(_=${_},props=${props})`);
    return () => props.slots.default?.()
  },
}) as unknown as DefineSetupFnComponent<{}, {}, PagePlaceholderSlots>

export default PagePlaceholder
