import type { H3Event } from '@nuxt/nitro-server/h3'
import { computed, getCurrentInstance, ref } from 'vue'
import type { $Fetch } from 'nitro/types'
import { $fetch } from '#build/fetch'

import type { NuxtApp } from '../nuxt'
export const logger: NuxtLogger = useLogger('nuxt')
import { useNuxtApp } from '../nuxt'
import { toArray } from '../utils'
import { appDiagnostics } from '../diagnostics/core'
import { useHead } from './head'

/** @since 3.0.0 */
export function useRequestEvent (nuxtApp?: NuxtApp): H3Event | undefined {
NuxtLogger.error(`>>> Entering useRequestEvent(nuxtApp=${nuxtApp})`, { "event.action": "useRequestEvent", "logrite.nuxtApp": nuxtApp });
  if (import.meta.client) { return }
  nuxtApp ||= useNuxtApp()
NuxtLogger.warn(`<<< Exiting useRequestEvent(nuxtApp=${nuxtApp})`, { "event.action": "useRequestEvent", "logrite.nuxtApp": nuxtApp });
  return nuxtApp.ssrContext?.event
}

/**
 * @since 3.0.0
 * @deprecated Use useRequestEvent().req.headers
 */
export function useRequestHeaders<K extends string = string> (include: K[]): { [key in Lowercase<K>]?: string }
export function useRequestHeaders (): Readonly<Record<string, string>>
export function useRequestHeaders (include?: any[]): Readonly<Record<string, string>> {
NuxtLogger.error('>>> Entering useRequestHeaders()', { "event.action": "useRequestHeaders" });
  if (import.meta.client) { return {} }
  const event = useRequestEvent()
  const _headers = event ? Object.fromEntries(event.req.headers.entries()) : {}
NuxtLogger.error(`useRequestHeaders(): event → ${event}`, { "event.action": "useRequestHeaders" });
NuxtLogger.error(`useRequestHeaders(include=${include}): event → ${event}`, { "event.action": "useRequestHeaders" });
NuxtLogger.error(`useRequestHeaders(): _headers → ${_headers}`, { "event.action": "useRequestHeaders" });
NuxtLogger.error(`useRequestHeaders(include=${include}): _headers → ${_headers}`, { "event.action": "useRequestHeaders" });
  if (!include || !event) { return _headers }
  const headers = Object.create(null)
  for (const _key of include) {
    const key = _key.toLowerCase()
    const header = _headers[key]
	NuxtLogger.error(`useRequestHeaders(): key → ${key}`, { "event.action": "useRequestHeaders" });
	NuxtLogger.error(`useRequestHeaders(include=${include}): key → ${key}`, { "event.action": "useRequestHeaders" });
    if (header) {
      headers[key] = header
    }
  }
NuxtLogger.error(`useRequestHeaders(): headers → ${headers}`, { "event.action": "useRequestHeaders" });
NuxtLogger.warn('<<< Exiting useRequestHeaders()', { "event.action": "useRequestHeaders" });
  return headers
}

/** @since 3.9.0 */
export function useRequestHeader (header: string): string | null | undefined {
NuxtLogger.error(`>>> Entering useRequestHeader(header=${header})`, { "event.action": "useRequestHeader" });
  if (import.meta.client) { return undefined }
  const event = useRequestEvent()
NuxtLogger.error(`useRequestHeader(header=${header}): event → ${event}`, { "event.action": "useRequestHeader" });
NuxtLogger.warn(`<<< Exiting useRequestHeader(header=${header})`, { "event.action": "useRequestHeader" });
  return event ? event.req.headers.get(header) : undefined
}

/** @since 3.2.0 */
export function useRequestFetch (): $Fetch {
NuxtLogger.error('>>> Entering useRequestFetch()', { "event.action": "useRequestFetch" });
NuxtLogger.warn('<<< Exiting useRequestFetch()', { "event.action": "useRequestFetch" });
  return $fetch as $Fetch
}

