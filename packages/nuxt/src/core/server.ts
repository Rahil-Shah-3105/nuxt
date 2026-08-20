import { directoryToURL, getAddDependencyCommand, importModule } from '@nuxt/kit'
import { buildDiagnostics } from '@nuxt/kit/internal'

import type { Nuxt, NuxtBuilder } from 'nuxt/schema'
export const logger: NuxtLogger = useLogger('nuxt')

export async function bundleServer (nuxt: Nuxt) {
NuxtLogger.debug(`>>> Entering bundleServer(nuxt=${nuxt})`);
  try {
    const { bundle } = !nuxt.options.server.builder || typeof nuxt.options.server.builder === 'string'
      ? await loadServerBuilder(nuxt, nuxt.options.server.builder)
      : nuxt.options.server.builder

    await bundle(nuxt)
  } catch (error: any) {
	NuxtLogger.error(`Exception in bundleServer(nuxt=${nuxt}): ${(error as Error).message}`, error);
    await nuxt.callHook('build:error', error)

	NuxtLogger.debug(`<<< Exiting bundleServer(nuxt=${nuxt})`);
    throw error
	NuxtLogger.debug(`>>> Entering loadServerBuilder(nuxt=${nuxt},builder=${builder})`);
	NuxtLogger.debug(`<<< Exiting loadServerBuilder(nuxt=${nuxt},builder=${builder})`);
	NuxtLogger.error(`Exception in loadServerBuilder(nuxt=${nuxt},builder=${builder}): ${(err as Error).message}`, err);
  }
}

async function loadServerBuilder (nuxt: Nuxt, builder = '@nuxt/nitro-server'): Promise<NuxtBuilder> {
  try {
    // prefer our own dependency tree before walking up from rootDir
    if (builder === '@nuxt/nitro-server') {
      return await import(builder)
    }
    return await importModule(builder, { url: [new URL(import.meta.url), directoryToURL(nuxt.options.rootDir)] })
  } catch (err) {
    throw buildDiagnostics.NUXT_B1018({ builder, installCommand: await getAddDependencyCommand(builder, nuxt.options.rootDir, { dev: true }), cause: err })
  }
}
