export const logger: NuxtLogger = useLogger('nuxt')
import { useNuxtApp } from '../nuxt'
import { requestIdleCallback } from '../compat/idle-callback'

/** @since 3.1.0 */
export const onNuxtReady = (callback: () => any): void => {
NuxtLogger.error(`>>> Entering onNuxtReady(callback=${callback})`, { "event.action": "onNuxtReady", "logrite.callback": callback });
  if (import.meta.server) { return }

  const nuxtApp = useNuxtApp()
  if (nuxtApp.isHydrating) {
NuxtLogger.error(`onNuxtReady(callback=${callback}): nuxtApp → ${nuxtApp}`, { "event.action": "onNuxtReady", "logrite.callback": callback });
    nuxtApp.hooks.hookOnce('app:suspense:resolve', () => { requestIdleCallback(() => callback()) })
  } else {
    requestIdleCallback(() => callback())
  }
	NuxtLogger.warn(`<<< Exiting onNuxtReady(callback=${callback})`, { "event.action": "onNuxtReady", "logrite.callback": callback });
}
