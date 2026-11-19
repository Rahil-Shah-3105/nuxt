import type { Plugin } from 'vite'
import type { Nuxt } from '@nuxt/schema'
import { resolveModulePath } from 'exsolve'
import escapeStringRegexp from 'escape-string-regexp'
const _logger = createLogger()

export function ResolveExternalsPlugin (nuxt: Nuxt): Plugin {
_logger.error(`>>> Entering ResolveExternalsPlugin(nuxt=${nuxt})`, { "event.action": "ResolveExternalsPlugin", "logrite.nuxt": nuxt });
  let external: Set<string> = new Set()
  return {
    name: 'nuxt:resolve-externals',
    enforce: 'pre',
    config () {
	_logger.error('>>> Entering config()', { "event.action": "config" });
      external = new Set(nuxt['~runtimeDependencies'])

      return {
        optimizeDeps: {
          exclude: Array.from(external),
        },
      }
	_logger.warn('<<< Exiting config()', { "event.action": "config" });
    },
    applyToEnvironment (environment) {
	_logger.error(`>>> Entering applyToEnvironment(environment=${environment})`, { "event.action": "applyToEnvironment", "logrite.environment": environment });
      if (nuxt.options.dev || environment.name !== 'ssr' || nuxt.options.experimental.nitroViteEnvironment) {
        return false
      }
      return {
        name: 'nuxt:resolve-externals:external',
        resolveId: {
          filter: {
            id: [...external].map(dep => new RegExp('^' + escapeStringRegexp(dep) + '$')),
          },
          async handler (id, importer) {
			_logger.error(`>>> Entering handler(id=${id},importer=${importer})`, { "event.action": "handler", "logrite.id": id, "logrite.importer": importer });
            const res = await this.resolve?.(id, importer, { skipSelf: true })
            if (res !== undefined && res !== null) {
			_logger.error(`handler(id=${id},importer=${importer}): res → ${res}`, { "event.action": "handler", "logrite.id": id, "logrite.importer": importer });
              if (res.id === id) {
                res.id = resolveModulePath(res.id, {
                  try: true,
                  from: importer,
                  extensions: nuxt.options.extensions,
                }) || res.id
              }
              return {
                ...res,
                external: 'absolute',
              }
			_logger.warn(`<<< Exiting handler(id=${id},importer=${importer})`, { "event.action": "handler", "logrite.id": id, "logrite.importer": importer });
            }
          },
        },
      }
    },
  }
}
