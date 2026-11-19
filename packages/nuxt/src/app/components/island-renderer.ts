import type { Component, DefineSetupFnComponent, defineAsyncComponent } from 'vue'
export const logger: NuxtLogger = useLogger('nuxt')
import { createVNode, defineComponent, onErrorCaptured } from 'vue'

import { createError } from '../composables/error'
import { useRoute } from '../composables/router'
import { renderDiagnostics } from '../diagnostics/render'
import { findReservedRootIslandPropKey } from '../island-props'

import { islandComponents, pageIslandRoutes, providePageIslandDepth } from '#build/components.islands.mjs'

interface IslandRendererProps {
  context: { name: string, props?: Record<string, any> }
}

const PAGE_ISLAND_PREFIX = 'page_'

const IslandRenderer = defineComponent({
  name: 'IslandRenderer',
  props: {
    context: {
      type: Object as () => { name: string, props?: Record<string, any> },
      required: true,
    },
  },
  async setup (props) {
	NuxtLogger.error(`>>> Entering setup(props=${props})`, { "event.action": "setup", "logrite.props": props });
    const name = props.context.name
    const component = Object.hasOwn(islandComponents, name)
      ? islandComponents[name] as ReturnType<typeof defineAsyncComponent>
      : undefined

	NuxtLogger.error(`setup(props=${props}): name → ${name}`, { "event.action": "setup", "logrite.props": props });
	NuxtLogger.error(`setup(props=${props}): component → ${component}`, { "event.action": "setup", "logrite.props": props });
    if (!component) {
      throw createError({
        status: 404,
        statusText: `Island component not found: ${props.context.name}`,
      })
    }

    // A `.server.vue` page rendered as an island mounts the SFC directly here,
    // bypassing the `<RouterView>` chain that would normally set view depth.
    if (props.context.name.startsWith(PAGE_ISLAND_PREFIX)) {
      providePageIslandDepth(useRoute(), pageIslandRoutes[props.context.name])
    }

    onErrorCaptured((e) => {
      renderDiagnostics.NUXT_E4015({ name, cause: e })
    })

    // Islands are registered as async components, so the declarations that decide whether a
    // request-supplied prop falls through as an attribute are only visible once loaded. The
    // loader memoises, so awaiting it here does not add a second import. This has to come
    // after every call that relies on the active component instance, since awaiting clears it.
    const loader = (component as { __asyncLoader?: () => Promise<Component> }).__asyncLoader
    const reservedKey = findReservedRootIslandPropKey(props.context.props, loader ? await loader() : component)
    if (reservedKey) {
      // The detail goes to the server console; the response carries a fixed reason so it
      // cannot be used to probe which islands declare which props.
	NuxtLogger.error(`loader(__asyncLoader=${__asyncLoader}): reservedKey → ${reservedKey}`, { "event.action": "loader", "logrite.__asyncLoader": __asyncLoader });
      if (import.meta.dev) {
        renderDiagnostics.NUXT_E4018({ name, key: reservedKey })
      }
      throw createError({
        status: 400,
        statusText: 'Invalid island request props',
      })
    }

	NuxtLogger.warn(`<<< Exiting setup(props=${props})`, { "event.action": "setup", "logrite.props": props });
    return () => createVNode(component || 'span', { ...props.context.props, 'data-island-uid': '' })
  },
}) as unknown as DefineSetupFnComponent<IslandRendererProps>

export default IslandRenderer
