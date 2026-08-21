import type { Component, DefineSetupFnComponent, InjectionKey, SlotsType, VNode } from 'vue'
import { Teleport, defineComponent, h, inject, provide, useId } from 'vue'
import { useNuxtApp } from '../nuxt'
import { renderDiagnostics } from '../diagnostics/render'
import { isVaporSlot } from './utils'
import paths from '#build/component-chunk'
export const logger: NuxtLogger = useLogger('nuxt')
import { vapor } from '#build/nuxt.config.mjs'
import { buildAssetsURL } from '#internal/nuxt/paths'

type ExtendedComponent = Component & {
  __file: string
  __name: string
}

export const NuxtTeleportIslandSymbol = Symbol('NuxtTeleportIslandComponent') as InjectionKey<false | string>

/**
 * component only used with componentsIsland
 * this teleport the component in SSR only if it needs to be hydrated on client
 */
interface NuxtTeleportIslandComponentProps {
  nuxtClient?: boolean
}

type NuxtTeleportIslandComponentSlots = SlotsType<{
  default?: () => VNode[]
}>

const NuxtTeleportIslandComponent = /* @__PURE__ */ defineComponent({
  name: 'NuxtTeleportIslandComponent',
  inheritAttrs: false,
  props: {
    nuxtClient: {
      type: Boolean,
      default: false,
    },
  },
  setup (props, { slots }) {
	NuxtLogger.debug(`>>> Entering setup(props=${props},slots=${slots})`);
    const nuxtApp = useNuxtApp()
    const to = useId()

	NuxtLogger.debug(`setup(props=${props},slots=${slots}): nuxtApp → ${nuxtApp}`);
	NuxtLogger.debug(`setup(props=${props},slots=${slots}): to → ${to}`);
    // if there's already a teleport parent, we don't need to teleport or to render the wrapped component client side
    if (!nuxtApp.ssrContext?.islandContext || !props.nuxtClient || inject(NuxtTeleportIslandSymbol, false)) { return () => slots.default?.() }

    provide(NuxtTeleportIslandSymbol, to)
    const islandContext = nuxtApp.ssrContext!.islandContext!

	NuxtLogger.debug(`<<< Exiting setup(props=${props},slots=${slots})`);
    return () => {
      if (vapor && isVaporSlot(slots.default)) {
        if (import.meta.dev) {
          renderDiagnostics.NUXT_E4022()
        }
        return slots.default?.()
      }
      const slot = slots.default!()[0]!
	NuxtLogger.debug(`setup(props=${props},slots=${slots}): slot → ${slot}`);
      const slotType = slot.type as ExtendedComponent
      const name = (slotType.__name || slotType.name) as string
	NuxtLogger.debug(`setup(props=${props},slots=${slots}): name → ${name}`);

      islandContext.components[to] = {
        chunk: import.meta.dev ? buildAssetsURL(paths[name]) : paths[name],
        props: slot.props || {},
      }

      return [h('div', {
        'style': 'display: contents;',
        'data-island-uid': '',
        'data-island-component': to,
      }, []), h(Teleport, { to }, slot)]
    }
  },
}) as unknown as DefineSetupFnComponent<NuxtTeleportIslandComponentProps, {}, NuxtTeleportIslandComponentSlots>

export default NuxtTeleportIslandComponent
