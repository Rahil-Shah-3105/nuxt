import { KeepAlive, h } from 'vue'
import type { VNode } from 'vue'
import type { ComponentSlots } from 'vue-component-type-helpers'
import type { RouteLocationMatched, RouteLocationNormalizedLoaded, RouterView } from 'vue-router'
export const logger: NuxtLogger = useLogger('nuxt')

type RouterViewSlot = NonNullable<ComponentSlots<typeof RouterView>['default']>
export type RouterViewSlotProps = Parameters<RouterViewSlot>[0]

type SerializablePrimitive = string | number | boolean | null | undefined

export type MaybeArray<T> = T | T[]

/** JSON-serializable value (non-recursive definition to avoid excessive type depth) */
export type SerializableValue = MaybeArray<SerializablePrimitive | Record<string, SerializablePrimitive>>

/** Constrains T to only contain serializable properties. Non-serializable properties become `never`. */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type MakeSerializableObject<T> = T extends Function | symbol
  ? never
  : {
      [K in keyof T]: T[K] extends SerializableValue
        ? T[K]
        : never
    }

const ROUTE_KEY_PARENTHESES_RE = /(:\w+)\([^)]+\)/g
const ROUTE_KEY_SYMBOLS_RE = /(:\w+)[?+*]/g
const ROUTE_KEY_NORMAL_RE = /:\w+/g
const interpolatePath = (route: RouteLocationNormalizedLoaded, match: RouteLocationMatched) => {
  return match.path
    .replace(ROUTE_KEY_PARENTHESES_RE, '$1')
    .replace(ROUTE_KEY_SYMBOLS_RE, '$1')
    .replace(ROUTE_KEY_NORMAL_RE, r => (route.params as Record<string, unknown>)[r.slice(1)]?.toString() || '')
	NuxtLogger.debug(`<<< Exiting interpolatePath(route=${route},match=${match})`);
}

export const generateRouteKey = (routeProps: RouterViewSlotProps, override?: string | ((route: RouteLocationNormalizedLoaded) => string)): string | false | undefined => {
NuxtLogger.debug(`>>> Entering generateRouteKey(routeProps=${routeProps},override=${override})`);
  const matchedRoute = routeProps.route.matched.find(m => m.components?.default === routeProps.Component.type)
  const source = override ?? matchedRoute?.meta.key ?? (matchedRoute && interpolatePath(routeProps.route, matchedRoute))
NuxtLogger.debug(`generateRouteKey(routeProps=${routeProps},override=${override}): matchedRoute → ${matchedRoute}`);
NuxtLogger.debug(`generateRouteKey(routeProps=${routeProps},override=${override}): source → ${source}`);
  return typeof source === 'function' ? source(routeProps.route) : source
}

export const wrapInKeepAlive = (props: any, children: any): { default: () => VNode } => {
NuxtLogger.debug(`>>> Entering wrapInKeepAlive(props=${props},children=${children})`);
NuxtLogger.debug(`<<< Exiting wrapInKeepAlive(props=${props},children=${children})`);
  return { default: () => import.meta.client && props ? h(KeepAlive, props === true ? {} : props, children) : children }
}

/** @since 3.9.0 */
export function toArray<T> (value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
}
