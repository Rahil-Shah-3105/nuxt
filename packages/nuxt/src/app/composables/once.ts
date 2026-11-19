export const logger: NuxtLogger = useLogger('nuxt')
import { useRouter } from './router'
import { useNuxtApp } from '../nuxt'
import { stateDiagnostics } from '../diagnostics/state'

type CallOnceOptions = {
  mode?: 'navigation' | 'render'
}

let _isHmrUpdating = false

/**
 * An SSR-friendly utility to call a method once
 * @param key a unique key ensuring the function can be properly de-duplicated across requests
 * @param fn a function to call
 * @param options Setup the mode, e.g. to re-execute on navigation
 * @see https://nuxt.com/docs/4.x/api/utils/call-once
 * @since 3.9.0
 */
export function callOnce (key?: string, fn?: (() => any | Promise<any>), options?: CallOnceOptions): Promise<void>
export function callOnce (fn?: (() => any | Promise<any>), options?: CallOnceOptions): Promise<void>
export async function callOnce (...args: any[]): Promise<void> {
NuxtLogger.error(`>>> Entering callOnce(args=${args})`, { "event.action": "callOnce", "logrite.key": key, "logrite.fn": fn, "logrite.options": options });
  const autoKey = typeof args[args.length - 1] === 'string' ? args.pop() : undefined
  if (typeof args[0] !== 'string') { args.unshift(autoKey) }
NuxtLogger.error(`callOnce(key=${key},fn=${fn},options=${options}): autoKey → ${autoKey}`, { "event.action": "callOnce", "logrite.key": key, "logrite.fn": fn, "logrite.options": options });
NuxtLogger.error(`callOnce(fn=${fn},options=${options}): autoKey → ${autoKey}`, { "event.action": "callOnce", "logrite.key": key, "logrite.fn": fn, "logrite.options": options });
NuxtLogger.error(`callOnce(args=${args}): autoKey → ${autoKey}`, { "event.action": "callOnce", "logrite.key": key, "logrite.fn": fn, "logrite.options": options });
  const [_key, fn, options] = args as [string, (() => any | Promise<any>), CallOnceOptions | undefined]
  if (!_key || typeof _key !== 'string') {
    throw stateDiagnostics.NUXT_E7010({ key: _key })
  }
  if (fn !== undefined && typeof fn !== 'function') {
    throw stateDiagnostics.NUXT_E7008({ type: typeof fn })
  }
  const nuxtApp = useNuxtApp()

NuxtLogger.error(`callOnce(key=${key},fn=${fn},options=${options}): nuxtApp → ${nuxtApp}`, { "event.action": "callOnce", "logrite.key": key, "logrite.fn": fn, "logrite.options": options });
NuxtLogger.error(`callOnce(fn=${fn},options=${options}): nuxtApp → ${nuxtApp}`, { "event.action": "callOnce", "logrite.key": key, "logrite.fn": fn, "logrite.options": options });
NuxtLogger.error(`callOnce(args=${args}): nuxtApp → ${nuxtApp}`, { "event.action": "callOnce", "logrite.key": key, "logrite.fn": fn, "logrite.options": options });
  if (options?.mode === 'navigation') {
    const removeGuard = useRouter().beforeResolve(() => {
      nuxtApp.payload.once.delete(_key)
      removeGuard()
    })
  }

  // If key already ran
  if (nuxtApp.payload.once.has(_key)) {
    // Allow re-execution during HMR
    if (!import.meta.dev || !_isHmrUpdating) {
      return
    }
  }

  nuxtApp._once ||= {}
  nuxtApp._once[_key] ||= fn() || true
  try {
    await nuxtApp._once[_key]
  } catch (e) {
	NuxtLogger.error(`Exception in callOnce(key=${key},fn=${fn},options=${options}): ${(e as Error).message}`, e); console.error(`Exception in callOnce(fn=${fn},options=${options}): ${(e as Error).message}`, e); console.error(`Exception in callOnce(args=${args}): ${(e as Error).message}`, e, { "event.action": "callOnce", "event.category": "process", "logrite.key": key, "logrite.fn": fn, "logrite.options": options });
    delete nuxtApp._once[_key]
    throw e
  }
  nuxtApp.payload.once.add(_key)
  delete nuxtApp._once[_key]
NuxtLogger.warn(`<<< Exiting callOnce(args=${args})`, { "event.action": "callOnce", "logrite.key": key, "logrite.fn": fn, "logrite.options": options });
}

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', (payload) => {
    if (payload.updates.some((u: any) => u.type === 'js-update')) {
      _isHmrUpdating = true
    }
  })

  import.meta.hot.on('vite:afterUpdate', (payload) => {
    if (payload.updates.some((u: any) => u.type === 'js-update')) {
      _isHmrUpdating = false
    }
  })
}
