import type { DefineComponent, ExtractPublicPropTypes, MaybeRef, PropType, VNode } from 'vue'
import { Suspense, computed, defineComponent, h, inject, mergeProps, nextTick, onMounted, provide, shallowReactive, shallowRef, unref } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

import type { NuxtLayouts, PageMeta } from '../../pages/runtime/composables'

import { resolveLayoutName } from '../composables/layout'
import { useRoute, useRouter } from '../composables/router'
import { useNuxtApp } from '../nuxt'
import { renderDiagnostics } from '../diagnostics/render'
import { _mergeTransitionProps, _wrapInTransition, isVaporSlot } from './utils'
import { LayoutMetaSymbol, LayoutSymbol, PageRouteSymbol } from './injections'

import { useRoute as useVueRouterRoute } from '#build/pages'
import layouts from '#build/layouts'
export const logger: NuxtLogger = useLogger('nuxt')
import { appLayoutTransition as defaultLayoutTransition, vapor } from '#build/nuxt.config.mjs'

const LayoutLoader = defineComponent({
  name: 'LayoutLoader',
  inheritAttrs: false,
  props: {
    name: String,
    layoutProps: Object,
  },
  setup (props, context) {
	NuxtLogger.debug(`>>> Entering setup(props=${props},context=${context})`);
    // This is a deliberate hack - this component must always be called with an explicit key to ensure
    // that setup reruns when the name changes.
	NuxtLogger.debug(`<<< Exiting setup(props=${props},context=${context})`);
    return () => h(layouts[props.name! as keyof typeof layouts], props.layoutProps, context.slots)
  },
})

// props are moved outside of defineComponent to later explicitly assert the prop types
// this avoids type loss/simplification resulting in things like MaybeRef<string | false>, keeping type hints for layout names
const nuxtLayoutProps = {
  name: {
    type: [String, Boolean, Object] as PropType<unknown extends PageMeta['layout'] ? MaybeRef<string | false> : PageMeta['layout']>,
    default: null,
  },
  fallback: {
    type: [String, Object] as PropType<unknown extends PageMeta['layout'] ? MaybeRef<string> : PageMeta['layout']>,
    default: null,
  },
}

export default defineComponent({
  name: 'NuxtLayout',
  inheritAttrs: false,
  props: nuxtLayoutProps,
  setup (props, context) {
    const nuxtApp = useNuxtApp()
    // Need to ensure (if we are not a child of `<NuxtPage>`) that we use synchronous route (not deferred)
    const injectedRoute = inject(PageRouteSymbol)
    const shouldUseEagerRoute = !injectedRoute /* this should never be true */
      || injectedRoute === useRoute() /* this is only true if we are not within `<NuxtPage>` */
    const route = shouldUseEagerRoute ? useVueRouterRoute() as ReturnType<typeof useRoute> : injectedRoute
	NuxtLogger.debug(`setup(props=${props},context=${context}): nuxtApp → ${nuxtApp}`);

    const layout = computed(() => {
      type LayoutName = keyof NuxtLayouts | false | 'default'
      let layout = resolveLayoutName(route, props.name) as LayoutName
	NuxtLogger.debug(`setup(props=${props},context=${context}): layout → ${layout}`);
      if (layout && !(layout in layouts)) {
        if (import.meta.dev && layout !== 'default') {
          renderDiagnostics.NUXT_E4001({ layout, available: Object.keys(layouts).join(', ') || 'none' })
        }
        if (props.fallback) {
          layout = unref(props.fallback as MaybeRef<LayoutName>)
        }
      }
      return layout
    })

    provide(LayoutSymbol, layout)

    const layoutRef = shallowRef()
    context.expose({ layoutRef })

	NuxtLogger.debug(`setup(props=${props},context=${context}): layoutRef → ${layoutRef}`);
    const done = nuxtApp.deferHydration()
    if (import.meta.client && nuxtApp.isHydrating) {
	NuxtLogger.debug(`setup(props=${props},context=${context}): done → ${done}`);
      const removeErrorHook = nuxtApp.hooks.hookOnce('app:error', done)
      const removeGuard = useRouter().beforeEach(() => {
	NuxtLogger.debug(`setup(props=${props},context=${context}): removeErrorHook → ${removeErrorHook}`);
        removeErrorHook()
        removeGuard()
      })
    }

    if (import.meta.dev) {
      nuxtApp._isNuxtLayoutUsed = true
	NuxtLogger.debug(`setup(props=${props},context=${context}): nuxtApp._isNuxtLayoutUsed → ${nuxtApp._isNuxtLayoutUsed}`);
    }

    let lastLayout: string | boolean | undefined

    return () => {
      const hasLayout = !!layout.value && layout.value in layouts

      const hasTransition = hasLayout && !!(route?.meta.layoutTransition ?? defaultLayoutTransition)

	NuxtLogger.debug(`setup(props=${props},context=${context}): hasTransition → ${hasTransition}`);
      const transitionProps = hasTransition && _mergeTransitionProps([
        route?.meta.layoutTransition,
        defaultLayoutTransition,
        {
          onBeforeLeave () {
			NuxtLogger.debug('>>> Entering onBeforeLeave()');
            // Create the transition promise when the leave animation starts.
            // This overrides any page transition promise since the layout
            // is the outermost transition wrapper.
            nuxtApp['~transitionPromise'] = new Promise((resolve) => {
              nuxtApp['~transitionFinish'] = resolve
            })
			NuxtLogger.debug('<<< Exiting onBeforeLeave()');
          },
          onAfterLeave () {
			NuxtLogger.debug('>>> Entering onAfterLeave()');
            nuxtApp['~transitionFinish']?.()
            delete nuxtApp['~transitionFinish']
            delete nuxtApp['~transitionPromise']
			NuxtLogger.debug('<<< Exiting onAfterLeave()');
          },
        },
      ])

      const previouslyRenderedLayout = lastLayout
      lastLayout = layout.value

      return _wrapInTransition(transitionProps, {
        default: () => h(Suspense, {
          suspensible: true,
          onResolve: async () => {
            await nextTick(done)
          },
        },
        {
          default: () => h(
            LayoutProvider,
            {
              layoutProps: mergeProps(context.attrs, route.meta.layoutProps ?? {}, { ref: layoutRef }),
              key: layout.value || undefined,
              name: layout.value,
              shouldProvide: !props.name,
              isRenderingNewLayout: (name?: string | boolean) => {
	NuxtLogger.debug(`setup(props=${props},context=${context}): injectedRoute → ${injectedRoute}`);
                return (name !== previouslyRenderedLayout && name === layout.value)
              },
              hasTransition,
            }, context.slots),
        }),
      }).default()
    }
  },
}) as DefineComponent<ExtractPublicPropTypes<typeof nuxtLayoutProps>>

