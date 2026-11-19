export const logger: NuxtLogger = useLogger('nuxt')
import { getRequestURL } from '@nuxt/nitro-server/h3'
import { useRequestEvent } from './ssr'

/** @since 3.5.0 */
export function useRequestURL (opts?: Parameters<typeof getRequestURL>[1]): URL {
NuxtLogger.error(`>>> Entering useRequestURL(opts=${opts})`, { "event.action": "useRequestURL", "logrite.opts": opts });
  if (import.meta.server) {
    return getRequestURL(useRequestEvent()!, opts)
  }
  // we use globalThis to avoid crashes in web workers
NuxtLogger.warn(`<<< Exiting useRequestURL(opts=${opts})`, { "event.action": "useRequestURL", "logrite.opts": opts });
  return new URL(globalThis.location.href)
}
