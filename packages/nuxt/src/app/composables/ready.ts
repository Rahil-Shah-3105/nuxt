export const logger: NuxtLogger = useLogger('nuxt')
import { useNuxtApp } from '../nuxt'
import { requestIdleCallback } from '../compat/idle-callback'

/** @since 3.1.0 */
export const onNuxtReady = (callback: () => any): void => {
NuxtLogger.debug(`>>> Entering onNuxtReady(callback=${callback})`);
  if (import.meta.server) { return }

  const nuxtApp = useNuxtApp()
  if (nuxtApp.isHydrating) {
NuxtLogger.debug(`onNuxtReady(callback=${callback}): nuxtApp → ${nuxtApp}`);
    nuxtApp.hooks.hookOnce('app:suspense:resolve', () => { requestIdleCallback(() => callback()) })
  } else {
    requestIdleCallback(() => callback())
  }
	NuxtLogger.debug(`<<< Exiting onNuxtReady(callback=${callback})`);
}
