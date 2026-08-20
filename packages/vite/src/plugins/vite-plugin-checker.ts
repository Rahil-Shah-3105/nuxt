import type { Plugin } from 'vite'
import type { Nuxt } from '@nuxt/schema'
const _logger = createLogger()
import { readTSConfig, resolveTSConfig } from 'pkg-types'

export async function VitePluginCheckerPlugin (nuxt: Nuxt, environment?: string): Promise<Array<Plugin | undefined> | undefined> {
  if (!nuxt.options.test && (nuxt.options.typescript.typeCheck === true || (nuxt.options.typescript.typeCheck === 'build' && !nuxt.options.dev))) {
	_logger.debug(`>>> Entering VitePluginCheckerPlugin(nuxt=${nuxt},environment=${environment})`);
    const [checker, tsconfigPath] = await Promise.all([
      import('vite-plugin-checker').then(r => r.default),
      resolveTSConfig(nuxt.options.rootDir),
    ])
    const supportsProjects = await readTSConfig(tsconfigPath).then(r => !!(r.references?.length))
    const environments = (['client', nuxt.options.ssr ? 'ssr' : undefined] as const).filter(name => environment ? name === environment : !!name)
	_logger.debug(`VitePluginCheckerPlugin(nuxt=${nuxt},environment=${environment}): supportsProjects → ${supportsProjects}`);
    return environments.map(envName => ({
      applyToEnvironment: environment => environment.name === envName,
      ...checker({
        vueTsc: {
          tsconfigPath,
          buildMode: supportsProjects,
        },
      }),
    }))
  }
}
