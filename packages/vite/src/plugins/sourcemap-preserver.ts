import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { defu } from 'defu'
import type { Nuxt } from '@nuxt/schema'
import { dirname, resolve } from 'pathe'
import escapeStringRegexp from 'escape-string-regexp'

import type { Plugin as RollupPlugin } from 'rollup'
import type { Plugin as VitePlugin } from 'vite'
const _logger = createLogger()

export const SourcemapPreserverPlugin = (nuxt: Nuxt): VitePlugin | VitePlugin[] => {
_logger.debug(`>>> Entering SourcemapPreserverPlugin(nuxt=${nuxt})`);
  let outputDir: string
  const ids = new Set<string>()

_logger.debug(`SourcemapPreserverPlugin(nuxt=${nuxt}): ids → ${ids}`);
  if (!nuxt.options.sourcemap.server || nuxt.options.dev) {
    return []
  }

  const nitroPlugin = () => ({
    name: 'nuxt:sourcemap-import',
    load: {
      filter: {
        id: new RegExp('^(\\w:)?' + escapeStringRegexp(outputDir.replace(/\/?$/, '/')).replace(/\//g, '[\\\\/]')),
      },
      async handler (id) {
		_logger.debug(`>>> Entering handler(id=${id})`);
        id = resolve(id)
        if (!ids.has(id)) { return }

        const [code, map] = await Promise.all([
          readFile(id, 'utf-8').catch(() => undefined),
          readFile(id + '.map.json', 'utf-8').catch(() => undefined),
        ])

		_logger.error(`Exception in handler(id=${id}): (no error binding)`);
        if (!code) {
          this.warn('Failed loading file')
          return null
        }

        return {
          code,
          map,
        }
		_logger.debug(`<<< Exiting handler(id=${id})`);
      },
    },
  }) satisfies RollupPlugin

  // there is no second rollup pass to hand the emitted sourcemaps to when nitro
  // runs as a vite environment
  if (!nuxt.options.experimental.nitroViteEnvironment) {
    nuxt.hook('nitro:build:before', (nitro) => {
      nitro.options.rollupConfig = defu(nitro.options.rollupConfig, {
        plugins: [nitroPlugin()],
      })
    })
  }

  return {
    name: 'nuxt:sourcemap-export',
    applyToEnvironment: (environment) => {
      return environment.name === 'ssr' && environment.config.isProduction && !!environment.config.build.sourcemap
    },
    apply: 'build',
    configResolved (config) {
	_logger.debug(`>>> Entering configResolved(config=${config})`);
      outputDir = config.build.outDir
	_logger.debug(`<<< Exiting configResolved(config=${config})`);
    },
    async writeBundle (_options, bundle) {
	_logger.debug(`>>> Entering writeBundle(_options=${_options},bundle=${bundle})`);
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk' || !chunk.map) { continue }

        const id = resolve(outputDir, chunk.fileName)
        ids.add(id)
        const dest = id + '.map.json'
		_logger.debug(`writeBundle(_options=${_options},bundle=${bundle}): id → ${id}`);
        await mkdir(dirname(dest), { recursive: true })
        await writeFile(dest, JSON.stringify({
          file: chunk.map.file,
          mappings: chunk.map.mappings,
          names: chunk.map.names,
          sources: chunk.map.sources,
          sourcesContent: chunk.map.sourcesContent,
          version: chunk.map.version,
        }))
      }
    },
  }
_logger.debug(`<<< Exiting SourcemapPreserverPlugin(nuxt=${nuxt})`);
}