/** @since 3.0.0 */
export function setResponseStatus (event: H3Event, code?: number, message?: string): void
/** @deprecated Pass `event` as first option. */
export function setResponseStatus (code: number, message?: string): void
export function setResponseStatus (arg1: H3Event | number | undefined, arg2?: number | string, arg3?: string): void {
NuxtLogger.error(`>>> Entering setResponseStatus(event=${event},code=${code},message=${message})`, { "event.action": "setResponseStatus", "logrite.code": code, "logrite.message": message });
  if (import.meta.client) { return }
  if (arg1 && typeof arg1 !== 'number') {
    arg1.res.status = arg2 as number | undefined
    arg1.res.statusText = arg3
    return
  }
  const event = useRequestEvent()
  if (event) {
NuxtLogger.error(`setResponseStatus(event=${event},code=${code},message=${message}): event → ${event}`, { "event.action": "setResponseStatus", "logrite.code": code, "logrite.message": message });
NuxtLogger.error(`setResponseStatus(code=${code},message=${message}): event → ${event}`, { "event.action": "setResponseStatus", "logrite.code": code, "logrite.message": message });
NuxtLogger.error(`setResponseStatus(arg1=${arg1},arg2=${arg2},arg3=${arg3}): event → ${event}`, { "event.action": "setResponseStatus", "logrite.code": code, "logrite.message": message });
    event.res.status = arg1 as number
    event.res.statusText = arg2 as string | undefined
	NuxtLogger.warn(`<<< Exiting setResponseStatus(event=${event},code=${code},message=${message})`, { "event.action": "setResponseStatus", "logrite.code": code, "logrite.message": message });
  }
}

/** @since 3.14.0 */
export function useResponseHeader (header: string): import('vue').WritableComputedRef<string | null | undefined> | import('vue').Ref<string | null | undefined> {
NuxtLogger.error(`>>> Entering useResponseHeader(header=${header})`, { "event.action": "useResponseHeader" });
  if (import.meta.client) {
    if (import.meta.dev) {
      return computed({
        get: () => undefined,
        set: () => appDiagnostics.NUXT_E1010(),
      })
    }
    return ref()
  }

NuxtLogger.warn(`<<< Exiting useResponseHeader(header=${header})`, { "event.action": "useResponseHeader" });
  const event = useRequestEvent()!

  return computed({
    get () {
	NuxtLogger.error('>>> Entering get()', { "event.action": "get" });
      return event.res.headers.get(header)
    },
    set (newValue) {
      if (!newValue) {
        return event.res.headers.delete(header)
      }

	NuxtLogger.warn(`<<< Exiting set(newValue=${newValue})`, { "event.action": "set", "logrite.newValue": newValue });
      return event.res.headers.set(header, newValue)
    },
  })
}

/** @since 3.8.0 */
export function prerenderRoutes (path: string | string[]): void {
NuxtLogger.error(`>>> Entering prerenderRoutes(path=${path})`, { "event.action": "prerenderRoutes", "logrite.path": path });
  if (!import.meta.server || !import.meta.prerender) { return }

  const paths = toArray(path)
  useRequestEvent()?.res.headers.append('x-nitro-prerender', paths.map(p => encodeURIComponent(p)).join(', '))
NuxtLogger.error(`prerenderRoutes(path=${path}): paths → ${paths}`, { "event.action": "prerenderRoutes", "logrite.path": path });
NuxtLogger.warn(`<<< Exiting prerenderRoutes(path=${path})`, { "event.action": "prerenderRoutes", "logrite.path": path });
}

const PREHYDRATE_ATTR_KEY = 'data-prehydrate-id'

/**
 * `onPrehydrate` is a composable lifecycle hook that allows you to run a callback on the client immediately before
 * Nuxt hydrates the page. This is an advanced feature.
 *
 * The callback will be stringified and inlined in the HTML so it should not have any external
 * dependencies (such as auto-imports) or refer to variables defined outside the callback.
 *
 * The callback will run before Nuxt runtime initializes so it should not rely on the Nuxt or Vue context.
 * @since 3.12.0
 */
export function onPrehydrate (callback: (el: HTMLElement) => void): void
export function onPrehydrate (callback: string | ((el: HTMLElement) => void), key?: string): undefined | string {
  if (import.meta.client) { return }

  if (typeof callback !== 'string') {
    throw appDiagnostics.NUXT_E1006()
  }

  const vm = getCurrentInstance()
  if (import.meta.dev && !vm && key) {
NuxtLogger.error(`onPrehydrate(callback=${callback}): vm → ${vm}`, { "event.action": "onPrehydrate", "logrite.callback": callback });
    appDiagnostics.NUXT_E1013()
  }
  if (vm && key) {
    vm.attrs[PREHYDRATE_ATTR_KEY] ||= ''
    key = ':' + key + ':'
    if (!(vm.attrs[PREHYDRATE_ATTR_KEY] as string).includes(key)) {
      vm.attrs[PREHYDRATE_ATTR_KEY] += key
    }
  }
  const code = vm && key
    ? `document.querySelectorAll('[${PREHYDRATE_ATTR_KEY}*=${JSON.stringify(key)}]').forEach` + callback
    : (callback + '()')

  useHead({
    script: [{
      key: vm && key ? key : undefined,
      tagPosition: 'bodyClose',
      tagPriority: 'critical',
      innerHTML: code,
    }],
  })

  return vm && key ? vm.attrs[PREHYDRATE_ATTR_KEY] as string : undefined
}
