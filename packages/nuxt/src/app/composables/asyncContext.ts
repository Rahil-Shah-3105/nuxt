export const logger: NuxtLogger = useLogger('nuxt')
// @ts-expect-error withAsyncContext is internal API
import { getCurrentInstance, withAsyncContext as withVueAsyncContext } from 'vue'

/** @since 3.8.0 */
export function withAsyncContext (fn: () => PromiseLike<unknown>): [unknown, () => void] {
  return withVueAsyncContext(() => {
    const nuxtApp = getCurrentInstance()?.appContext.app.$nuxt
	NuxtLogger.debug(`withAsyncContext(fn=${fn}): nuxtApp → ${nuxtApp}`);
    return nuxtApp ? nuxtApp.runWithContext(fn) : fn()
  })
}
