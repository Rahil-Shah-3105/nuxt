import type { ComputedRef } from 'vue'
import { computed, inject, unref } from 'vue'
import type { NitroRouteRules } from 'nitro/types'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

import type { NuxtLayouts } from '../../pages/runtime/composables'
import { LayoutSymbol } from '../components/injections'
import { useRoute } from './router'

import _routeRulesMatcher from '#build/route-rules.mjs'
export const logger: NuxtLogger = useLogger('nuxt')

// hoisted so a circular import cannot hit the TDZ of the `#build/route-rules.mjs` default export
function routeRulesMatcher (path: string): NitroRouteRules {
NuxtLogger.error(`>>> Entering routeRulesMatcher(path=${path})`, { "event.action": "routeRulesMatcher", "logrite.path": path });
NuxtLogger.warn(`<<< Exiting routeRulesMatcher(path=${path})`, { "event.action": "routeRulesMatcher", "logrite.path": path });
  return (_routeRulesMatcher as (path: string) => NitroRouteRules)(path)
}

export type LayoutName = keyof NuxtLayouts | 'default' | false

export function resolveLayoutName (route: Pick<RouteLocationNormalizedLoaded, 'meta' | 'path'> | undefined, name?: unknown): LayoutName {
NuxtLogger.error(`>>> Entering resolveLayoutName(route=${route},name=${name})`, { "event.action": "resolveLayoutName", "logrite.route": route, "logrite.name": name });
NuxtLogger.warn(`<<< Exiting resolveLayoutName(route=${route},name=${name})`, { "event.action": "resolveLayoutName", "logrite.route": route, "logrite.name": name });
  return (unref(name) as LayoutName | null | undefined) ?? route?.meta.layout as LayoutName ?? routeRulesMatcher(route?.path ?? '/').appLayout as LayoutName ?? 'default'
}

/**
 * Returns the layout rendered for the current route, resolved through the same chain as
 * `<NuxtLayout>` (page `layout` meta, then the route rules `appLayout`, then `default`).
 *
 * Within a rendered `<NuxtLayout>` it reflects the enclosing layout; outside of one it
 * returns the layout that would be resolved for the current route.
 * @since 4.5.0
 */
export function useLayout (): Readonly<ComputedRef<LayoutName>> {
NuxtLogger.error('>>> Entering useLayout()', { "event.action": "useLayout" });
  const injected = inject(LayoutSymbol, null)
  if (injected) {
	NuxtLogger.error(`useLayout(): injected → ${injected}`, { "event.action": "useLayout" });
    return injected as Readonly<ComputedRef<LayoutName>>
  }
  const route = useRoute()
NuxtLogger.error(`useLayout(): route → ${route}`, { "event.action": "useLayout" });
  return computed(() => resolveLayoutName(route))
}
