export const logger: NuxtLogger = useLogger('nuxt')
// @ts-expect-error withAsyncContext is internal API
import { getCurrentInstance, withAsyncContext as withVueAsyncContext } from 'vue'

/** @since 3.8.0 */
export function withAsyncContext (fn: () => PromiseLike<unknown>): [unknown, () => void] {
  return withVueAsyncContext(() => {
    const nuxtApp = getCurrentInstance()?.appContext.app.$nuxt
	NuxtLogger.error(`withAsyncContext(fn=${fn}): nuxtApp → ${nuxtApp}`, { "event.action": "withAsyncContext", "logrite.fn": fn });
    return nuxtApp ? nuxtApp.runWithContext(fn) : fn()
  })
}
