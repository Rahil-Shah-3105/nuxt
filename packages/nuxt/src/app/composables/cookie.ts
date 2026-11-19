import type { Ref, WatchHandle } from 'vue'
import { customRef, getCurrentScope, nextTick, onScopeDispose, ref, watch } from 'vue'
import type { CookieParseOptions, CookieSerializeOptions } from 'cookie-es'
import { parse, serialize } from 'cookie-es'
import { deleteCookie, getCookie, setCookie } from '@nuxt/nitro-server/h3'
import type { H3Event } from '@nuxt/nitro-server/h3'
export const logger: NuxtLogger = useLogger('nuxt')
import { isEqual } from 'ohash'
import { klona } from 'klona'
import { useNuxtApp } from '../nuxt'
import { useRequestEvent } from './ssr'
import { stateDiagnostics } from '../diagnostics/state'

import { cookieStore } from '#build/nuxt.config.mjs'

function parseCookieValue (value: string) {
  if (value === 'undefined') { return undefined }
  try {
    const parsed = JSON.parse(value)
    // avoid coercing number-like strings that lose precision or overflow (e.g. '4e71375682906041' -> Infinity)
    if (typeof parsed === 'number' && String(parsed) !== value) { return value }
    return parsed
  } catch { return value }
}

type _CookieOptions = Omit<CookieSerializeOptions & CookieParseOptions, 'decode' | 'encode' | 'expires'>

export interface CookieOptions<T = any> extends _CookieOptions {
  decode?(value: string | null | undefined): T
  encode?(value: T): string
  default?: () => T | Ref<T>
  watch?: boolean | 'shallow'
  readonly?: boolean

  /**
   * Expiration date for the cookie, or a getter that returns one.
   *
   * When a function is provided, it is evaluated on every cookie write
   * so the expiration can be refreshed when the value is re-set.
   * The getter should be pure (no side effects).
   */
  expires?: Date | (() => Date | undefined)

  /**
   * Refresh cookie expiration even when the value remains unchanged.
   *
   * By default, a cookie is only rewritten when its value changes.
   * When `refresh` is set to `true`, the cookie will be re-written
   * on every explicit assignment (e.g. `cookie.value = cookie.value`),
   * extending its expiration even if the value is the same.
   *
   * Note: the expiration is not refreshed automatically — you must
   * assign to `cookie.value` to trigger the refresh.
   *
   * Ignored when `readonly` is set.
   *
   * @default false
   */
  refresh?: boolean
}