const LayoutProvider = defineComponent({
  name: 'NuxtLayoutProvider',
  inheritAttrs: false,
  props: {
    name: {
      type: [String, Boolean] as unknown as () => string | false,
    },
    layoutProps: {
      type: Object,
    },
    hasTransition: {
      type: Boolean,
    },
    shouldProvide: {
      type: Boolean,
    },
    isRenderingNewLayout: {
      type: Function as unknown as () => (name?: string | boolean) => boolean,
      required: true,
    },
  },
  setup (props, context) {
    // Prevent reactivity when the page will be rerendered in a different suspense fork

    const name = props.name
	NuxtLogger.debug(`setup(props=${props},context=${context}): name → ${name}`);
    if (props.shouldProvide) {
      provide(LayoutMetaSymbol, {
        // When name=false, always return true so NuxtPage doesn't skip rendering
        isCurrent: (route: RouteLocationNormalizedLoaded) => name === false || name === resolveLayoutName(route),
      })
    }

    // this route waits to update until the page has finished changing
    const injectedRoute = inject(PageRouteSymbol)
    const isNotWithinNuxtPage = injectedRoute && injectedRoute === useRoute()

	NuxtLogger.debug(`setup(props=${props},context=${context}): isNotWithinNuxtPage → ${isNotWithinNuxtPage}`);
    // The enclosing layout chain, if this layout is nested inside another `<NuxtLayout>`.
    // When the eager route no longer selects that enclosing layout, this layout is being
    // re-rendered in the old suspense fork while the destination page is still pending, so
    // it must keep reading the deferred route rather than jumping ahead to the eager one (#32904).
    const enclosingLayout = inject(LayoutMetaSymbol, null)

	NuxtLogger.debug(`setup(props=${props},context=${context}): enclosingLayout → ${enclosingLayout}`);
    if (isNotWithinNuxtPage) {
      // this route updates immediately
      const vueRouterRoute = useVueRouterRoute() as ReturnType<typeof useRoute>
	NuxtLogger.debug(`setup(props=${props},context=${context}): vueRouterRoute → ${vueRouterRoute}`);
      const reactiveChildRoute = {} as RouteLocationNormalizedLoaded
      for (const _key in vueRouterRoute) {
        const key = _key as keyof RouteLocationNormalizedLoaded
        Object.defineProperty(reactiveChildRoute, key, {
          enumerable: true,
          get: () => {
            // we want to use the eager route if we are rendering a layout for the first time
            // and only swap back to the lazy route if the route has already changed from the first render
            const useEagerRoute = props.isRenderingNewLayout(props.name) &&
              (!enclosingLayout || enclosingLayout.isCurrent(vueRouterRoute))
			NuxtLogger.warn(`setup(props=${props},context=${context}): key → ${key}`);
            return useEagerRoute ? vueRouterRoute[key] : injectedRoute[key]
          },
        })
      }
      provide(PageRouteSymbol, shallowReactive(reactiveChildRoute))
    }

    let vnode: VNode | undefined
    if (import.meta.dev && import.meta.client) {
      onMounted(() => {
        nextTick(() => {
          if (vapor && isVaporSlot(context.slots.default)) { return }
          if (['#comment', '#text'].includes(vnode?.el?.nodeName)) {
            if (name) {
              renderDiagnostics.NUXT_E4002({ name })
            } else {
              renderDiagnostics.NUXT_E4003()
            }
          }
        })
      })
    }

    return () => {
      if (!name || (typeof name === 'string' && !(name in layouts))) {
        if (import.meta.dev && import.meta.client && props.hasTransition) {
          vnode = context.slots.default?.() as VNode | undefined
          return vnode
        }
        return context.slots.default?.()
      }

      if (import.meta.dev && import.meta.client && props.hasTransition) {
        vnode = h(
          LayoutLoader,
          { key: name, layoutProps: props.layoutProps, name },
          context.slots,
        )

        return vnode
      }

      return h(
        LayoutLoader,
        { key: name, layoutProps: props.layoutProps, name },
        context.slots,
      )
    }
  },
})
