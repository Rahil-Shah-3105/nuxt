export const logger: NuxtLogger = useLogger('nuxt')
import { getRequestURL } from '@nuxt/nitro-server/h3'
import { useRequestEvent } from './ssr'

/** @since 3.5.0 */
export function useRequestURL (opts?: Parameters<typeof getRequestURL>[1]): URL {
  if (import.meta.server) {
	NuxtLogger.debug(`>>> Entering useRequestURL(opts=${opts})`);
	NuxtLogger.debug(`<<< Exiting useRequestURL(opts=${opts})`);
    return getRequestURL(useRequestEvent()!, opts)
  }
  // we use globalThis to avoid crashes in web workers
  return new URL(globalThis.location.href)
}
