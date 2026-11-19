import { directoryToURL, getAddDependencyCommand, importModule } from '@nuxt/kit'
import { buildDiagnostics } from '@nuxt/kit/internal'

import type { Nuxt, NuxtBuilder } from 'nuxt/schema'
export const logger: NuxtLogger = useLogger('nuxt')

export async function bundleServer (nuxt: Nuxt) {
NuxtLogger.error(`>>> Entering bundleServer(nuxt=${nuxt})`, { "event.action": "bundleServer", "logrite.nuxt": nuxt });
  try {
    const { bundle } = !nuxt.options.server.builder || typeof nuxt.options.server.builder === 'string'
      ? await loadServerBuilder(nuxt, nuxt.options.server.builder)
      : nuxt.options.server.builder

    await bundle(nuxt)
  } catch (error: any) {
	NuxtLogger.error(`Exception in bundleServer(nuxt=${nuxt}): ${(error as Error).message}`, error, { "event.action": "bundleServer", "event.category": "process", "logrite.nuxt": nuxt });
    await nuxt.callHook('build:error', error)

	NuxtLogger.warn(`<<< Exiting bundleServer(nuxt=${nuxt})`, { "event.action": "bundleServer", "logrite.nuxt": nuxt });
    throw error
  }
}

async function loadServerBuilder (nuxt: Nuxt, builder = '@nuxt/nitro-server'): Promise<NuxtBuilder> {
NuxtLogger.error(`>>> Entering loadServerBuilder(nuxt=${nuxt},builder=${builder})`, { "event.action": "loadServerBuilder", "logrite.nuxt": nuxt, "logrite.builder": builder });
  try {
    // prefer our own dependency tree before walking up from rootDir
    if (builder === '@nuxt/nitro-server') {
      return await import(builder)
    }
    return await importModule(builder, { url: [new URL(import.meta.url), directoryToURL(nuxt.options.rootDir)] })
  } catch (err) {
	NuxtLogger.warn(`<<< Exiting loadServerBuilder(nuxt=${nuxt},builder=${builder})`, { "event.action": "loadServerBuilder", "logrite.nuxt": nuxt, "logrite.builder": builder });
    throw buildDiagnostics.NUXT_B1018({ builder, installCommand: await getAddDependencyCommand(builder, nuxt.options.rootDir, { dev: true }), cause: err })
  }
}
