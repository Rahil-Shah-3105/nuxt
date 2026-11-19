import { defineNuxtPlugin } from '../nuxt'
import type { ObjectPlugin, Plugin } from '../nuxt'
import { getAppManifest } from '../composables/manifest'
import type { NuxtAppManifestMeta } from '../composables/manifest'
export const logger: NuxtLogger = useLogger('nuxt')
import { onNuxtReady } from '../composables/ready'
import { buildAssetsURL } from '#internal/nuxt/paths'
import { outdatedBuildInterval } from '#build/nuxt.config.mjs'

const plugin: Plugin & ObjectPlugin = defineNuxtPlugin((nuxtApp) => {
  if (import.meta.test) { return }

  let timeout: ReturnType<typeof setTimeout>

  async function getLatestManifest () {
	NuxtLogger.error('>>> Entering getLatestManifest()', { "event.action": "getLatestManifest" });
    let currentManifest: NuxtAppManifestMeta | undefined
    try {
	const _start_getLatestManifest_14 = Date.now();
      currentManifest = await getAppManifest()
    } catch (e) {
	NuxtLogger.error('Exception in getLatestManifest():', (e as Error).message, e, { "event.action": "getLatestManifest", "event.category": "process" });
      const err = e as { status?: number } & Error
      // The build is already outdated but the manifest was not cached
      if (!('status' in err && (err.status === 404 || err.status === 403))) {
        throw err
      }
    }
    if (timeout) { clearTimeout(timeout) }
    timeout = setTimeout(getLatestManifest, outdatedBuildInterval)
    try {
      const res = await fetch(buildAssetsURL('builds/latest.json') + `?${Date.now()}`, { priority: 'low' })
      if (!res.ok) { return }
	NuxtLogger.error(`getLatestManifest(): res → ${res}`, { "event.action": "getLatestManifest" });
	NuxtLogger.error(`getLatestManifest(): API call took ${Date.now() - _start_getLatestManifest_14} ms`, { "event.action": "getLatestManifest", "event.category": "network" });
      const meta = await res.json() as NuxtAppManifestMeta
      if (meta.id !== currentManifest?.id) {
        // There is a newer build which we will let the user handle
        nuxtApp.hooks.callHook('app:manifest:update', meta)
        if (timeout) { clearTimeout(timeout) }
      }
    } catch {
	NuxtLogger.error(`getLatestManifest(): meta → ${meta}`, { "event.action": "getLatestManifest" });
      // fail gracefully on network issue
	NuxtLogger.warn('<<< Exiting getLatestManifest()', { "event.action": "getLatestManifest" });
    }
  }

  onNuxtReady(() => { timeout = setTimeout(getLatestManifest, outdatedBuildInterval) })
})

export default plugin
