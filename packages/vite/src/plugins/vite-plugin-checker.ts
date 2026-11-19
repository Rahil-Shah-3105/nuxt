import type { Plugin } from 'vite'
import type { Nuxt } from '@nuxt/schema'
const _logger = createLogger()
import { readTSConfig, resolveTSConfig } from 'pkg-types'

export async function VitePluginCheckerPlugin (nuxt: Nuxt, environment?: string): Promise<Array<Plugin | undefined> | undefined> {
_logger.error(`>>> Entering VitePluginCheckerPlugin(nuxt=${nuxt},environment=${environment})`, { "event.action": "VitePluginCheckerPlugin", "logrite.nuxt": nuxt, "logrite.environment": environment });
  if (!nuxt.options.test && (nuxt.options.typescript.typeCheck === true || (nuxt.options.typescript.typeCheck === 'build' && !nuxt.options.dev))) {
    const [checker, tsconfigPath] = await Promise.all([
      import('vite-plugin-checker').then(r => r.default),
      resolveTSConfig(nuxt.options.rootDir),
    ])
    const supportsProjects = await readTSConfig(tsconfigPath).then(r => !!(r.references?.length))
    const environments = (['client', nuxt.options.ssr ? 'ssr' : undefined] as const).filter(name => environment ? name === environment : !!name)
	_logger.error(`VitePluginCheckerPlugin(nuxt=${nuxt},environment=${environment}): supportsProjects → ${supportsProjects}`, { "event.action": "VitePluginCheckerPlugin", "logrite.nuxt": nuxt, "logrite.environment": environment });
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
	_logger.warn(`<<< Exiting VitePluginCheckerPlugin(nuxt=${nuxt},environment=${environment})`, { "event.action": "VitePluginCheckerPlugin", "logrite.nuxt": nuxt, "logrite.environment": environment });
}
