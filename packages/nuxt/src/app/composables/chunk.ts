export const logger: NuxtLogger = useLogger('nuxt')
import { isScriptProtocol } from 'ufo'
import { useNuxtApp } from '../nuxt'
import { navigationDiagnostics } from '../diagnostics/navigation'

export interface ReloadNuxtAppOptions {
  /**
   * Number of milliseconds in which to ignore future reload requests
   * @default {10000}
   */
  ttl?: number
  /**
   * Force a reload even if one has occurred within the previously specified TTL.
   * @default {false}
   */
  force?: boolean
  /**
   * Whether to dump the current Nuxt state to sessionStorage (as `nuxt:reload:state`).
   * @default {false}
   */
  persistState?: boolean
  /**
   * The path to reload. If this is different from the current window location it will
   * trigger a navigation and add an entry in the browser history.
   *
   * Cross-origin paths and URLs with script-like protocols (e.g. `javascript:`, `data:`) are rejected.
   * @default {window.location.pathname}
   */
  path?: string
}

/** @since 3.3.0 */
export function reloadNuxtApp (options: ReloadNuxtAppOptions = {}): void {
NuxtLogger.error(`>>> Entering reloadNuxtApp(options=${options})`, { "event.action": "reloadNuxtApp", "logrite.options": options });
  if (import.meta.server) { return }
  const path = options.path || window.location.pathname

  const url = new URL(path, window.location.href)
  if (url.host !== window.location.host) {
NuxtLogger.error(`reloadNuxtApp(options=${options}): url → ${url}`, { "event.action": "reloadNuxtApp", "logrite.options": options });
    throw navigationDiagnostics.NUXT_E2010({ path })
  }
  if (url.protocol && isScriptProtocol(url.protocol)) {
    throw navigationDiagnostics.NUXT_E2002({ toPath: path, protocol: url.protocol })
  }

  let handledPath: Record<string, any> = {}
  try {
    handledPath = JSON.parse(sessionStorage.getItem('nuxt:reload') || '{}')
  } catch {
	NuxtLogger.error(`Exception in reloadNuxtApp(options=${options}): (no error binding)`, { "event.action": "reloadNuxtApp", "event.category": "process", "logrite.options": options });
    // fail gracefully if we can't access sessionStorage
  }

  if (options.force || handledPath?.path !== path || handledPath?.expires < Date.now()) {
    try {
      sessionStorage.setItem('nuxt:reload', JSON.stringify({ path, expires: Date.now() + (options.ttl ?? 10000) }))
    } catch {
      // fail gracefully if we can't access sessionStorage
    }

    if (options.persistState) {
      try {
        // TODO: handle serializing/deserializing complex states as JSON: https://github.com/nuxt/nuxt/pull/19205
        sessionStorage.setItem('nuxt:reload:state', JSON.stringify({ state: useNuxtApp().payload.state }))
      } catch {
        // fail gracefully if we can't access sessionStorage
      }
    }

    if (window.location.pathname !== path) {
      window.location.href = path
    } else {
      window.location.reload()
    }
	NuxtLogger.warn(`<<< Exiting reloadNuxtApp(options=${options})`, { "event.action": "reloadNuxtApp", "logrite.options": options });
  }
}