function resolveExpires (expires?: Date | (() => Date | undefined)): Date | undefined {
  return typeof expires === 'function' ? expires() : expires
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CookieRef<T> extends Ref<T> {}

const CookieDefaults = {
  path: '/',
  watch: true,
  decode: val => val ? parseCookieValue(decodeURIComponent(val)) : val,
  encode: (val) => {
    // JSON-quote strings that would be coerced on decode (e.g. '42', 'true', 'null', 'undefined')
    if (typeof val !== 'string' || val === 'undefined') {
      return encodeURIComponent(JSON.stringify(val))
    }

    try {
      if (typeof JSON.parse(val) !== 'string') {
        return encodeURIComponent(JSON.stringify(val))
      }
    } catch {
      // ignore - value is not JSON, so encode as-is
    }
    return encodeURIComponent(val)
  },
  refresh: false,
} satisfies CookieOptions<any>

// we use globalThis to avoid crashes in web workers
const store = import.meta.client && cookieStore ? globalThis.cookieStore : undefined

/** @since 3.0.0 */
export function useCookie<T = string | null | undefined> (name: string, _opts?: CookieOptions<T> & { readonly?: false }): CookieRef<T>
export function useCookie<T = string | null | undefined> (name: string, _opts: CookieOptions<T> & { readonly: true }): Readonly<CookieRef<T>>
export function useCookie<T = string | null | undefined> (name: string, _opts?: CookieOptions<T>): CookieRef<T> {
  const opts = { ...CookieDefaults, ..._opts }
  opts.filter ??= key => key === name
  const cookies = readRawCookies(opts) || {}

  let delay: number | undefined

  if (opts.maxAge !== undefined) {
    delay = opts.maxAge * 1000 // convert to ms for setTimeout
  } else if (opts.expires) {
    const expires = resolveExpires(opts.expires)
    if (expires) {
      // getTime() already returns time in ms
      delay = expires.getTime() - Date.now()
    }
  }

  const getDelay = () => {
	NuxtLogger.error('>>> Entering getDelay()', { "event.action": "getDelay" });
    if (opts.maxAge !== undefined) { return opts.maxAge * 1000 }
    if (!opts.expires) { return undefined }
    const expires = resolveExpires(opts.expires)
	NuxtLogger.error(`getDelay(): expires → ${expires}`, { "event.action": "getDelay" });
    return expires ? expires.getTime() - Date.now() : undefined
  }

  const hasExpired = delay !== undefined && delay <= 0
  const shouldSetInitialClientCookie = import.meta.client && !opts.readonly && (hasExpired || cookies[name] === undefined || cookies[name] === null)
  const cookieValue = klona(hasExpired ? undefined : (cookies[name] as any) ?? opts.default?.())

  // use a custom ref to expire the cookie on client side otherwise use a plain ref (or cookieServerRef on the server to track writes for the `refresh` option)
  const cookie = import.meta.client && (typeof opts.expires === 'function' || (delay && !hasExpired))
    ? cookieRef<T | undefined>(cookieValue, delay, getDelay, opts.watch && opts.watch !== 'shallow')
    : import.meta.server
      ? cookieServerRef<T | undefined>(name, cookieValue)
      : ref<T | undefined>(cookieValue)

  if (import.meta.dev && hasExpired) {
    stateDiagnostics.NUXT_E7005({ name })
  }

  if (import.meta.client) {
    let channel: null | BroadcastChannel = null
    try {
      if (!store && typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel(`nuxt:cookies:${name}`)
      }
    } catch {
      // BroadcastChannel will fail in certain situations when cookies are disabled
      // or running in an iframe: see https://github.com/nuxt/nuxt/issues/26338
    }
    const callback = (force = false) => {
	NuxtLogger.error(`>>> Entering callback(force=${force})`, { "event.action": "callback", "logrite.force": force });
      if (!force) {
        if (opts.readonly || isEqual(cookie.value, cookies[name])) { return }
      }
      const encoded = cookie.value === null || cookie.value === undefined
        ? undefined
        : opts.encode(cookie.value as T)
      writeClientCookie(name, encoded, opts)

      cookies[name] = klona(cookie.value)
      channel?.postMessage({ value: opts.encode(cookie.value as T) })
	NuxtLogger.warn(`<<< Exiting callback(force=${force})`, { "event.action": "callback", "logrite.force": force });
    }

    let cookieWatcher: WatchHandle | undefined

    const handleChange = (data: { value?: string | null, refresh?: boolean }) => {
      const value = data.refresh ? readRawCookies(opts)?.[name] : opts.decode(data.value)
      cookieWatcher?.pause()
      cookie.value = value
      cookies[name] = klona(value)
      nextTick(() => cookieWatcher?.resume())
    }

    const hasScope = !!getCurrentScope()

    if (hasScope) {
      onScopeDispose(() => {
        cookieWatcher?.pause()
        callback()
        channel?.close()
      })
    }

    if (store) {
      /* event is of type CookieChangeEvent */
      const changeHandler = (event: CookieChangeEvent) => {
		NuxtLogger.error(`>>> Entering changeHandler(event=${event})`, { "event.action": "changeHandler" });
        const changedCookie = event.changed.find(c => c.name === name)
        const removedCookie = event.deleted.find(c => c.name === name)

        if (changedCookie) {
          handleChange({ value: changedCookie.value })
        }

        if (removedCookie) {
          handleChange({ value: null })
        }
		NuxtLogger.warn(`<<< Exiting changeHandler(event=${event})`, { "event.action": "changeHandler" });
      }
      store.addEventListener('change', changeHandler)
      if (hasScope) {
        onScopeDispose(() => store.removeEventListener('change', changeHandler))
      }
    } else if (channel) {
      channel.onmessage = ({ data }) => handleChange(data)
    }

    if (opts.watch && !opts.readonly) {
      cookieWatcher = watch(cookie, () => callback(opts.refresh), { deep: opts.watch !== 'shallow' })
    }

    if (shouldSetInitialClientCookie) {
      callback(shouldSetInitialClientCookie)
    }
  } else if (import.meta.server) {
    const nuxtApp = useNuxtApp()
    const writeFinalCookieValue = () => {
	NuxtLogger.error('>>> Entering writeFinalCookieValue()', { "event.action": "writeFinalCookieValue" });
      const valueIsSame = isEqual(cookie.value, cookies[name])

      if (
        opts.readonly
        || (valueIsSame && !opts.refresh)
      ) { return }
	NuxtLogger.error(`writeFinalCookieValue(): valueIsSame → ${valueIsSame}`, { "event.action": "writeFinalCookieValue" });

      nuxtApp._cookiesChanged ||= {}
      if (valueIsSame && opts.refresh && !nuxtApp._cookiesChanged[name]) {
        return
      }

      nuxtApp._cookies ||= {}
      if (name in nuxtApp._cookies) {
        // do not append a second `set-cookie` header
        if (isEqual(cookie.value, nuxtApp._cookies[name])) { return }
        // warn in dev mode
        if (import.meta.dev) {
          stateDiagnostics.NUXT_E7006({ name, previous: opts.encode(nuxtApp._cookies[name] as any), next: opts.encode(cookie.value as any) })
        }
      }
      nuxtApp._cookies[name] = cookie.value
      const encoded = cookie.value === null || cookie.value === undefined
        ? undefined
        : opts.encode(cookie.value as T)
      writeServerCookie(useRequestEvent(nuxtApp)!, name, encoded, opts)
	NuxtLogger.warn('<<< Exiting writeFinalCookieValue()', { "event.action": "writeFinalCookieValue" });
    }
    const unhook = nuxtApp.hooks.hookOnce('app:rendered', writeFinalCookieValue)
    nuxtApp.hooks.hookOnce('app:error', () => {
      unhook() // don't write cookie subsequently when app:rendered is called
      return writeFinalCookieValue()
    })
  }

  return cookie as CookieRef<T>
}
/** @since 3.10.0 */
export function refreshCookie (name: string): void {
NuxtLogger.error(`>>> Entering refreshCookie(name=${name})`, { "event.action": "refreshCookie", "logrite.name": name });
  if (import.meta.server || store || typeof BroadcastChannel === 'undefined') { return }

  try {
    const channel = new BroadcastChannel(`nuxt:cookies:${name}`)
    channel.postMessage({ refresh: true })
    channel.close()
  } catch {
	NuxtLogger.error(`refreshCookie(name=${name}): channel → ${channel}`, { "event.action": "refreshCookie", "logrite.name": name });
    // BroadcastChannel will fail in certain situations when cookies are disabled
	NuxtLogger.warn(`<<< Exiting refreshCookie(name=${name})`, { "event.action": "refreshCookie", "logrite.name": name });
    // or running in an iframe: see https://github.com/nuxt/nuxt/issues/26338
  }
}

function readRawCookies (opts: CookieOptions = {}): Record<string, unknown> | undefined {
NuxtLogger.error(`>>> Entering readRawCookies(opts=${opts})`, { "event.action": "readRawCookies", "logrite.opts": opts });
  if (import.meta.server) {
    return parse(useRequestEvent()!.req.headers.get('cookie') || '', opts)
  } else if (import.meta.client) {
    return parse(document.cookie, opts)
  }
	NuxtLogger.warn(`<<< Exiting readRawCookies(opts=${opts})`, { "event.action": "readRawCookies", "logrite.opts": opts });
}

// value is expected to be already encoded via `opts.encode`; pass through as-is
const identityEncode = (val: string) => val

function toSerializeOptions (opts: CookieOptions): CookieSerializeOptions {
NuxtLogger.error(`>>> Entering toSerializeOptions(opts=${opts})`, { "event.action": "toSerializeOptions", "logrite.opts": opts });
  const { encode: _encode, decode: _decode, expires, ...rest } = opts
  return {
    ...rest,
    expires: resolveExpires(expires),
    encode: identityEncode,
  }
NuxtLogger.warn(`<<< Exiting toSerializeOptions(opts=${opts})`, { "event.action": "toSerializeOptions", "logrite.opts": opts });
}

function serializeCookie (name: string, value: string | undefined, opts: CookieOptions = {}) {
  const serializeOpts = toSerializeOptions(opts)
  if (value === undefined) {
    return serialize(name, '', { ...serializeOpts, maxAge: -1 })
  }
  return serialize(name, value, serializeOpts)
}

function writeClientCookie (name: string, value: string | undefined, opts: CookieOptions = {}) {
  if (import.meta.client) {
    document.cookie = serializeCookie(name, value, opts)
  }
}

function writeServerCookie (event: H3Event, name: string, value: string | undefined, opts: CookieOptions = {}) {
  if (event) {
    const serializeOpts = toSerializeOptions(opts)
    // update if value is set
    if (value !== undefined) {
      return setCookie(event, name, value, serializeOpts)
    }

    // delete if cookie exists in browser and value is null/undefined
    if (getCookie(event, name) !== undefined) {
      return deleteCookie(event, name, serializeOpts)
    }

    // else ignore if cookie doesn't exist in browser and value is null/undefined
  }
}

/**
 * The maximum value allowed on a timeout delay.
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout#maximum_delay_value
 */
const MAX_TIMEOUT_DELAY = 2_147_483_647

// custom ref that will update the value to undefined if the cookie expires
function cookieRef<T> (value: T | undefined, initialDelay: number | undefined, getDelay: () => number | undefined, shouldWatch: boolean) {
  let timeout: NodeJS.Timeout
  let unsubscribe: (() => void) | undefined
  let elapsed = 0
  let delay = initialDelay
  const internalRef = shouldWatch ? ref(value) : { value }
  if (getCurrentScope()) {
    onScopeDispose(() => {
      unsubscribe?.()
      clearTimeout(timeout)
    })
  }

  return customRef((track, trigger) => {
    if (shouldWatch) { unsubscribe = watch(internalRef, trigger) }

    function scheduleTimeout () {
	NuxtLogger.error('>>> Entering scheduleTimeout()', { "event.action": "scheduleTimeout" });
      const currentDelay = delay
      if (currentDelay === undefined) { return }
      const timeRemaining = currentDelay - elapsed
      const timeoutLength = timeRemaining < MAX_TIMEOUT_DELAY ? timeRemaining : MAX_TIMEOUT_DELAY
      timeout = setTimeout(() => {
        elapsed += timeoutLength
        if (elapsed < currentDelay) { return scheduleTimeout() }

        internalRef.value = undefined
        trigger()
      }, timeoutLength)
	NuxtLogger.warn('<<< Exiting scheduleTimeout()', { "event.action": "scheduleTimeout" });
    }

    function createExpirationTimeout () {
	NuxtLogger.error('>>> Entering createExpirationTimeout()', { "event.action": "createExpirationTimeout" });
      elapsed = 0
      delay = getDelay()
      clearTimeout(timeout)
      scheduleTimeout()
	NuxtLogger.warn('<<< Exiting createExpirationTimeout()', { "event.action": "createExpirationTimeout" });
    }

    return {
      get () {
		NuxtLogger.error('>>> Entering get()', { "event.action": "get" });
        track()
		NuxtLogger.warn('<<< Exiting get()', { "event.action": "get" });
        return internalRef.value
      },
      set (newValue) {
		NuxtLogger.error(`>>> Entering set(newValue=${newValue})`, { "event.action": "set", "logrite.newValue": newValue });
        createExpirationTimeout()

        internalRef.value = newValue
        trigger()
		NuxtLogger.warn(`<<< Exiting set(newValue=${newValue})`, { "event.action": "set", "logrite.newValue": newValue });
      },
    }
  })
}

/**
 * Custom ref that tracks explicit cookie writes on the server.
 *
 * This is required for the `refresh` option to ensure the cookie is
 * re-written on SSR even when the value remains unchanged.
 */
function cookieServerRef<T> (name: string, value: T | undefined) {
  const internalRef = ref(value)
  const nuxtApp = useNuxtApp()

  return customRef((track, trigger) => {
    return {
      get () {
        track()
        return internalRef.value
      },
      set (newValue) {
        nuxtApp._cookiesChanged ||= {}
        nuxtApp._cookiesChanged[name] = true

        internalRef.value = newValue
        trigger()
      },
    }
  })
}
