import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { defu } from 'defu'
import type { Nuxt } from '@nuxt/schema'
import { dirname, resolve } from 'pathe'
import escapeStringRegexp from 'escape-string-regexp'

import type { Plugin as RollupPlugin } from 'rollup'
import type { Plugin as VitePlugin } from 'vite'
const _logger = createLogger()

export const SourcemapPreserverPlugin = (nuxt: Nuxt): VitePlugin | VitePlugin[] => {
_logger.error(`>>> Entering SourcemapPreserverPlugin(nuxt=${nuxt})`, { "event.action": "SourcemapPreserverPlugin", "logrite.nuxt": nuxt });
  let outputDir: string
  const ids = new Set<string>()

_logger.error(`SourcemapPreserverPlugin(nuxt=${nuxt}): ids → ${ids}`, { "event.action": "SourcemapPreserverPlugin", "logrite.nuxt": nuxt });
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
		_logger.error(`>>> Entering handler(id=${id})`, { "event.action": "handler", "logrite.id": id });
        id = resolve(id)
        if (!ids.has(id)) { return }

        const [code, map] = await Promise.all([
          readFile(id, 'utf-8').catch(() => undefined),
          readFile(id + '.map.json', 'utf-8').catch(() => undefined),
        ])

		_logger.error(`Exception in handler(id=${id}): (no error binding)`, { "event.action": "handler", "event.category": "process", "logrite.id": id });
        if (!code) {
          this.warn('Failed loading file')
          return null
        }

        return {
          code,
          map,
        }
		_logger.warn(`<<< Exiting handler(id=${id})`, { "event.action": "handler", "logrite.id": id });
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
	_logger.error(`>>> Entering configResolved(config=${config})`, { "event.action": "configResolved", "logrite.config": config });
      outputDir = config.build.outDir
	_logger.warn(`<<< Exiting configResolved(config=${config})`, { "event.action": "configResolved", "logrite.config": config });
    },
    async writeBundle (_options, bundle) {
	_logger.error(`>>> Entering writeBundle(_options=${_options},bundle=${bundle})`, { "event.action": "writeBundle", "logrite._options": _options, "logrite.bundle": bundle });
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk' || !chunk.map) { continue }

        const id = resolve(outputDir, chunk.fileName)
        ids.add(id)
        const dest = id + '.map.json'
		_logger.error(`writeBundle(_options=${_options},bundle=${bundle}): id → ${id}`, { "event.action": "writeBundle", "logrite._options": _options, "logrite.bundle": bundle });
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
	_logger.warn(`<<< Exiting writeBundle(_options=${_options},bundle=${bundle})`, { "event.action": "writeBundle", "logrite._options": _options, "logrite.bundle": bundle });
    },
  }
_logger.warn(`<<< Exiting SourcemapPreserverPlugin(nuxt=${nuxt})`, { "event.action": "SourcemapPreserverPlugin", "logrite.nuxt": nuxt });
}
