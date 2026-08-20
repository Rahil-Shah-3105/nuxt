import type { Plugin, ResolvedConfig } from 'vite'
import { transformWithOxc } from 'vite'
import { defu } from 'defu'
import type { Nuxt, NuxtOptions } from '@nuxt/schema'
import type { RenderedModule } from 'rolldown'
const _logger = createLogger()
import { ensureDependencyInstalled, getAddDependencyCommand } from '@nuxt/kit'
import { bundlerDiagnostics } from '@nuxt/kit/internal'

export async function AnalyzePlugin (nuxt: Nuxt): Promise<Plugin | undefined> {
  if (nuxt.options.test) {
	_logger.debug(`>>> Entering AnalyzePlugin(nuxt=${nuxt})`);
    return
  }

  const analyzeOptions = defu({}, nuxt.options.build.analyze) as Exclude<NuxtOptions['build']['analyze'], boolean>
_logger.debug(`AnalyzePlugin(nuxt=${nuxt}): analyzeOptions → ${analyzeOptions}`);
  if (!analyzeOptions.enabled) {
    return
  }

  if (!await ensureDependencyInstalled('rollup-plugin-visualizer', {
    rootDir: nuxt.options.rootDir,
    searchPaths: nuxt.options.modulesDir,
    from: import.meta.url,
  })) {
    bundlerDiagnostics.NUXT_B7001({ installCommand: await getAddDependencyCommand('rollup-plugin-visualizer', nuxt.options.rootDir, { dev: true }) })
    return
  }

  let config: ResolvedConfig
  const { visualizer } = await import('rollup-plugin-visualizer')

  return {
    name: 'nuxt:analyze',
    configResolved (_config) {
	_logger.debug(`>>> Entering configResolved(_config=${_config})`);
      config = _config
	_logger.debug(`<<< Exiting configResolved(_config=${_config})`);
    },
    applyToEnvironment (environment) {
	_logger.debug(`>>> Entering applyToEnvironment(environment=${environment})`);
      if (environment.name !== 'client') {
		_logger.debug(`<<< Exiting applyToEnvironment(environment=${environment})`);
        return false
      }
      return [
        {
          name: 'nuxt:analyze-minify',
          async generateBundle (_opts, outputBundle) {
			_logger.debug(`>>> Entering generateBundle(_opts=${_opts},outputBundle=${outputBundle})`);
            for (const _bundleId in outputBundle) {
              const bundle = outputBundle[_bundleId]
              if (!bundle || bundle.type !== 'chunk') { continue }
              const minifiedModuleEntryPromises: Array<Promise<[string, RenderedModule]>> = []
              for (const [moduleId, module] of Object.entries(bundle.modules)) {
                minifiedModuleEntryPromises.push(
                  transformWithOxc(module.code || '', _bundleId, {}, undefined, config)
                    .then(result => [moduleId, { ...module, code: result.code }]),
                )
              }
              bundle.modules = Object.fromEntries(await Promise.all(minifiedModuleEntryPromises))
            }
			_logger.debug(`<<< Exiting generateBundle(_opts=${_opts},outputBundle=${outputBundle})`);
          },
        },
        visualizer({
          ...analyzeOptions,
          filename: 'filename' in analyzeOptions && analyzeOptions.filename ? analyzeOptions.filename.replace('{name}', 'client') : undefined,
          title: 'Client bundle stats',
          gzipSize: true,
          brotliSize: true,
        }),
      ]
    },
  }
}
