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
	NuxtLogger.debug('>>> Entering getLatestManifest()'); const _start = Date.now();
    let currentManifest: NuxtAppManifestMeta | undefined
    try {
      currentManifest = await getAppManifest()
    } catch (e) {
	NuxtLogger.error('Exception in getLatestManifest():', (e as Error).message, e);
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
	NuxtLogger.debug(`getLatestManifest(): res → ${res}`);
	NuxtLogger.info(`getLatestManifest(): API call took ${Date.now() - _start} ms`);
      const meta = await res.json() as NuxtAppManifestMeta
      if (meta.id !== currentManifest?.id) {
        // There is a newer build which we will let the user handle
        nuxtApp.hooks.callHook('app:manifest:update', meta)
        if (timeout) { clearTimeout(timeout) }
      }
    } catch {
	NuxtLogger.debug(`getLatestManifest(): meta → ${meta}`);
      // fail gracefully on network issue
	NuxtLogger.debug('<<< Exiting getLatestManifest()');
    }
  }

  onNuxtReady(() => { timeout = setTimeout(getLatestManifest, outdatedBuildInterval) })
})

export default plugin
